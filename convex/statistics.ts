import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Helper: Calcula la edad desde una fecha de nacimiento (timestamp)
 */
function calculateAge(birthdateTimestamp: number): number {
  const birthDate = new Date(birthdateTimestamp);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Helper: Obtiene el rango de edad para una edad dada
 */
function getAgeRange(age: number): string {
  if (age < 13) return "-13";
  if (age >= 13 && age <= 17) return "13-17";
  if (age >= 18 && age <= 25) return "18-25";
  if (age >= 26 && age <= 35) return "26-35";
  if (age >= 36 && age <= 45) return "36-45";
  if (age >= 46 && age <= 55) return "46-55";
  return "56+";
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
 * Helper: Obtiene el inicio de la semana (lunes) para una fecha dada
 */
function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.getFullYear(), date.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * Helper: Obtiene el fin de la semana (hoy) para una fecha dada
 */
function getWeekEnd(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

/**
 * Helper: Obtiene el inicio del cuatrimestre para una fecha dada
 * Cuatrimestres: Ene-Abr (1-4), May-Ago (5-8), Sep-Dic (9-12)
 */
function getQuarterStart(timestamp: number): number {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth();
  
  let quarterStartMonth: number;
  if (month >= 0 && month <= 3) {
    quarterStartMonth = 0; // Enero
  } else if (month >= 4 && month <= 7) {
    quarterStartMonth = 4; // Mayo
  } else {
    quarterStartMonth = 8; // Septiembre
  }
  
  return new Date(year, quarterStartMonth, 1).getTime();
}

/**
 * Helper: Calcula el rango de fechas según el tipo de período (igual que en attendance.ts)
 */
function getPeriodRange(
  periodType: "week" | "month" | "quarter" | "year",
  referenceDate: Date
): { start: number; end: number } {
  const timestamp = referenceDate.getTime();
  const today = new Date();
  const todayTimestamp = today.getTime();
  
  switch (periodType) {
    case "week":
      return {
        start: getWeekStart(timestamp),
        end: getWeekEnd(timestamp),
      };
    case "month": {
      const monthStart = getMonthStart(timestamp);
      const monthEnd = getMonthEnd(timestamp);
      if (timestamp <= todayTimestamp && referenceDate.getMonth() === today.getMonth() && referenceDate.getFullYear() === today.getFullYear()) {
        return {
          start: monthStart,
          end: getWeekEnd(todayTimestamp),
        };
      } else {
        return {
          start: monthStart,
          end: monthEnd,
        };
      }
    }
    case "quarter": {
      const quarterStart = getQuarterStart(timestamp);
      const refMonth = referenceDate.getMonth();
      let quarterEndMonth: number;
      if (refMonth >= 0 && refMonth <= 3) {
        quarterEndMonth = 3;
      } else if (refMonth >= 4 && refMonth <= 7) {
        quarterEndMonth = 7;
      } else {
        quarterEndMonth = 11;
      }
      const quarterEnd = new Date(referenceDate.getFullYear(), quarterEndMonth + 1, 0, 23, 59, 59, 999).getTime();
      
      const currentQuarter = Math.floor(today.getMonth() / 4);
      const refQuarter = Math.floor(refMonth / 4);
      if (timestamp <= todayTimestamp && referenceDate.getFullYear() === today.getFullYear() && refQuarter === currentQuarter) {
        return {
          start: quarterStart,
          end: getWeekEnd(todayTimestamp),
        };
      } else {
        return {
          start: quarterStart,
          end: quarterEnd,
        };
      }
    }
    case "year": {
      const yearStart = getYearStart(referenceDate.getFullYear());
      const yearEnd = getYearEnd(referenceDate.getFullYear());
      if (referenceDate.getFullYear() === today.getFullYear()) {
        return {
          start: yearStart,
          end: getWeekEnd(todayTimestamp),
        };
      } else {
        return {
          start: yearStart,
          end: yearEnd,
        };
      }
    }
  }
}

/**
 * Helper: Obtiene todos los discípulos de los grupos del usuario
 * Si se especifica un grupo, solo obtiene los discípulos de ese grupo
 */
async function getDisciplesForStatistics(
  ctx: QueryCtx,
  userId: Id<"users">,
  groupId?: Id<"groups">
): Promise<Doc<"users">[]> {
  if (groupId) {
    // Obtener discípulos del grupo específico
    const group = await ctx.db.get(groupId);
    if (!group) {
      throw new Error("Grupo no encontrado");
    }
    
    // Verificar que el usuario es líder del grupo
    if (!group.leaders.includes(userId)) {
      throw new Error("Solo los líderes pueden ver las estadísticas del grupo");
    }
    
    const disciples = await Promise.all(
      group.disciples.map((discipleId: Id<"users">) => ctx.db.get(discipleId))
    );
    
    return disciples.filter(
      (disciple): disciple is NonNullable<typeof disciple> => disciple !== null
    );
  } else {
    // Obtener todos los discípulos de todos los grupos del usuario
    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((group) => group.leaders.includes(userId));
    
    const allDiscipleIds = new Set<Id<"users">>();
    
    for (const group of userGroups) {
      for (const discipleId of group.disciples) {
        allDiscipleIds.add(discipleId);
      }
    }
    
    const disciples = await Promise.all(
      Array.from(allDiscipleIds).map((discipleId) => ctx.db.get(discipleId))
    );
    
    return disciples.filter(
      (disciple): disciple is NonNullable<typeof disciple> => disciple !== null
    );
  }
}

/**
 * Helper: Obtiene los IDs de usuarios (líder + discípulos) para estadísticas
 */
async function getUserIdsForStatistics(
  ctx: QueryCtx,
  userId: Id<"users">,
  groupId?: Id<"groups">
): Promise<Id<"users">[]> {
  const disciples = await getDisciplesForStatistics(ctx, userId, groupId);
  const userIds = [userId, ...disciples.map((d) => d._id)];
  return userIds;
}

/**
 * Query: Obtiene la distribución por género de los discípulos
 */
export const getGenderDistribution = query({
  args: {
    groupId: v.optional(v.id("groups")),
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener discípulos según el filtro de grupo
    const disciples = await getDisciplesForStatistics(ctx, userId, args.groupId);

    // Contar por género
    let maleCount = 0;
    let femaleCount = 0;

    for (const disciple of disciples) {
      if (disciple.gender === "Male") {
        maleCount++;
      } else if (disciple.gender === "Female") {
        femaleCount++;
      }
    }

    return {
      male: maleCount,
      female: femaleCount,
    };
  },
});

/**
 * Query: Obtiene la distribución por edad de los discípulos
 */
export const getAgeDistribution = query({
  args: {
    groupId: v.optional(v.id("groups")),
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener discípulos según el filtro de grupo
    const disciples = await getDisciplesForStatistics(ctx, userId, args.groupId);

    // Inicializar contadores por rango de edad
    const ageRanges = {
      "-13": 0,
      "13-17": 0,
      "18-25": 0,
      "26-35": 0,
      "36-45": 0,
      "46-55": 0,
      "56+": 0,
    };

    // Calcular edad y agrupar por rango
    for (const disciple of disciples) {
      if (disciple.birthdate) {
        const age = calculateAge(disciple.birthdate);
        const range = getAgeRange(age);
        ageRanges[range as keyof typeof ageRanges]++;
      }
    }

    // Convertir a array para el gráfico
    return Object.entries(ageRanges).map(([range, count]) => ({
      range,
      count,
    }));
  },
});

/**
 * Query: Obtiene las tendencias de asistencia (nuevos y asistencias totales) por mes
 */
export const getAttendanceTrends = query({
  args: {
    groupId: v.optional(v.id("groups")),
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener IDs de usuarios (líder + discípulos)
    const userIds = await getUserIdsForStatistics(ctx, userId, args.groupId);

    // Calcular rango de fechas según el tipo de período
    const referenceDateObj = new Date(args.referenceDate);
    const { start: periodStart, end: periodEnd } = getPeriodRange(
      args.periodType,
      referenceDateObj
    );
    
    // Determinar cuántos meses mostrar según el período
    let monthsToShow: number;
    if (args.periodType === "year") {
      monthsToShow = 12;
    } else if (args.periodType === "quarter") {
      monthsToShow = 4;
    } else if (args.periodType === "month") {
      monthsToShow = 6; // Mostrar últimos 6 meses
    } else {
      monthsToShow = 1; // Semana: mostrar solo el mes actual
    }
    
    // Para semana y mes, ajustar el inicio para mostrar el período histórico
    let adjustedStart = periodStart;
    if (args.periodType === "month" || args.periodType === "week") {
      const startDate = new Date(periodEnd);
      startDate.setMonth(startDate.getMonth() - (monthsToShow - 1));
      adjustedStart = getMonthStart(startDate.getTime());
    } else if (args.periodType === "quarter") {
      const startDate = new Date(periodEnd);
      startDate.setMonth(startDate.getMonth() - (monthsToShow - 1));
      adjustedStart = getQuarterStart(startDate.getTime());
    }

    // Obtener todos los registros de los usuarios en el rango de fechas
    const allRecords = await Promise.all(
      userIds.map(async (uid) => {
        const records = await ctx.db
          .query("attendanceRecords")
          .withIndex("userId", (q) => q.eq("userId", uid))
          .collect();
        return records.filter(
          (r) =>
            r.date >= adjustedStart &&
            r.date <= periodEnd &&
            (r.type === "nuevos" || r.type === "asistencias")
        );
      })
    );

    const records = allRecords.flat();


    // Agrupar por mes y servicio (solo para asistencias)
    const monthData = new Map<string, { 
      "saturday-1": number;
      "saturday-2": number;
      "sunday-1": number;
      "sunday-2": number;
    }>();

    // Inicializar todos los meses con 0 para cada servicio
    const startDate = new Date(adjustedStart);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth(); // 0-11
    
    for (let i = 0; i < monthsToShow; i++) {
      const currentDate = new Date(startYear, startMonth + i, 1);
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
      monthData.set(monthKey, {
        "saturday-1": 0,
        "saturday-2": 0,
        "sunday-1": 0,
        "sunday-2": 0,
      });
    }

    // Agrupar registros por mes y servicio (solo asistencias, no nuevos)
    for (const record of records) {
      // Solo procesar registros de tipo "asistencias" que tengan servicio
      if (record.type !== "asistencias" || !record.service) {
        continue;
      }

      const recordDate = new Date(record.date);
      const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, "0")}`;
      
      if (monthData.has(monthKey)) {
        // Calcular total: incluir al usuario si asistió
        let total = record.maleCount + record.femaleCount + (record.kidsCount || 0);
        if (record.attended) {
          total += 1;
        }
        
        // Agregar al servicio correspondiente
        const monthEntry = monthData.get(monthKey);
        if (monthEntry && record.service) {
          const serviceKey = record.service as "saturday-1" | "saturday-2" | "sunday-1" | "sunday-2";
          if (serviceKey in monthEntry) {
            monthEntry[serviceKey] += total;
          }
        }
      }
    }

    // Convertir a array y formatear nombres de meses
    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];

    const result = Array.from(monthData.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split("-");
        return {
          month: `${monthNames[parseInt(month) - 1]} ${year}`,
          "saturday-1": data["saturday-1"],
          "saturday-2": data["saturday-2"],
          "sunday-1": data["sunday-1"],
          "sunday-2": data["sunday-2"],
        };
      })
      .sort((a, b) => {
        // Ordenar por fecha
        const [aMonth, aYear] = a.month.split(" ");
        const [bMonth, bYear] = b.month.split(" ");
        const aIndex = monthNames.indexOf(aMonth);
        const bIndex = monthNames.indexOf(bMonth);
        if (aYear !== bYear) {
          return parseInt(aYear) - parseInt(bYear);
        }
        return aIndex - bIndex;
      });
    
    return result;
  },
});

/**
 * Query: Obtiene la distribución por servicio de los registros
 */
export const getServiceDistribution = query({
  args: {
    groupId: v.optional(v.id("groups")),
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener IDs de usuarios (líder + discípulos)
    const userIds = await getUserIdsForStatistics(ctx, userId, args.groupId);

    // Calcular rango de fechas según el tipo de período
    const referenceDateObj = new Date(args.referenceDate);
    const { start: periodStart, end: periodEnd } = getPeriodRange(
      args.periodType,
      referenceDateObj
    );

    // Obtener todos los registros de los usuarios en el rango de fechas
    const allRecords = await Promise.all(
      userIds.map(async (uid) => {
        const records = await ctx.db
          .query("attendanceRecords")
          .withIndex("userId", (q) => q.eq("userId", uid))
          .collect();
        return records.filter(
          (r) =>
            r.date >= periodStart &&
            r.date <= periodEnd &&
            (r.type === "nuevos" || r.type === "asistencias") &&
            r.service !== undefined
        );
      })
    );

    const records = allRecords.flat();

    // Contar por servicio
    const serviceCounts = {
      "saturday-1": 0,
      "saturday-2": 0,
      "sunday-1": 0,
      "sunday-2": 0,
    };

    for (const record of records) {
      if (record.service && record.service in serviceCounts) {
        const total = record.maleCount + record.femaleCount + (record.kidsCount || 0);
        serviceCounts[record.service as keyof typeof serviceCounts] += total;
      }
    }

    // Mapear códigos de servicio a nombres legibles
    const serviceNames: Record<string, string> = {
      "saturday-1": "Sábado NEXT 5PM",
      "saturday-2": "Sábado NEXT 7PM",
      "sunday-1": "Domingo 9AM",
      "sunday-2": "Domingo 11:30AM",
    };

    // Convertir a array para el gráfico
    return Object.entries(serviceCounts)
      .map(([service, count]) => ({
        service: serviceNames[service] || service,
        count,
      }))
      .sort((a, b) => {
        const order = [
          "Sábado NEXT 5PM",
          "Sábado NEXT 7PM",
          "Domingo 9AM",
          "Domingo 11:30AM",
        ];
        return order.indexOf(a.service) - order.indexOf(b.service);
      });
  },
});

/**
 * Query: Obtiene la participación en escuela de los discípulos
 */
export const getSchoolParticipation = query({
  args: {
    groupId: v.optional(v.id("groups")),
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener discípulos según el filtro de grupo
    const disciples = await getDisciplesForStatistics(ctx, userId, args.groupId);

    // Contar por estado de escuela
    let activeCount = 0;
    let inactiveCount = 0;

    for (const disciple of disciples) {
      if (disciple.isActiveInSchool) {
        activeCount++;
      } else {
        inactiveCount++;
      }
    }

    return {
      active: activeCount,
      inactive: inactiveCount,
    };
  },
});

/**
 * Query: Obtiene los cursos más populares (por inscripciones)
 */
export const getPopularCourses = query({
  args: {
    groupId: v.optional(v.id("groups")),
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener discípulos según el filtro de grupo
    const disciples = await getDisciplesForStatistics(ctx, userId, args.groupId);

    // Contar inscripciones por curso
    const courseCounts = new Map<Id<"courses">, number>();

    for (const disciple of disciples) {
      if (disciple.currentCourses && disciple.currentCourses.length > 0) {
        for (const courseId of disciple.currentCourses) {
          const currentCount = courseCounts.get(courseId) || 0;
          courseCounts.set(courseId, currentCount + 1);
        }
      }
    }

    // Obtener nombres de cursos
    const courseData = await Promise.all(
      Array.from(courseCounts.entries()).map(async ([courseId, count]) => {
        const course = await ctx.db.get(courseId);
        return {
          courseId,
          courseName: course?.name || "Curso desconocido",
          count,
        };
      })
    );

    // Ordenar por cantidad (más popular primero) y limitar
    const limit = args.limit || 10;
    const sortedCourses = courseData
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sortedCourses.map(({ courseName, count }) => ({
      courseName,
      count,
    }));
  },
});
