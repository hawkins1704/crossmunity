import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Query: Obtiene el perfil completo del usuario actual
 * Incluye información básica, líder asignado, cursos, y grupos
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Obtener información del líder si existe
    const leader = user.leader ? await ctx.db.get(user.leader) : null;

    // Obtener información de la red si existe
    const grid = user.gridId ? await ctx.db.get(user.gridId) : null;

    // Obtener información del servicio si existe
    const service = user.serviceId ? await ctx.db.get(user.serviceId) : null;

    // Obtener información de los cursos
    const courses =
      user.currentCourses && user.currentCourses.length > 0
        ? (
            await Promise.all(
              user.currentCourses.map((courseId) => ctx.db.get(courseId))
            )
          ).filter((course): course is NonNullable<typeof course> => course !== null)
        : [];

    return {
      ...user,
      leader,
      grid,
      service,
      courses,
    };
  },
});

/**
 * Query: Busca un usuario por su email (coincidencia exacta)
 * Útil para buscar usuarios al agregar co-líderes o miembros a la red
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return null;
    }

    // No retornar información sensible, solo lo necesario
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      gender: user.gender,
    };
  },
});

/**
 * Query: Busca usuarios por email (búsqueda parcial)
 * Retorna hasta 10 usuarios cuyo email contenga el término de búsqueda
 * Excluye automáticamente al usuario actual
 * Útil para el autocompletado en el campo de co-líder
 */
export const searchUsersByEmail = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchTerm || args.searchTerm.length < 2) {
      return [];
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener todos los usuarios y filtrar por email que contenga el término
    // Nota: En producción, esto podría optimizarse con un índice de texto completo
    const allUsers = await ctx.db.query("users").collect();
    
    const searchLower = args.searchTerm.toLowerCase();
    const matchingUsers = allUsers
      .filter((user) => {
        // Excluir al usuario actual
        if (user._id === userId) return false;
        if (!user.email) return false;
        return user.email.toLowerCase().includes(searchLower);
      })
      .slice(0, 10) // Limitar a 10 resultados
      .map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
      }));

    return matchingUsers;
  },
});

/**
 * Mutation: Actualiza el perfil del usuario actual
 * Permite actualizar nombre, género, y otros campos del perfil
 */
export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("Male"), v.literal("Female"))),
    phone: v.optional(v.string()),
    birthday: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const updates: {
      name?: string;
      gender?: "Male" | "Female";
      phone?: string;
      birthday?: number;
    } = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.gender !== undefined) {
      updates.gender = args.gender;
    }

    if (args.phone !== undefined) {
      updates.phone = args.phone;
    }

    if (args.birthday !== undefined) {
      updates.birthday = args.birthday;
    }

    await ctx.db.patch(userId, updates);

    return { success: true };
  },
});

/**
 * Mutation: Completa el perfil inicial del usuario
 * Se llama cuando un usuario crea su perfil por primera vez
 * Establece los campos requeridos: role, gender, isActiveInSchool
 */
export const completeProfile = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("Pastor"), v.literal("Member")),
    gender: v.union(v.literal("Male"), v.literal("Female")),
    phone: v.optional(v.string()),
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

    // Verificar que el perfil no esté ya completo
    if (user.role && user.gender) {
      throw new Error("El perfil ya está completo");
    }

    await ctx.db.patch(userId, {
      name: args.name,
      role: args.role,
      gender: args.gender,
      phone: args.phone,
      isActiveInSchool: false, // Por defecto no está en escuela
      currentCourses: [], // Por defecto sin cursos
    });

    return { success: true };
  },
});

/**
 * Query: Obtiene todos los discípulos de un líder específico
 * Útil para que los líderes vean quiénes son sus discípulos
 */
export const getDisciplesByLeader = query({
  args: { leaderId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario sea el líder o tenga permisos
    const leader = await ctx.db.get(args.leaderId);
    if (!leader) {
      throw new Error("Líder no encontrado");
    }

    // Solo el líder puede ver sus discípulos
    if (args.leaderId !== userId) {
      throw new Error("Solo puedes ver tus propios discípulos");
    }

    const disciples = await ctx.db
      .query("users")
      .withIndex("leader", (q) => q.eq("leader", args.leaderId))
      .collect();

    return disciples;
  },
});

/**
 * Query: Obtiene el dashboard completo del usuario actual
 * Incluye: perfil, grupo como discípulo, grupos como líder, y estadísticas básicas
 */
export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Obtener grupo como discípulo
    let groupAsDisciple: Omit<Doc<"groups">, "leaders" | "disciples"> & {
      leaders: Doc<"users">[];
      disciples: Doc<"users">[];
    } | null = null;
    if (user.leader) {
      // Buscar grupos donde el líder del usuario es líder del grupo
      const allGroups = await ctx.db.query("groups").collect();
      const groups = allGroups.filter((group) =>
        group.leaders.includes(user.leader!)
      );

      for (const group of groups) {
        if (group.disciples.includes(userId)) {
          const leaders = await Promise.all(
            group.leaders.map((leaderId) => ctx.db.get(leaderId))
          );
          const disciples = await Promise.all(
            group.disciples.map((discipleId) => ctx.db.get(discipleId))
          );

          groupAsDisciple = {
            ...group,
            leaders: leaders.filter(
              (l): l is NonNullable<typeof l> => l !== null
            ),
            disciples: disciples.filter(
              (d): d is NonNullable<typeof d> => d !== null
            ),
          };
          break;
        }
      }
    }

    // Obtener grupos como líder
    const allGroups = await ctx.db.query("groups").collect();
    const groupsAsLeader = allGroups.filter((group) =>
      group.leaders.includes(userId)
    );

    const enrichedGroupsAsLeader = await Promise.all(
      groupsAsLeader.map(async (group) => {
        const leaders = await Promise.all(
          group.leaders.map((leaderId) => ctx.db.get(leaderId))
        );
        const disciples = await Promise.all(
          group.disciples.map((discipleId) => ctx.db.get(discipleId))
        );

        return {
          ...group,
          leaders: leaders.filter(
            (l): l is NonNullable<typeof l> => l !== null
          ),
          disciples: disciples.filter(
            (d): d is NonNullable<typeof d> => d !== null
          ),
        };
      })
    );

    // Obtener cursos
    const courses =
      user.currentCourses && user.currentCourses.length > 0
        ? (
            await Promise.all(
              user.currentCourses.map((courseId) => ctx.db.get(courseId))
            )
          ).filter((course): course is NonNullable<typeof course> => course !== null)
        : [];

    // Obtener información de la red si es pastor
    const grid =
      user.role === "Pastor"
        ? await ctx.db
            .query("grids")
            .withIndex("pastorId", (q) => q.eq("pastorId", userId))
            .first()
        : null;

    return {
      user,
      groupAsDisciple,
      groupsAsLeader: enrichedGroupsAsLeader,
      courses,
      grid,
    };
  },
});

