import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

/**
 * Query: Obtiene todas las actividades de un grupo
 */
export const getActivitiesByGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario pertenece al grupo (como líder o discípulo)
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    const isLeader = group.leaders.includes(userId);
    const isDisciple = group.disciples.includes(userId);

    if (!isLeader && !isDisciple) {
      throw new Error("No tienes acceso a este grupo");
    }

    // Obtener actividades ordenadas por fecha (más recientes primero)
    const activities = await ctx.db
      .query("activities")
      .withIndex("groupId", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .collect();

    // Enriquecer con información del creador
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const creator = await ctx.db.get(activity.createdBy);
        return {
          ...activity,
          creator: creator
            ? {
                _id: creator._id,
                name: creator.name,
                email: creator.email,
              }
            : null,
        };
      })
    );

    return enrichedActivities;
  },
});

/**
 * Query: Obtiene una actividad específica con sus respuestas
 */
export const getActivityWithResponses = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("Actividad no encontrada");
    }

    // Verificar que el usuario pertenece al grupo
    const group = await ctx.db.get(activity.groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    const isLeader = group.leaders.includes(userId);
    const isDisciple = group.disciples.includes(userId);

    if (!isLeader && !isDisciple) {
      throw new Error("No tienes acceso a esta actividad");
    }

    // Obtener todas las respuestas de la actividad
    const responses = await ctx.db
      .query("activityResponses")
      .withIndex("activityId", (q) => q.eq("activityId", args.activityId))
      .collect();

    // Enriquecer respuestas con información de usuarios
    const enrichedResponses = await Promise.all(
      responses.map(async (response) => {
        const user = await ctx.db.get(response.userId);
        return {
          ...response,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                email: user.email,
              }
            : null,
        };
      })
    );

    // Obtener información del creador
    const creator = await ctx.db.get(activity.createdBy);

    // Obtener información del grupo
    const groupInfo = {
      _id: group._id,
      name: group.name,
      leaders: await Promise.all(
        group.leaders.map(async (leaderId) => {
          const leader = await ctx.db.get(leaderId);
          return leader
            ? {
                _id: leader._id,
                name: leader.name,
                email: leader.email,
              }
            : null;
        })
      ),
      disciples: await Promise.all(
        group.disciples.map(async (discipleId) => {
          const disciple = await ctx.db.get(discipleId);
          return disciple
            ? {
                _id: disciple._id,
                name: disciple.name,
                email: disciple.email,
              }
            : null;
        })
      ),
    };

    // Separar respuestas por estado
    const confirmed = enrichedResponses.filter((r) => r.status === "confirmed");
    const pending = enrichedResponses.filter((r) => r.status === "pending");
    const denied = enrichedResponses.filter((r) => r.status === "denied");

    // Para miembros que no han respondido, agregarlos a pendientes (todos pueden ver esto)
    const allGroupMembers = [...group.leaders, ...group.disciples];
    const respondedUserIds = new Set(responses.map((r) => r.userId));
    const pendingMembers = allGroupMembers.filter(
      (memberId) => !respondedUserIds.has(memberId)
    );

    const pendingMembersInfo = await Promise.all(
      pendingMembers.map(async (memberId) => {
        const member = await ctx.db.get(memberId);
        return member
          ? {
              _id: member._id,
              name: member.name,
              email: member.email,
            }
          : null;
      })
    );

    pending.push(
      ...pendingMembersInfo
        .filter(Boolean)
        .map((user) => ({
          _id: "" as Id<"activityResponses">,
          activityId: args.activityId,
          userId: user!._id,
          status: "pending" as const,
          respondedAt: 0,
          user,
        }))
    );

    return {
      activity: {
        ...activity,
        creator: creator
          ? {
              _id: creator._id,
              name: creator.name,
              email: creator.email,
            }
          : null,
      },
      group: groupInfo,
      responses: {
        confirmed,
        pending,
        denied,
      },
      userResponse: enrichedResponses.find((r) => r.userId === userId) || null,
    };
  },
});

/**
 * Query: Obtiene la respuesta del usuario actual a una actividad
 */
export const getMyActivityResponse = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const response = await ctx.db
      .query("activityResponses")
      .withIndex("activityId_userId", (q) =>
        q.eq("activityId", args.activityId).eq("userId", userId)
      )
      .first();

    return response || null;
  },
});

/**
 * Mutation: Crea una nueva actividad
 */
export const createActivity = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.string(),
    address: v.string(),
    dateTime: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Validar que el usuario es líder del grupo
    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    if (!group.leaders.includes(userId)) {
      throw new Error("Solo los líderes pueden crear actividades");
    }

    // Validaciones
    if (!args.name || args.name.trim().length < 2) {
      throw new Error("El nombre debe tener al menos 2 caracteres");
    }

    if (!args.address || args.address.trim().length < 5) {
      throw new Error("Ingresa una dirección válida");
    }

    if (args.dateTime < Date.now()) {
      throw new Error("La fecha y hora deben ser futuras");
    }

    if (!args.description || args.description.trim().length < 10) {
      throw new Error("La descripción debe tener al menos 10 caracteres");
    }

    const now = Date.now();

    // Crear la actividad
    const activityId = await ctx.db.insert("activities", {
      groupId: args.groupId,
      name: args.name.trim(),
      address: args.address.trim(),
      dateTime: args.dateTime,
      description: args.description,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return activityId;
  },
});

/**
 * Mutation: Responde a una actividad (confirmar, denegar o pendiente)
 */
export const respondToActivity = mutation({
  args: {
    activityId: v.id("activities"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("pending"),
      v.literal("denied")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que la actividad existe
    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("Actividad no encontrada");
    }

    // Verificar que el usuario pertenece al grupo
    const group = await ctx.db.get(activity.groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }

    const isLeader = group.leaders.includes(userId);
    const isDisciple = group.disciples.includes(userId);

    if (!isLeader && !isDisciple) {
      throw new Error("No puedes responder a esta actividad");
    }

    // Buscar si ya existe una respuesta
    const existingResponse = await ctx.db
      .query("activityResponses")
      .withIndex("activityId_userId", (q) =>
        q.eq("activityId", args.activityId).eq("userId", userId)
      )
      .first();

    const now = Date.now();

    if (existingResponse) {
      // Actualizar respuesta existente
      await ctx.db.patch(existingResponse._id, {
        status: args.status,
        respondedAt: now,
      });
      return existingResponse._id;
    } else {
      // Crear nueva respuesta
      const responseId = await ctx.db.insert("activityResponses", {
        activityId: args.activityId,
        userId,
        status: args.status,
        respondedAt: now,
      });
      return responseId;
    }
  },
});

/**
 * Mutation: Actualiza una actividad (solo el creador)
 */
export const updateActivity = mutation({
  args: {
    activityId: v.id("activities"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    dateTime: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("Actividad no encontrada");
    }

    if (activity.createdBy !== userId) {
      throw new Error("Solo el creador puede actualizar la actividad");
    }

    const updates: {
      name?: string;
      address?: string;
      dateTime?: number;
      description?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      if (!args.name || args.name.trim().length < 2) {
        throw new Error("El nombre debe tener al menos 2 caracteres");
      }
      updates.name = args.name.trim();
    }

    if (args.address !== undefined) {
      if (!args.address || args.address.trim().length < 5) {
        throw new Error("Ingresa una dirección válida");
      }
      updates.address = args.address.trim();
    }

    if (args.dateTime !== undefined) {
      if (args.dateTime < Date.now()) {
        throw new Error("La fecha y hora deben ser futuras");
      }
      updates.dateTime = args.dateTime;
    }

    if (args.description !== undefined) {
      if (!args.description || args.description.trim().length < 10) {
        throw new Error("La descripción debe tener al menos 10 caracteres");
      }
      updates.description = args.description;
    }

    await ctx.db.patch(args.activityId, updates);
  },
});

/**
 * Mutation: Elimina una actividad (solo el creador)
 */
export const deleteActivity = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new Error("Actividad no encontrada");
    }

    if (activity.createdBy !== userId) {
      throw new Error("Solo el creador puede eliminar la actividad");
    }

    // Eliminar todas las respuestas asociadas
    const responses = await ctx.db
      .query("activityResponses")
      .withIndex("activityId", (q) => q.eq("activityId", args.activityId))
      .collect();

    await Promise.all(responses.map((response) => ctx.db.delete(response._id)));

    // Eliminar la actividad
    await ctx.db.delete(args.activityId);
  },
});

