import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

/**
 * Query: Obtiene todos los grupos donde el usuario actual es líder
 * Útil para mostrar en el dashboard los grupos que el usuario ha creado
 */
export const getGroupsAsLeader = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Buscar grupos donde el usuario es líder
    // Necesitamos buscar en el array de líderes
    const allGroups = await ctx.db.query("groups").collect();
    const groups = allGroups.filter((group) => group.leaders.includes(userId));

    // Enriquecer con información de líderes y discípulos
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        const leaders = await Promise.all(
          group.leaders.map((leaderId) => ctx.db.get(leaderId))
        );
        const disciples = await Promise.all(
          group.disciples.map((discipleId) => ctx.db.get(discipleId))
        );

        return {
          ...group,
          leaders: leaders.filter(Boolean),
          disciples: disciples.filter(Boolean),
        };
      })
    );

    return enrichedGroups;
  },
});

/**
 * Query: Obtiene el grupo donde el usuario actual es discípulo
 * Útil para mostrar en el dashboard el grupo al que pertenece el usuario
 */
export const getGroupAsDisciple = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.leader) {
      return null; // El usuario no tiene líder asignado
    }

    // Buscar el grupo donde el usuario es discípulo
    // Buscar grupos donde el líder del usuario es líder del grupo
    const allGroups = await ctx.db.query("groups").collect();
    const groups = allGroups.filter((group) =>
      group.leaders.includes(user.leader!)
    );

    // Encontrar el grupo donde el usuario está en la lista de discípulos
    for (const group of groups) {
      if (group.disciples.includes(userId)) {
        // Enriquecer con información de líderes y discípulos
        const leaders = await Promise.all(
          group.leaders.map((leaderId) => ctx.db.get(leaderId))
        );
        const disciples = await Promise.all(
          group.disciples.map((discipleId) => ctx.db.get(discipleId))
        );

        return {
          ...group,
          leaders: leaders.filter(Boolean),
          disciples: disciples.filter(Boolean),
        };
      }
    }

    return null;
  },
});

/**
 * Query: Busca un grupo por su código de invitación
 * Útil cuando un usuario quiere unirse a un grupo usando el código
 */
export const getGroupByInvitationCode = query({
  args: { invitationCode: v.string() },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("groups")
      .withIndex("invitationCode", (q) =>
        q.eq("invitationCode", args.invitationCode)
      )
      .first();

    if (!group) {
      return null;
    }

    // Enriquecer con información de líderes
    const leaders = await Promise.all(
      group.leaders.map((leaderId) => ctx.db.get(leaderId))
    );

    return {
      ...group,
      leaders: leaders.filter(Boolean),
    };
  },
});

/**
 * Query: Obtiene un grupo por ID con información completa de discípulos y cursos
 * Útil para mostrar el detalle completo del grupo
 */
export const getGroupById = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    // Verificar que el usuario pertenece al grupo (líder o discípulo)
    const isLeader = group.leaders.includes(userId);
    const isDisciple = group.disciples.includes(userId);

    if (!isLeader && !isDisciple) {
      throw new Error("No tienes acceso a este grupo");
    }

    // Enriquecer con información de líderes
    const leaders = await Promise.all(
      group.leaders.map(async (leaderId) => {
        const leader = await ctx.db.get(leaderId);
        return leader;
      })
    );

    // Enriquecer con información de discípulos y sus cursos
    const disciples = await Promise.all(
      group.disciples.map(async (discipleId) => {
        const disciple = await ctx.db.get(discipleId);
        if (!disciple) return null;

        // Obtener cursos del discípulo
        const courses =
          disciple.currentCourses && disciple.currentCourses.length > 0
            ? (
                await Promise.all(
                  disciple.currentCourses.map((courseId) => ctx.db.get(courseId))
                )
              ).filter((course): course is NonNullable<typeof course> => course !== null)
            : [];

        return {
          ...disciple,
          courses,
        };
      })
    );

    return {
      ...group,
      leaders: leaders.filter(Boolean),
      disciples: disciples.filter(Boolean),
    };
  },
});

/**
 * Mutation: Crea un nuevo grupo de conexión
 * Valida que haya máximo 2 líderes y que sean de diferente género si hay 2
 * El usuario que crea el grupo se convierte automáticamente en líder
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    district: v.string(),
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    day: v.string(),
    time: v.string(),
    coLeaderId: v.optional(v.id("users")), // ID del co-líder opcional
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

    const leaders: Id<"users">[] = [userId];

    // Si se proporciona un ID de co-líder, validarlo y agregarlo
    if (args.coLeaderId) {
      // Verificar que no sea el mismo usuario
      if (args.coLeaderId === userId) {
        throw new Error("No puedes agregarte a ti mismo como co-líder");
      }

      const coLeader = await ctx.db.get(args.coLeaderId);

      if (!coLeader) {
        throw new Error("Co-líder no encontrado");
      }

      // Validar que el co-líder sea de diferente género
      if (coLeader.gender === user.gender) {
        throw new Error(
          "El co-líder debe ser de diferente género (uno hombre, una mujer)"
        );
      }

      leaders.push(coLeader._id);
    }

    // Validar máximo 2 líderes
    if (leaders.length > 2) {
      throw new Error("Un grupo solo puede tener máximo 2 líderes");
    }

    // Validar rango de edad
    if (args.minAge !== undefined && args.maxAge !== undefined) {
      if (args.minAge > args.maxAge) {
        throw new Error("La edad mínima no puede ser mayor que la edad máxima");
      }
      if (args.minAge < 0 || args.maxAge < 0) {
        throw new Error("Las edades deben ser números positivos");
      }
    }

    // Generar código de invitación único
    const invitationCode = generateInvitationCode();

    // Verificar que el código sea único
    const existingGroup = await ctx.db
      .query("groups")
      .withIndex("invitationCode", (q) =>
        q.eq("invitationCode", invitationCode)
      )
      .first();

    if (existingGroup) {
      // Si existe, generar otro (muy poco probable)
      throw new Error("Error al generar código único. Intenta nuevamente.");
    }

    const now = Date.now();

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      address: args.address,
      district: args.district,
      minAge: args.minAge,
      maxAge: args.maxAge,
      day: args.day,
      time: args.time,
      leaders,
      disciples: [],
      invitationCode,
      createdAt: now,
      updatedAt: now,
    });

    return groupId;
  },
});

/**
 * Mutation: Permite a un usuario unirse a un grupo usando el código de invitación
 * Asigna automáticamente el líder según el género del usuario:
 * - Si hay 1 líder: se asigna ese líder
 * - Si hay 2 líderes: se asigna el líder del mismo género
 */
export const joinGroup = mutation({
  args: {
    invitationCode: v.string(),
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

    // Verificar que el usuario no tenga ya un líder asignado
    if (user.leader) {
      throw new Error(
        "Ya perteneces a un grupo. Solo puedes pertenecer a un grupo a la vez."
      );
    }

    // Buscar el grupo por código de invitación
    const group = await ctx.db
      .query("groups")
      .withIndex("invitationCode", (q) =>
        q.eq("invitationCode", args.invitationCode)
      )
      .first();

    if (!group) {
      throw new Error("Código de invitación inválido");
    }

    // Verificar que el usuario no sea ya líder de este grupo
    if (group.leaders.includes(userId)) {
      throw new Error("Ya eres líder de este grupo");
    }

    // Verificar que el usuario no sea ya discípulo de este grupo
    if (group.disciples.includes(userId)) {
      throw new Error("Ya perteneces a este grupo");
    }

    // Determinar qué líder asignar según el género del usuario
    let assignedLeader: Id<"users"> | null = null;

    if (group.leaders.length === 1) {
      // Si hay solo 1 líder, asignarlo
      assignedLeader = group.leaders[0];
    } else if (group.leaders.length === 2) {
      // Si hay 2 líderes, asignar el del mismo género
      const leaders = await Promise.all(
        group.leaders.map((leaderId) => ctx.db.get(leaderId))
      );

      const sameGenderLeader = leaders.find(
        (leader) => leader?.gender === user.gender
      );

      if (!sameGenderLeader) {
        throw new Error(
          "No se pudo asignar un líder. Contacta al administrador."
        );
      }

      assignedLeader = sameGenderLeader._id;
    } else {
      throw new Error("El grupo no tiene líderes válidos");
    }

    // Actualizar el usuario con el líder asignado
    await ctx.db.patch(userId, {
      leader: assignedLeader,
    });

    // Agregar el usuario a la lista de discípulos del grupo
    await ctx.db.patch(group._id, {
      disciples: [...group.disciples, userId],
      updatedAt: Date.now(),
    });

    return { success: true, groupId: group._id, leaderId: assignedLeader };
  },
});

/**
 * Mutation: Actualiza la información de un grupo
 * Solo los líderes del grupo pueden actualizarlo
 */
export const updateGroup = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    // Verificar que el usuario sea líder del grupo
    if (!group.leaders.includes(userId)) {
      throw new Error("Solo los líderes pueden actualizar el grupo");
    }

    const updates: {
      name?: string;
      address?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.address !== undefined) {
      updates.address = args.address;
    }

    await ctx.db.patch(args.groupId, updates);

    return { success: true };
  },
});

/**
 * Función auxiliar: Genera un código de invitación único
 * Formato: 6 caracteres alfanuméricos en mayúsculas
 */
function generateInvitationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

