import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Query: Obtiene todos los servicios disponibles
 * Útil para mostrar la lista de servicios en la interfaz
 */
export const getAllServices = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();
    return services.sort((a, b) => a.name.localeCompare(b.name)); // Ordenados alfabéticamente
  },
});

/**
 * Query: Obtiene un servicio específico por su ID
 */
export const getServiceById = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    return service;
  },
});

/**
 * Query: Obtiene el servicio del usuario actual
 */
export const getMyService = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.serviceId) {
      return null;
    }

    const service = await ctx.db.get(user.serviceId);
    return service;
  },
});

/**
 * Mutation: Crea un nuevo servicio
 * Solo los administradores pueden crear servicios
 */
export const createService = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario sea admin
    const user = await ctx.db.get(userId);
    if (!user || !user.isAdmin) {
      throw new Error("Solo los administradores pueden crear servicios");
    }

    // Validar nombre
    if (!args.name || args.name.trim().length < 2) {
      throw new Error("El nombre del servicio debe tener al menos 2 caracteres");
    }

    const serviceId = await ctx.db.insert("services", {
      name: args.name.trim(),
    });

    return serviceId;
  },
});

/**
 * Mutation: Actualiza la información de un servicio
 * Solo los administradores pueden actualizar servicios
 */
export const updateService = mutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.isAdmin) {
      throw new Error("Solo los administradores pueden actualizar servicios");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Servicio no encontrado");
    }

    // Validar nombre si se proporciona
    if (args.name !== undefined) {
      if (!args.name || args.name.trim().length < 2) {
        throw new Error("El nombre del servicio debe tener al menos 2 caracteres");
      }
    }

    const updates: {
      name?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name.trim();
    }

    await ctx.db.patch(args.serviceId, updates);

    return { success: true };
  },
});

/**
 * Mutation: Elimina un servicio
 * Solo los administradores pueden eliminar servicios
 * Remueve el servicio de todos los usuarios que lo tenían asignado
 */
export const deleteService = mutation({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.isAdmin) {
      throw new Error("Solo los administradores pueden eliminar servicios");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Servicio no encontrado");
    }

    // Remover el servicio de todos los usuarios que lo tenían asignado
    const usersWithService = await ctx.db
      .query("users")
      .withIndex("serviceId", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    for (const userWithService of usersWithService) {
      await ctx.db.patch(userWithService._id, {
        serviceId: undefined,
      });
    }

    // Eliminar el servicio
    await ctx.db.delete(args.serviceId);

    return { success: true };
  },
});

/**
 * Mutation: Asigna un servicio al usuario actual
 * Un usuario solo puede tener un servicio asignado
 */
export const assignServiceToUser = mutation({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el servicio exista
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Servicio no encontrado");
    }

    await ctx.db.patch(userId, {
      serviceId: args.serviceId,
    });

    return { success: true };
  },
});

/**
 * Mutation: Remueve el servicio del usuario actual
 */
export const removeServiceFromUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    await ctx.db.patch(userId, {
      serviceId: undefined,
    });

    return { success: true };
  },
});

/**
 * Mutation: Asigna un servicio a un usuario específico (solo administradores)
 */
export const assignServiceToUserForAdmin = mutation({
  args: {
    userId: v.id("users"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario sea admin
    const admin = await ctx.db.get(adminId);
    if (!admin || !admin.isAdmin) {
      throw new Error("Solo los administradores pueden asignar servicios a otros usuarios");
    }

    // Verificar que el usuario objetivo exista
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar que el servicio exista
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Servicio no encontrado");
    }

    await ctx.db.patch(args.userId, {
      serviceId: args.serviceId,
    });

    return { success: true };
  },
});

/**
 * Mutation: Remueve el servicio de un usuario específico (solo administradores)
 */
export const removeServiceFromUserForAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario sea admin
    const admin = await ctx.db.get(adminId);
    if (!admin || !admin.isAdmin) {
      throw new Error("Solo los administradores pueden remover servicios de otros usuarios");
    }

    // Verificar que el usuario objetivo exista
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    await ctx.db.patch(args.userId, {
      serviceId: undefined,
    });

    return { success: true };
  },
});

