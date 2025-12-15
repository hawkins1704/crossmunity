import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Query: Busca redes por nombre (búsqueda parcial)
 * Retorna hasta 10 redes cuyo nombre contenga el término de búsqueda
 * Útil para el autocompletado en el campo de registro
 */
export const searchGridsByName = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm || args.searchTerm.length < 2) {
      return [];
    }

    // Obtener todas las redes y filtrar por nombre que contenga el término
    const allGrids = await ctx.db.query("grids").collect();
    
    const searchLower = args.searchTerm.toLowerCase();
    const matchingGrids = allGrids
      .filter((grid) => {
        return grid.name.toLowerCase().includes(searchLower);
      })
      .slice(0, 10) // Limitar a 10 resultados
      .map((grid) => ({
        _id: grid._id,
        name: grid.name,
        pastorId: grid.pastorId,
      }));

    // Enriquecer con información del pastor
    const enrichedGrids = await Promise.all(
      matchingGrids.map(async (grid) => {
        const pastor = await ctx.db.get(grid.pastorId);
        return {
          _id: grid._id,
          name: grid.name,
          pastor: pastor
            ? {
                name: pastor.name,
                email: pastor.email,
              }
            : null,
        };
      })
    );

    return enrichedGrids;
  },
});

/**
 * Query: Obtiene la red (grid) del pastor actual
 * Retorna null si el usuario no es pastor o no tiene red creada
 */
export const getMyGrid = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "Pastor") {
      return null;
    }

    const grid = await ctx.db
      .query("grids")
      .withIndex("pastorId", (q) => q.eq("pastorId", userId))
      .first();

    if (!grid) {
      return null;
    }

    // Obtener información del pastor
    const pastor = await ctx.db.get(grid.pastorId);

    return {
      ...grid,
      pastor: pastor,
    };
  },
});

/**
 * Query: Obtiene todos los usuarios que pertenecen a la red del pastor actual
 * Útil para mostrar la lista de miembros de la red
 */
export const getGridMembers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "Pastor") {
      throw new Error("Solo los pastores pueden ver los miembros de su red");
    }

    const grid = await ctx.db
      .query("grids")
      .withIndex("pastorId", (q) => q.eq("pastorId", userId))
      .first();

    if (!grid) {
      return [];
    }

    const members = await ctx.db
      .query("users")
      .withIndex("gridId", (q) => q.eq("gridId", grid._id))
      .collect();

    return members;
  },
});

/**
 * Query: Obtiene estadísticas de la red del pastor actual
 * Incluye: total de miembros, miembros en escuela, grupos creados, distribución por género
 */
export const getGridStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "Pastor") {
      throw new Error("Solo los pastores pueden ver las estadísticas de su red");
    }

    const grid = await ctx.db
      .query("grids")
      .withIndex("pastorId", (q) => q.eq("pastorId", userId))
      .first();

    if (!grid) {
      return {
        totalMembers: 0,
        membersInSchool: 0,
        totalGroups: 0,
        maleCount: 0,
        femaleCount: 0,
      };
    }

    // Obtener todos los miembros de la red
    const members = await ctx.db
      .query("users")
      .withIndex("gridId", (q) => q.eq("gridId", grid._id))
      .collect();

    // Calcular estadísticas
    const totalMembers = members.length;
    const membersInSchool = members.filter(
      (member) => member.isActiveInSchool
    ).length;
    const maleCount = members.filter((member) => member.gender === "Male").length;
    const femaleCount = members.filter(
      (member) => member.gender === "Female"
    ).length;

    // Contar grupos creados por miembros de la red
    // Un grupo pertenece a la red si al menos uno de sus líderes pertenece a la red
    const allGroups = await ctx.db.query("groups").collect();
    const memberIds = new Set(members.map((m) => m._id));
    const groupsInGrid = allGroups.filter((group) =>
      group.leaders.some((leaderId) => memberIds.has(leaderId))
    );
    const totalGroups = groupsInGrid.length;

    return {
      totalMembers,
      membersInSchool,
      totalGroups,
      maleCount,
      femaleCount,
    };
  },
});

/**
 * Mutation: Crea una nueva red (grid) para el pastor actual
 * Valida que el pastor no tenga ya una red creada
 */
export const createGrid = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    if (user.role !== "Pastor") {
      throw new Error("Solo los pastores pueden crear redes");
    }

    // Verificar que el pastor no tenga ya una red
    const existingGrid = await ctx.db
      .query("grids")
      .withIndex("pastorId", (q) => q.eq("pastorId", userId))
      .first();

    if (existingGrid) {
      throw new Error("Ya tienes una red creada. Un pastor solo puede tener una red.");
    }

    const now = Date.now();

    const gridId = await ctx.db.insert("grids", {
      name: args.name,
      pastorId: userId,
      createdAt: now,
      updatedAt: now,
    });

    return gridId;
  },
});

/**
 * Mutation: Agrega un usuario a la red del pastor actual
 * El usuario debe existir y no pertenecer a otra red
 */
export const addMemberToGrid = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const pastor = await ctx.db.get(userId);
    if (!pastor || pastor.role !== "Pastor") {
      throw new Error("Solo los pastores pueden agregar miembros a su red");
    }

    const grid = await ctx.db
      .query("grids")
      .withIndex("pastorId", (q) => q.eq("pastorId", userId))
      .first();

    if (!grid) {
      throw new Error("Primero debes crear una red");
    }

    // Buscar el usuario por email
    const member = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.userEmail))
      .first();

    if (!member) {
      throw new Error("Usuario no encontrado con ese email");
    }

    // Verificar que el usuario no pertenezca ya a otra red
    if (member.gridId && member.gridId !== grid._id) {
      throw new Error("El usuario ya pertenece a otra red");
    }

    // Si ya pertenece a esta red, no hacer nada
    if (member.gridId === grid._id) {
      return { success: true, message: "El usuario ya pertenece a esta red" };
    }

    // Agregar el usuario a la red
    await ctx.db.patch(member._id, {
      gridId: grid._id,
    });

    return { success: true };
  },
});

/**
 * Mutation: Remueve un usuario de la red del pastor actual
 */
export const removeMemberFromGrid = mutation({
  args: {
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const pastor = await ctx.db.get(userId);
    if (!pastor || pastor.role !== "Pastor") {
      throw new Error("Solo los pastores pueden remover miembros de su red");
    }

    const grid = await ctx.db
      .query("grids")
      .withIndex("pastorId", (q) => q.eq("pastorId", userId))
      .first();

    if (!grid) {
      throw new Error("No tienes una red creada");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Usuario no encontrado");
    }

    if (member.gridId !== grid._id) {
      throw new Error("El usuario no pertenece a tu red");
    }

    // Remover el usuario de la red
    await ctx.db.patch(args.memberId, {
      gridId: undefined,
    });

    return { success: true };
  },
});

/**
 * Mutation: Actualiza el nombre de la red
 */
export const updateGrid = mutation({
  args: {
    gridId: v.id("grids"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const grid = await ctx.db.get(args.gridId);
    if (!grid) {
      throw new Error("Red no encontrada");
    }

    // Verificar que el usuario sea el pastor de la red
    if (grid.pastorId !== userId) {
      throw new Error("Solo el pastor puede actualizar la red");
    }

    await ctx.db.patch(args.gridId, {
      name: args.name,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

