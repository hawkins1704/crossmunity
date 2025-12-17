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
    return courses; // Más recientes primero
  },
});

/**
 * Query: Obtiene los cursos en los que está inscrito el usuario actual
 * Incluye información de progreso para cada curso
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
      user.currentCourses.map(async (courseId) => {
        const course = await ctx.db.get(courseId);
        if (!course) return null;

        // Obtener progreso del usuario en este curso
        const progress = await ctx.db
          .query("courseProgress")
          .withIndex("userId_courseId", (q) =>
            q.eq("userId", userId).eq("courseId", courseId)
          )
          .first();

        // Calcular semana actual (solo si tiene fechas definidas)
        const now = Date.now();
        const startDate = course.startDate;
        const durationWeeks = course.durationWeeks || 9;
        
        let currentWeek = 1;
        if (startDate) {
          const weekInMs = 7 * 24 * 60 * 60 * 1000;
          const weeksSinceStart = Math.floor((now - startDate) / weekInMs);
          currentWeek = Math.min(weeksSinceStart + 1, durationWeeks);
        }

        // Calcular estados para cada semana
        const completedWeeks = progress?.completedWeeks || [];
        const weekStatuses: { week: number; status: "al-dia" | "atrasado" | "pendiente"; isCompleted: boolean }[] = [];
        for (let week = 1; week <= durationWeeks; week++) {
          const isCompleted = completedWeeks.includes(week);
          let status: "al-dia" | "atrasado" | "pendiente";

          if (week < currentWeek) {
            status = isCompleted ? "al-dia" : "atrasado";
          } else if (week === currentWeek) {
            status = isCompleted ? "al-dia" : "atrasado";
          } else {
            status = isCompleted ? "al-dia" : "pendiente";
          }

          weekStatuses.push({
            week,
            status,
            isCompleted,
          });
        }

        return {
          ...course,
          progress: progress || null,
          completedWeeks,
          completedWorkAndExam: progress?.completedWorkAndExam || false,
          currentWeek,
          weekStatuses,
        };
      })
    );

    return courses.filter(Boolean);
  },
});

/**
 * Query: Obtiene los cursos y progreso de un usuario específico
 * Útil para líderes que quieren ver el progreso de sus discípulos
 */
export const getUserCoursesProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.currentCourses || user.currentCourses.length === 0) {
      return [];
    }

    const courses = await Promise.all(
      user.currentCourses.map(async (courseId) => {
        const course = await ctx.db.get(courseId);
        if (!course) return null;

        // Obtener progreso del usuario en este curso
        const progress = await ctx.db
          .query("courseProgress")
          .withIndex("userId_courseId", (q) =>
            q.eq("userId", args.userId).eq("courseId", courseId)
          )
          .first();

        // Calcular semana actual (solo si tiene fechas definidas)
        const now = Date.now();
        const startDate = course.startDate;
        const durationWeeks = course.durationWeeks || 9;
        
        let currentWeek = 1;
        if (startDate) {
          const weekInMs = 7 * 24 * 60 * 60 * 1000;
          const weeksSinceStart = Math.floor((now - startDate) / weekInMs);
          currentWeek = Math.min(weeksSinceStart + 1, durationWeeks);
        }

        // Calcular estados para cada semana
        const completedWeeks = progress?.completedWeeks || [];
        const weekStatuses: { week: number; status: "al-dia" | "atrasado" | "pendiente"; isCompleted: boolean }[] = [];
        let hasBacklog = false; // Si tiene semanas atrasadas
        
        for (let week = 1; week <= durationWeeks; week++) {
          const isCompleted = completedWeeks.includes(week);
          let status: "al-dia" | "atrasado" | "pendiente";

          if (week < currentWeek) {
            status = isCompleted ? "al-dia" : "atrasado";
            if (!isCompleted) hasBacklog = true;
          } else if (week === currentWeek) {
            status = isCompleted ? "al-dia" : "atrasado";
            if (!isCompleted) hasBacklog = true;
          } else {
            status = isCompleted ? "al-dia" : "pendiente";
          }

          weekStatuses.push({
            week,
            status,
            isCompleted,
          });
        }

        return {
          ...course,
          progress: progress || null,
          completedWeeks,
          completedWorkAndExam: progress?.completedWorkAndExam || false,
          currentWeek,
          weekStatuses,
          hasBacklog, // Si tiene semanas atrasadas
        };
      })
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
    startDate: v.number(), // Timestamp de inicio del curso
    endDate: v.number(), // Timestamp de fin del curso
    durationWeeks: v.optional(v.number()), // Duración en semanas (por defecto 9)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario sea admin
    const user = await ctx.db.get(userId);
    if (!user || !user.isAdmin) {
      throw new Error("Solo los administradores pueden crear cursos");
    }

    // Validar fechas
    if (args.startDate >= args.endDate) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    const durationWeeks = args.durationWeeks ?? 9;

    const courseId = await ctx.db.insert("courses", {
      name: args.name,
      description: args.description,
      startDate: args.startDate,
      endDate: args.endDate,
      durationWeeks,
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
    const newCourseIds = args.courseIds.filter(
      (courseId) => !existingCourses.includes(courseId)
    );
    const newCourses = [...existingCourses, ...newCourseIds];

    // Si tiene al menos un curso, activar el estado de escuela
    const isActiveInSchool = newCourses.length > 0;

    await ctx.db.patch(userId, {
      currentCourses: newCourses,
      isActiveInSchool,
    });

    // Crear registros de progreso para los nuevos cursos
    for (const courseId of newCourseIds) {
      // Verificar si ya existe un registro de progreso
      const existingProgress = await ctx.db
        .query("courseProgress")
        .withIndex("userId_courseId", (q) =>
          q.eq("userId", userId).eq("courseId", courseId)
        )
        .first();

      if (!existingProgress) {
        await ctx.db.insert("courseProgress", {
          userId,
          courseId,
          completedWeeks: [],
          completedWorkAndExam: false,
        });
      }
    }

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

    // Si no quedan cursos, desactivar el estado de escuela
    const isActiveInSchool = updatedCourses.length > 0;

    await ctx.db.patch(userId, {
      currentCourses: updatedCourses,
      isActiveInSchool,
    });

    // Eliminar registros de progreso de los cursos desinscritos
    for (const courseId of args.courseIds) {
      const progress = await ctx.db
        .query("courseProgress")
        .withIndex("userId_courseId", (q) =>
          q.eq("userId", userId).eq("courseId", courseId)
        )
        .first();

      if (progress) {
        await ctx.db.delete(progress._id);
      }
    }

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
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    durationWeeks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.isAdmin) {
      throw new Error("Solo los administradores pueden actualizar cursos");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Curso no encontrado");
    }

    // Validar fechas si ambas están presentes
    if (
      args.startDate !== undefined &&
      args.endDate !== undefined &&
      args.startDate >= args.endDate
    ) {
      throw new Error("La fecha de inicio debe ser anterior a la fecha de fin");
    }

    const updates: {
      name?: string;
      description?: string;
      startDate?: number;
      endDate?: number;
      durationWeeks?: number;
    } = {};

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.startDate !== undefined) {
      updates.startDate = args.startDate;
    }

    if (args.endDate !== undefined) {
      updates.endDate = args.endDate;
    }

    if (args.durationWeeks !== undefined) {
      updates.durationWeeks = args.durationWeeks;
    }

    await ctx.db.patch(args.courseId, updates);

    return { success: true };
  },
});

/**
 * Query: Obtiene el progreso del usuario actual en un curso específico
 * Incluye el cálculo de estados (al día, atrasado, pendiente) para cada semana
 */
export const getCourseProgress = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Curso no encontrado");
    }

    // Obtener progreso del usuario
    const progress = await ctx.db
      .query("courseProgress")
      .withIndex("userId_courseId", (q) =>
        q.eq("userId", userId).eq("courseId", args.courseId)
      )
      .first();

    // Si no existe progreso, crear uno vacío (no lo guardamos, solo lo retornamos)
    const completedWeeks = progress?.completedWeeks || [];
    const completedWorkAndExam = progress?.completedWorkAndExam || false;

    // Calcular semana actual basándose en startDate y fecha actual
    const now = Date.now();
    const startDate = course.startDate;
    const durationWeeks = course.durationWeeks || 9;
    
    let currentWeek = 1;
    if (startDate) {
      const weekInMs = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos
      const weeksSinceStart = Math.floor((now - startDate) / weekInMs);
      currentWeek = Math.min(weeksSinceStart + 1, durationWeeks);
    }

    // Calcular estados para cada semana
    const weekStatuses: { week: number; status: "al-dia" | "atrasado" | "pendiente"; isCompleted: boolean }[] = [];
    for (let week = 1; week <= durationWeeks; week++) {
      const isCompleted = completedWeeks.includes(week);
      let status: "al-dia" | "atrasado" | "pendiente";

      if (week < currentWeek) {
        // Semana pasada
        status = isCompleted ? "al-dia" : "atrasado";
      } else if (week === currentWeek) {
        // Semana actual
        status = isCompleted ? "al-dia" : "atrasado";
      } else {
        // Semana futura
        status = isCompleted ? "al-dia" : "pendiente";
      }

      weekStatuses.push({
        week,
        status,
        isCompleted,
      });
    }

    return {
      course,
      progress: progress || null,
      completedWeeks,
      completedWorkAndExam,
      currentWeek,
      weekStatuses,
    };
  },
});

/**
 * Mutation: Marca o desmarca una semana como completada
 */
export const toggleWeekCompletion = mutation({
  args: {
    courseId: v.id("courses"),
    week: v.number(), // Número de semana (1 hasta durationWeeks del curso)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Curso no encontrado");
    }

    // Obtener la duración del curso (por defecto 9 semanas)
    const durationWeeks = course.durationWeeks || 9;

    // Validar que la semana esté en rango válido según la duración del curso
    if (args.week < 1 || args.week > durationWeeks) {
      throw new Error(`La semana debe estar entre 1 y ${durationWeeks}`);
    }

    // Verificar que el usuario esté inscrito en el curso
    const user = await ctx.db.get(userId);
    if (!user || !user.currentCourses?.includes(args.courseId)) {
      throw new Error("No estás inscrito en este curso");
    }

    // Obtener o crear progreso
    const progress = await ctx.db
      .query("courseProgress")
      .withIndex("userId_courseId", (q) =>
        q.eq("userId", userId).eq("courseId", args.courseId)
      )
      .first();

    const completedWeeks = progress?.completedWeeks || [];

    if (completedWeeks.includes(args.week)) {
      // Desmarcar semana
      const updatedWeeks = completedWeeks.filter((w) => w !== args.week);
      if (progress) {
        await ctx.db.patch(progress._id, {
          completedWeeks: updatedWeeks,
        });
      }
    } else {
      // Marcar semana
      const updatedWeeks = [...completedWeeks, args.week].sort((a, b) => a - b);
      if (progress) {
        await ctx.db.patch(progress._id, {
          completedWeeks: updatedWeeks,
        });
      } else {
        // Crear nuevo progreso si no existe
        await ctx.db.insert("courseProgress", {
          userId,
          courseId: args.courseId,
          completedWeeks: updatedWeeks,
          completedWorkAndExam: false,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Mutation: Marca o desmarca trabajo y examen como completado
 */
export const toggleWorkAndExam = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Curso no encontrado");
    }

    // Verificar que el usuario esté inscrito en el curso
    const user = await ctx.db.get(userId);
    if (!user || !user.currentCourses?.includes(args.courseId)) {
      throw new Error("No estás inscrito en este curso");
    }

    // Obtener o crear progreso
    const progress = await ctx.db
      .query("courseProgress")
      .withIndex("userId_courseId", (q) =>
        q.eq("userId", userId).eq("courseId", args.courseId)
      )
      .first();

    const newStatus = progress ? !progress.completedWorkAndExam : true;

    if (progress) {
      await ctx.db.patch(progress._id, {
        completedWorkAndExam: newStatus,
      });
    } else {
      // Crear nuevo progreso si no existe
      await ctx.db.insert("courseProgress", {
        userId,
        courseId: args.courseId,
        completedWeeks: [],
        completedWorkAndExam: newStatus,
      });
    }

    return { success: true };
  },
});

/**
 * Mutation: Elimina un curso
 * Solo los administradores pueden eliminar cursos
 * También elimina todos los registros de progreso asociados
 */
export const deleteCourse = mutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.isAdmin) {
      throw new Error("Solo los administradores pueden eliminar cursos");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) {
      throw new Error("Curso no encontrado");
    }

    // Eliminar todos los registros de progreso asociados
    const progressRecords = await ctx.db
      .query("courseProgress")
      .withIndex("courseId", (q) => q.eq("courseId", args.courseId))
      .collect();

    for (const progress of progressRecords) {
      await ctx.db.delete(progress._id);
    }

    // Eliminar el curso
    await ctx.db.delete(args.courseId);

    return { success: true };
  },
});

