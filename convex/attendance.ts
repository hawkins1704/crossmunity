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
 * Query: Obtiene el reporte mensual del usuario actual
 * Retorna totales agrupados por tipo para el mes especificado
 */
export const getMyMonthlyReport = query({
  args: {
    month: v.number(), // Mes (1-12)
    year: v.number(), // Año (ej: 2024)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const monthStart = getMonthStart(
      new Date(args.year, args.month - 1, 1).getTime()
    );
    const monthEnd = getMonthEnd(
      new Date(args.year, args.month - 1, 1).getTime()
    );

    // Obtener todos los registros del mes
    const allRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const monthRecords = allRecords.filter(
      (r) => r.date >= monthStart && r.date <= monthEnd
    );

    // Obtener información del usuario para conocer su género
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Helper para calcular total de personas en un registro (incluyendo al usuario si asistió)
    const getRecordTotal = (record: typeof monthRecords[0]): number => {
      // Para reset y conferencia, siempre cuenta el usuario (1) + count adicionales
      if (record.type === "reset" || record.type === "conferencia") {
        return 1 + record.count;
      }
      // Para nuevos_asistentes, solo cuenta el usuario si asistió
      if (record.type === "nuevos_asistentes") {
        return (record.attended ? 1 : 0) + record.count;
      }
      return record.count;
    };

    // Helper para calcular hombres/mujeres en un registro
    const getGenderCount = (record: typeof monthRecords[0]): { male: number; female: number } => {
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
        records: monthRecords.filter((r) => r.type === "nuevos_asistentes"),
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        records: monthRecords.filter((r) => r.type === "reset"),
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        records: monthRecords.filter((r) => r.type === "conferencia"),
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
 * Query: Obtiene el reporte mensual de grupo para líderes
 * Incluye totales de sus discípulos + sus propios registros
 * Agrupado por tipo y con desglose de propios vs discípulos
 */
export const getGroupAttendanceReport = query({
  args: {
    month: v.number(), // Mes (1-12)
    year: v.number(), // Año (ej: 2024)
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

    if (userGroups.length === 0) {
      // Si no es líder, retornar solo su reporte personal
      const monthStart = getMonthStart(
        new Date(args.year, args.month - 1, 1).getTime()
      );
      const monthEnd = getMonthEnd(
        new Date(args.year, args.month - 1, 1).getTime()
      );

      const allRecords = await ctx.db
        .query("attendanceRecords")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();

      const monthRecords = allRecords.filter(
        (r) => r.date >= monthStart && r.date <= monthEnd
      );

      // Helper para calcular total de personas en un registro
      const getRecordTotal = (record: typeof monthRecords[0]): number => {
        if (record.type === "reset" || record.type === "conferencia") {
          return 1 + record.count;
        }
        if (record.type === "nuevos_asistentes") {
          return (record.attended ? 1 : 0) + record.count;
        }
        return record.count;
      };

      // Helper para calcular hombres/mujeres en un registro
      const getGenderCount = (record: typeof monthRecords[0]): { male: number; female: number } => {
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
          records: monthRecords.filter((r) => r.type === "nuevos_asistentes"),
        },
        reset: {
          total: 0,
          male: 0,
          female: 0,
          records: monthRecords.filter((r) => r.type === "reset"),
        },
        conferencia: {
          total: 0,
          male: 0,
          female: 0,
          records: monthRecords.filter((r) => r.type === "conferencia"),
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
    const allDisciples = await ctx.db
      .query("users")
      .withIndex("leader", (q) => q.eq("leader", userId))
      .collect();

    const monthStart = getMonthStart(
      new Date(args.year, args.month - 1, 1).getTime()
    );
    const monthEnd = getMonthEnd(
      new Date(args.year, args.month - 1, 1).getTime()
    );

    // Obtener registros propios del mes
    const myRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const myMonthRecords = myRecords.filter(
      (r) => r.date >= monthStart && r.date <= monthEnd
    );

    // Obtener registros de todos los discípulos del mes
    const discipleIds = allDisciples.map((d) => d._id);
    const allDiscipleRecords = await Promise.all(
      discipleIds.map(async (discipleId) => {
        const records = await ctx.db
          .query("attendanceRecords")
          .withIndex("userId", (q) => q.eq("userId", discipleId))
          .collect();
        return records.filter(
          (r) => r.date >= monthStart && r.date <= monthEnd
        );
      })
    );

    const discipleMonthRecords = allDiscipleRecords.flat();

    // Crear mapa de userId -> género para los discípulos
    const discipleGenderMap = new Map<Id<"users">, "Male" | "Female">();
    allDisciples.forEach((disciple) => {
      discipleGenderMap.set(disciple._id, disciple.gender);
    });

    // Helper para calcular total de personas en un registro
    const getRecordTotal = (record: typeof myMonthRecords[0]): number => {
      if (record.type === "reset" || record.type === "conferencia") {
        return 1 + record.count;
      }
      if (record.type === "nuevos_asistentes") {
        return (record.attended ? 1 : 0) + record.count;
      }
      return record.count;
    };

    // Helper para calcular género de un registro propio
    const getMyGenderCount = (record: typeof myMonthRecords[0]): { male: number; female: number } => {
      const total = getRecordTotal(record);
      if (user.gender === "Male") {
        return { male: total, female: 0 };
      } else {
        return { male: 0, female: total };
      }
    };

    // Helper para calcular género de un registro de discípulo
    const getDiscipleGenderCount = (record: typeof discipleMonthRecords[0]): { male: number; female: number } => {
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
        records: myMonthRecords.filter((r) => r.type === "nuevos_asistentes"),
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        records: myMonthRecords.filter((r) => r.type === "reset"),
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        records: myMonthRecords.filter((r) => r.type === "conferencia"),
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
        records: discipleMonthRecords.filter(
          (r) => r.type === "nuevos_asistentes"
        ),
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        records: discipleMonthRecords.filter((r) => r.type === "reset"),
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        records: discipleMonthRecords.filter((r) => r.type === "conferencia"),
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
    const groupReport = {
      nuevos_asistentes: {
        total:
          myReport.nuevos_asistentes.total +
          disciplesReport.nuevos_asistentes.total,
        myTotal: myReport.nuevos_asistentes.total,
        disciplesTotal: disciplesReport.nuevos_asistentes.total,
        male: myReport.nuevos_asistentes.male + disciplesReport.nuevos_asistentes.male,
        female: myReport.nuevos_asistentes.female + disciplesReport.nuevos_asistentes.female,
        myMale: myReport.nuevos_asistentes.male,
        myFemale: myReport.nuevos_asistentes.female,
        disciplesMale: disciplesReport.nuevos_asistentes.male,
        disciplesFemale: disciplesReport.nuevos_asistentes.female,
      },
      reset: {
        total: myReport.reset.total + disciplesReport.reset.total,
        myTotal: myReport.reset.total,
        disciplesTotal: disciplesReport.reset.total,
        male: myReport.reset.male + disciplesReport.reset.male,
        female: myReport.reset.female + disciplesReport.reset.female,
        myMale: myReport.reset.male,
        myFemale: myReport.reset.female,
        disciplesMale: disciplesReport.reset.male,
        disciplesFemale: disciplesReport.reset.female,
      },
      conferencia: {
        total: myReport.conferencia.total + disciplesReport.conferencia.total,
        myTotal: myReport.conferencia.total,
        disciplesTotal: disciplesReport.conferencia.total,
        male: myReport.conferencia.male + disciplesReport.conferencia.male,
        female: myReport.conferencia.female + disciplesReport.conferencia.female,
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

