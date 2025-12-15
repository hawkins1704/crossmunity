import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Query: Obtiene todos los cursos disponibles
 * Útil para mostrar la lista de cursos en la interfaz
 */
export const getAllCourses = query({
  args: {},
  handler: async (ctx) => {
    const courses = await ctx.db.query("courses").collect();
    return courses.sort((a, b) => b.createdAt - a.createdAt); // Más recientes primero
  },
});

/**
 * Query: Obtiene los cursos en los que está inscrito el usuario actual
 */
export const getMyCourses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.currentCourses || user.currentCourses.length === 0) {
      return [];
    }

    const courses = await Promise.all(
      user.currentCourses.map((courseId) => ctx.db.get(courseId))
    );

    return courses.filter(Boolean);
  },
});

/**
 * Query: Obtiene un curso específico por su ID
 */
export const getCourseById = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    return course;
  },
});

/**
 * Mutation: Crea un nuevo curso
 * Puede ser usado por administradores o pastores para crear cursos globales
 */
export const createCourse = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario sea pastor (puedes ajustar esta lógica según tus necesidades)
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "Pastor") {
      throw new Error("Solo los pastores pueden crear cursos");
    }

    const now = Date.now();

    const courseId = await ctx.db.insert("courses", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    return courseId;
  },
});

/**
 * Mutation: Inscribe al usuario actual en uno o más cursos
 * Actualiza el campo currentCourses del usuario
 */
export const enrollInCourses = mutation({
  args: {
    courseIds: v.array(v.id("courses")),
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

    // Verificar que todos los cursos existan
    const courses = await Promise.all(
      args.courseIds.map((courseId) => ctx.db.get(courseId))
    );

    const invalidCourses = courses.filter((course) => !course);
    if (invalidCourses.length > 0) {
      throw new Error("Uno o más cursos no existen");
    }

    // Combinar cursos existentes con los nuevos (evitar duplicados)
    const existingCourses = user.currentCourses || [];
    const newCourses = [...new Set([...existingCourses, ...args.courseIds])];

    await ctx.db.patch(userId, {
      currentCourses: newCourses,
    });

    return { success: true };
  },
});

/**
 * Mutation: Desinscribe al usuario actual de uno o más cursos
 * Remueve los cursos del campo currentCourses del usuario
 */
export const unenrollFromCourses = mutation({
  args: {
    courseIds: v.array(v.id("courses")),
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

    const currentCourses = user.currentCourses || [];
    const updatedCourses = currentCourses.filter(
      (courseId) => !args.courseIds.includes(courseId)
    );

    await ctx.db.patch(userId, {
      currentCourses: updatedCourses,
    });

    return { success: true };
  },
});

/**
 * Mutation: Actualiza el estado de "en escuela" del usuario actual
 * Útil para activar/desactivar el estado de escuela del usuario
 */
export const updateSchoolStatus = mutation({
  args: {
    isActiveInSchool: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    await ctx.db.patch(userId, {
      isActiveInSchool: args.isActiveInSchool,
    });

    return { success: true };
  },
});

/**
 * Mutation: Actualiza la información de un curso
 * Solo los pastores pueden actualizar cursos
 */
export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "Pastor") {
      throw new Error("Solo los pastores pueden actualizar cursos");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Curso no encontrado");
    }

    const updates: {
      name?: string;
      description?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.courseId, updates);

    return { success: true };
  },
});

