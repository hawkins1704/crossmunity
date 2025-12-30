import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

/**
 * Helper: Verifica si una fecha (timestamp) es domingo
 */
function isSunday(timestamp: number): boolean {
  const date = new Date(timestamp);
  return date.getDay() === 0; // 0 = domingo
}

/**
 * Helper: Obtiene el inicio del mes (timestamp) para una fecha dada
 */
function getMonthStart(timestamp: number): number {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month, 1).getTime();
}

/**
 * Helper: Obtiene el fin del mes (timestamp) para una fecha dada
 */
function getMonthEnd(timestamp: number): number {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
}

/**
 * Helper: Obtiene el inicio del año (timestamp) para un año dado
 */
function getYearStart(year: number): number {
  return new Date(year, 0, 1).getTime();
}

/**
 * Helper: Obtiene el fin del año (timestamp) para un año dado
 */
function getYearEnd(year: number): number {
  return new Date(year, 11, 31, 23, 59, 59, 999).getTime();
}

/**
 * Helper: Normaliza un timestamp para que solo contenga la fecha (sin hora)
 * Establece la hora a medianoche en la zona horaria local
 */
function normalizeDate(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Mutation: Registra asistencia o contador
 * Valida que nuevos_asistentes solo se pueda registrar los domingos
 */
export const recordAttendance = mutation({
  args: {
    date: v.number(), // Timestamp de la fecha
    type: v.union(
      v.literal("nuevos_asistentes"),
      v.literal("reset"),
      v.literal("conferencia")
    ),
    attended: v.optional(v.boolean()), // Solo para nuevos_asistentes y conferencia
    count: v.number(), // Cantidad de personas
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Normalizar fecha (solo fecha, sin hora)
    const normalizedDate = normalizeDate(args.date);

    // Validar que nuevos_asistentes solo se pueda registrar los domingos
    if (args.type === "nuevos_asistentes" && !isSunday(normalizedDate)) {
      throw new Error("Los nuevos asistentes solo se pueden registrar los domingos");
    }

    // Validar que attended esté presente solo para nuevos_asistentes
    if (args.type === "nuevos_asistentes" && args.attended === undefined) {
      throw new Error("Debes indicar si asististe o no");
    }

    // Validar que count sea positivo
    if (args.count < 0) {
      throw new Error("La cantidad debe ser un número positivo");
    }

    // Crear registro
    const recordId = await ctx.db.insert("attendanceRecords", {
      userId,
      date: normalizedDate,
      type: args.type,
      attended: args.attended,
      count: args.count,
    });

    return recordId;
  },
});

/**
 * Mutation: Actualiza un registro de asistencia existente
 * Solo el usuario que creó el registro puede actualizarlo
 */
export const updateAttendance = mutation({
  args: {
    recordId: v.id("attendanceRecords"),
    date: v.number(), // Timestamp de la fecha
    type: v.union(
      v.literal("nuevos_asistentes"),
      v.literal("reset"),
      v.literal("conferencia")
    ),
    attended: v.optional(v.boolean()), // Solo para nuevos_asistentes y conferencia
    count: v.number(), // Cantidad de personas
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el registro existe y pertenece al usuario
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new Error("Registro no encontrado");
    }

    if (record.userId !== userId) {
      throw new Error("No tienes permiso para editar este registro");
    }

    // Normalizar fecha (solo fecha, sin hora)
    const normalizedDate = normalizeDate(args.date);

    // Validar que nuevos_asistentes solo se pueda registrar los domingos
    if (args.type === "nuevos_asistentes" && !isSunday(normalizedDate)) {
      throw new Error("Los nuevos asistentes solo se pueden registrar los domingos");
    }

    // Validar que attended esté presente solo para nuevos_asistentes
    if (args.type === "nuevos_asistentes" && args.attended === undefined) {
      throw new Error("Debes indicar si asististe o no");
    }

    // Validar que count sea positivo
    if (args.count < 0) {
      throw new Error("La cantidad debe ser un número positivo");
    }

    // Actualizar registro
    await ctx.db.patch(args.recordId, {
      date: normalizedDate,
      type: args.type,
      attended: args.attended,
      count: args.count,
    });

    return { success: true };
  },
});

/**
 * Mutation: Elimina un registro de asistencia
 * Solo el usuario que creó el registro puede eliminarlo
 */
export const deleteAttendance = mutation({
  args: {
    recordId: v.id("attendanceRecords"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el registro existe y pertenece al usuario
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new Error("Registro no encontrado");
    }

    if (record.userId !== userId) {
      throw new Error("No tienes permiso para eliminar este registro");
    }

    // Eliminar registro
    await ctx.db.delete(args.recordId);

    return { success: true };
  },
});

/**
 * Query: Obtiene los registros de asistencia del usuario actual
 * Opcionalmente filtrados por tipo, mes y año
 */
export const getMyAttendanceRecords = query({
  args: {
    type: v.optional(
      v.union(
        v.literal("nuevos_asistentes"),
        v.literal("reset"),
        v.literal("conferencia")
      )
    ),
    month: v.optional(v.number()), // Mes (1-12)
    year: v.optional(v.number()), // Año (ej: 2024)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener todos los registros del usuario
    let records = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    // Filtrar por tipo si se especifica
    if (args.type) {
      records = records.filter((r) => r.type === args.type);
    }

    // Filtrar por mes y año si se especifican
    if (args.month !== undefined && args.year !== undefined) {
      const monthStart = getMonthStart(
        new Date(args.year, args.month - 1, 1).getTime()
      );
      const monthEnd = getMonthEnd(
        new Date(args.year, args.month - 1, 1).getTime()
      );
      records = records.filter(
        (r) => r.date >= monthStart && r.date <= monthEnd
      );
    }

    // Ordenar por fecha (más recientes primero)
    records.sort((a, b) => b.date - a.date);

    return records;
  },
});

/**
 * Query: Obtiene los registros de asistencia de un usuario específico (solo para líderes)
 * Permite a los líderes ver los registros de sus discípulos
 */
export const getAttendanceRecordsByUserId = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario actual sea líder del usuario solicitado
    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((group) =>
      group.leaders.includes(currentUserId)
    );

    if (userGroups.length === 0) {
      throw new Error("Solo los líderes pueden ver los registros de sus discípulos");
    }

    // Verificar que el usuario solicitado sea discípulo del líder
    const disciple = await ctx.db.get(args.userId);
    if (!disciple) {
      throw new Error("Usuario no encontrado");
    }

    if (disciple.leader !== currentUserId) {
      throw new Error("Solo puedes ver los registros de tus discípulos");
    }

    // Obtener todos los registros del discípulo
    const records = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Ordenar por fecha (más recientes primero)
    records.sort((a, b) => b.date - a.date);

    return records;
  },
});

/**
 * Query: Obtiene el reporte mensual o anual del usuario actual
 * Retorna totales agrupados por tipo para el mes o año especificado
 */
export const getMyMonthlyReport = query({
  args: {
    month: v.optional(v.number()), // Mes (1-12), opcional. Si no se proporciona, filtra por año completo
    year: v.number(), // Año (ej: 2024)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Calcular rango de fechas: mes específico o año completo
    let periodStart: number;
    let periodEnd: number;

    if (args.month !== undefined) {
      // Filtrar por mes específico
      periodStart = getMonthStart(
        new Date(args.year, args.month - 1, 1).getTime()
      );
      periodEnd = getMonthEnd(
        new Date(args.year, args.month - 1, 1).getTime()
      );
    } else {
      // Filtrar por año completo
      periodStart = getYearStart(args.year);
      periodEnd = getYearEnd(args.year);
    }

    // Obtener todos los registros del usuario
    const allRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const periodRecords = allRecords.filter(
      (r) => r.date >= periodStart && r.date <= periodEnd
    );

    // Obtener información del usuario para conocer su género
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Helper para calcular total de personas en un registro (incluyendo al usuario si asistió)
    const getRecordTotal = (record: typeof periodRecords[0]): number => {
      // Para reset y conferencia, count representa el total de personas
      if (record.type === "reset" || record.type === "conferencia") {
        return record.count;
      }
      // Para nuevos_asistentes, solo cuenta el usuario si asistió
      if (record.type === "nuevos_asistentes") {
        return (record.attended ? 1 : 0) + record.count;
      }
      return record.count;
    };

    // Helper para calcular hombres/mujeres en un registro
    const getGenderCount = (record: typeof periodRecords[0]): { male: number; female: number } => {
      const total = getRecordTotal(record);
      if (user.gender === "Male") {
        return { male: total, female: 0 };
      } else {
        return { male: 0, female: total };
      }
    };

    // Calcular totales por tipo
    const report = {
      nuevos_asistentes: {
        total: 0,
        male: 0,
        female: 0,
        records: periodRecords.filter((r) => r.type === "nuevos_asistentes"),
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        records: periodRecords.filter((r) => r.type === "reset"),
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        records: periodRecords.filter((r) => r.type === "conferencia"),
      },
    };

    // Sumar totales y género
    report.nuevos_asistentes.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getGenderCount(r);
      report.nuevos_asistentes.total += total;
      report.nuevos_asistentes.male += gender.male;
      report.nuevos_asistentes.female += gender.female;
    });

    report.reset.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getGenderCount(r);
      report.reset.total += total;
      report.reset.male += gender.male;
      report.reset.female += gender.female;
    });

    report.conferencia.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getGenderCount(r);
      report.conferencia.total += total;
      report.conferencia.male += gender.male;
      report.conferencia.female += gender.female;
    });

    return report;
  },
});

/**
 * Query: Obtiene el reporte mensual o anual de grupo para líderes
 * Incluye totales de sus discípulos + sus propios registros
 * Agrupado por tipo y con desglose de propios vs discípulos
 */
export const getGroupAttendanceReport = query({
  args: {
    month: v.optional(v.number()), // Mes (1-12), opcional. Si no se proporciona, filtra por año completo
    year: v.number(), // Año (ej: 2024)
    discipleId: v.optional(v.id("users")), // ID del discípulo para filtrar, opcional. Si no se proporciona, muestra todos los discípulos
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario tenga grupos (sea líder)
    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((group) =>
      group.leaders.includes(userId)
    );

    // Obtener información del usuario para conocer su género
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Calcular rango de fechas: mes específico o año completo
    let periodStart: number;
    let periodEnd: number;

    if (args.month !== undefined) {
      // Filtrar por mes específico
      periodStart = getMonthStart(
        new Date(args.year, args.month - 1, 1).getTime()
      );
      periodEnd = getMonthEnd(
        new Date(args.year, args.month - 1, 1).getTime()
      );
    } else {
      // Filtrar por año completo
      periodStart = getYearStart(args.year);
      periodEnd = getYearEnd(args.year);
    }

    if (userGroups.length === 0) {
      // Si no es líder, retornar solo su reporte personal

      const allRecords = await ctx.db
        .query("attendanceRecords")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();

      const periodRecords = allRecords.filter(
        (r) => r.date >= periodStart && r.date <= periodEnd
      );

      // Helper para calcular total de personas en un registro
      const getRecordTotal = (record: typeof periodRecords[0]): number => {
        // Para reset y conferencia, count representa el total de personas
        if (record.type === "reset" || record.type === "conferencia") {
          return record.count;
        }
        if (record.type === "nuevos_asistentes") {
          return (record.attended ? 1 : 0) + record.count;
        }
        return record.count;
      };

      // Helper para calcular hombres/mujeres en un registro
      const getGenderCount = (record: typeof periodRecords[0]): { male: number; female: number } => {
        const total = getRecordTotal(record);
        if (user.gender === "Male") {
          return { male: total, female: 0 };
        } else {
          return { male: 0, female: total };
        }
      };

      const myReport = {
        nuevos_asistentes: {
          total: 0,
          male: 0,
          female: 0,
          records: periodRecords.filter((r) => r.type === "nuevos_asistentes"),
        },
        reset: {
          total: 0,
          male: 0,
          female: 0,
          records: periodRecords.filter((r) => r.type === "reset"),
        },
        conferencia: {
          total: 0,
          male: 0,
          female: 0,
          records: periodRecords.filter((r) => r.type === "conferencia"),
        },
      };

      myReport.nuevos_asistentes.records.forEach((r) => {
        const total = getRecordTotal(r);
        const gender = getGenderCount(r);
        myReport.nuevos_asistentes.total += total;
        myReport.nuevos_asistentes.male += gender.male;
        myReport.nuevos_asistentes.female += gender.female;
      });

      myReport.reset.records.forEach((r) => {
        const total = getRecordTotal(r);
        const gender = getGenderCount(r);
        myReport.reset.total += total;
        myReport.reset.male += gender.male;
        myReport.reset.female += gender.female;
      });

      myReport.conferencia.records.forEach((r) => {
        const total = getRecordTotal(r);
        const gender = getGenderCount(r);
        myReport.conferencia.total += total;
        myReport.conferencia.male += gender.male;
        myReport.conferencia.female += gender.female;
      });

      return {
        isLeader: false,
        myReport,
        groupReport: null,
      };
    }

    // Obtener todos los discípulos de los grupos del usuario
    let allDisciples = await ctx.db
      .query("users")
      .withIndex("leader", (q) => q.eq("leader", userId))
      .collect();

    // Si se especifica un discípulo, filtrar solo ese
    if (args.discipleId !== undefined) {
      // Verificar que el discípulo pertenezca al líder
      const disciple = allDisciples.find((d) => d._id === args.discipleId);
      if (!disciple) {
        throw new Error("El discípulo especificado no pertenece a tus grupos");
      }
      allDisciples = [disciple];
    }

    // Obtener registros propios del período
    const myRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const myPeriodRecords = myRecords.filter(
      (r) => r.date >= periodStart && r.date <= periodEnd
    );

    // Obtener registros de todos los discípulos del período
    const discipleIds = allDisciples.map((d) => d._id);
    const allDiscipleRecords = await Promise.all(
      discipleIds.map(async (discipleId) => {
        const records = await ctx.db
          .query("attendanceRecords")
          .withIndex("userId", (q) => q.eq("userId", discipleId))
          .collect();
        return records.filter(
          (r) => r.date >= periodStart && r.date <= periodEnd
        );
      })
    );

    const disciplePeriodRecords = allDiscipleRecords.flat();

    // Crear mapa de userId -> género para los discípulos
    const discipleGenderMap = new Map<Id<"users">, "Male" | "Female">();
    allDisciples.forEach((disciple) => {
      discipleGenderMap.set(disciple._id, disciple.gender);
    });

    // Helper para calcular total de personas en un registro
    const getRecordTotal = (record: typeof myPeriodRecords[0]): number => {
      // Para reset y conferencia, count representa el total de personas
      if (record.type === "reset" || record.type === "conferencia") {
        return record.count;
      }
      if (record.type === "nuevos_asistentes") {
        return (record.attended ? 1 : 0) + record.count;
      }
      return record.count;
    };

    // Helper para calcular género de un registro propio
    const getMyGenderCount = (record: typeof myPeriodRecords[0]): { male: number; female: number } => {
      const total = getRecordTotal(record);
      if (user.gender === "Male") {
        return { male: total, female: 0 };
      } else {
        return { male: 0, female: total };
      }
    };

    // Helper para calcular género de un registro de discípulo
    const getDiscipleGenderCount = (record: typeof disciplePeriodRecords[0]): { male: number; female: number } => {
      const total = getRecordTotal(record);
      const discipleGender = discipleGenderMap.get(record.userId);
      if (discipleGender === "Male") {
        return { male: total, female: 0 };
      } else {
        return { male: 0, female: total };
      }
    };

    // Calcular reporte propio
    const myReport = {
      nuevos_asistentes: {
        total: 0,
        male: 0,
        female: 0,
        records: myPeriodRecords.filter((r) => r.type === "nuevos_asistentes"),
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        records: myPeriodRecords.filter((r) => r.type === "reset"),
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        records: myPeriodRecords.filter((r) => r.type === "conferencia"),
      },
    };

    myReport.nuevos_asistentes.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getMyGenderCount(r);
      myReport.nuevos_asistentes.total += total;
      myReport.nuevos_asistentes.male += gender.male;
      myReport.nuevos_asistentes.female += gender.female;
    });

    myReport.reset.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getMyGenderCount(r);
      myReport.reset.total += total;
      myReport.reset.male += gender.male;
      myReport.reset.female += gender.female;
    });

    myReport.conferencia.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getMyGenderCount(r);
      myReport.conferencia.total += total;
      myReport.conferencia.male += gender.male;
      myReport.conferencia.female += gender.female;
    });

    // Calcular reporte de discípulos
    const disciplesReport = {
      nuevos_asistentes: {
        total: 0,
        male: 0,
        female: 0,
        records: disciplePeriodRecords.filter(
          (r) => r.type === "nuevos_asistentes"
        ),
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        records: disciplePeriodRecords.filter((r) => r.type === "reset"),
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        records: disciplePeriodRecords.filter((r) => r.type === "conferencia"),
      },
    };

    disciplesReport.nuevos_asistentes.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getDiscipleGenderCount(r);
      disciplesReport.nuevos_asistentes.total += total;
      disciplesReport.nuevos_asistentes.male += gender.male;
      disciplesReport.nuevos_asistentes.female += gender.female;
    });

    disciplesReport.reset.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getDiscipleGenderCount(r);
      disciplesReport.reset.total += total;
      disciplesReport.reset.male += gender.male;
      disciplesReport.reset.female += gender.female;
    });

    disciplesReport.conferencia.records.forEach((r) => {
      const total = getRecordTotal(r);
      const gender = getDiscipleGenderCount(r);
      disciplesReport.conferencia.total += total;
      disciplesReport.conferencia.male += gender.male;
      disciplesReport.conferencia.female += gender.female;
    });

    // Calcular totales combinados
    // El total solo incluye los discípulos filtrados, SIN incluir los registros del líder
    const groupReport = {
      nuevos_asistentes: {
        total: disciplesReport.nuevos_asistentes.total, // Solo discípulos filtrados
        myTotal: myReport.nuevos_asistentes.total,
        disciplesTotal: disciplesReport.nuevos_asistentes.total,
        male: disciplesReport.nuevos_asistentes.male, // Solo discípulos filtrados
        female: disciplesReport.nuevos_asistentes.female, // Solo discípulos filtrados
        myMale: myReport.nuevos_asistentes.male,
        myFemale: myReport.nuevos_asistentes.female,
        disciplesMale: disciplesReport.nuevos_asistentes.male,
        disciplesFemale: disciplesReport.nuevos_asistentes.female,
      },
      reset: {
        total: disciplesReport.reset.total, // Solo discípulos filtrados
        myTotal: myReport.reset.total,
        disciplesTotal: disciplesReport.reset.total,
        male: disciplesReport.reset.male, // Solo discípulos filtrados
        female: disciplesReport.reset.female, // Solo discípulos filtrados
        myMale: myReport.reset.male,
        myFemale: myReport.reset.female,
        disciplesMale: disciplesReport.reset.male,
        disciplesFemale: disciplesReport.reset.female,
      },
      conferencia: {
        total: disciplesReport.conferencia.total, // Solo discípulos filtrados
        myTotal: myReport.conferencia.total,
        disciplesTotal: disciplesReport.conferencia.total,
        male: disciplesReport.conferencia.male, // Solo discípulos filtrados
        female: disciplesReport.conferencia.female, // Solo discípulos filtrados
        myMale: myReport.conferencia.male,
        myFemale: myReport.conferencia.female,
        disciplesMale: disciplesReport.conferencia.male,
        disciplesFemale: disciplesReport.conferencia.female,
      },
    };

    return {
      isLeader: true,
      myReport,
      groupReport,
    };
  },
});

