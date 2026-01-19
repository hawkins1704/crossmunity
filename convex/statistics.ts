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
    month: v.optional(v.number()),
    year: v.optional(v.number()),
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
    month: v.optional(v.number()),
    year: v.optional(v.number()),
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
    month: v.optional(v.number()),
    year: v.optional(v.number()),
    viewMode: v.optional(v.union(v.literal("month"), v.literal("year"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener IDs de usuarios (líder + discípulos)
    const userIds = await getUserIdsForStatistics(ctx, userId, args.groupId);

    // Calcular rango de fechas según el modo de vista
    let periodStart: number;
    let periodEnd: number;
    let monthsToShow: number;

    if (args.viewMode === "year" || !args.month) {
      // Modo año: mostrar últimos 12 meses desde el año seleccionado
      const year = args.year || new Date().getFullYear();
      periodStart = getYearStart(year);
      periodEnd = getYearEnd(year);
      monthsToShow = 12;
    } else {
      // Modo mes: mostrar últimos 6 meses desde el mes seleccionado
      const month = args.month;
      const year = args.year || new Date().getFullYear();
      periodEnd = getMonthEnd(new Date(year, month - 1, 1).getTime());
      // Calcular inicio 6 meses antes
      const startDate = new Date(year, month - 1, 1);
      startDate.setMonth(startDate.getMonth() - 5); // 6 meses incluyendo el actual
      periodStart = getMonthStart(startDate.getTime());
      monthsToShow = 6;
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
            r.date >= periodStart &&
            r.date <= periodEnd &&
            (r.type === "nuevos" || r.type === "asistencias")
        );
      })
    );

    const records = allRecords.flat();

    // Agrupar por mes
    const monthData = new Map<string, { nuevos: number; asistencias: number }>();

    // Inicializar todos los meses con 0
    const start = new Date(periodStart);
    for (let i = 0; i < monthsToShow; i++) {
      const currentMonth = new Date(start);
      currentMonth.setMonth(start.getMonth() + i);
      const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
      monthData.set(monthKey, { nuevos: 0, asistencias: 0 });
    }

    // Agrupar registros por mes
    for (const record of records) {
      const recordDate = new Date(record.date);
      const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, "0")}`;
      
      if (monthData.has(monthKey)) {
        // Para asistencias, incluir al usuario si asistió
        let total = record.maleCount + record.femaleCount + (record.kidsCount || 0);
        if (record.type === "asistencias" && record.attended) {
          total += 1;
        }
        
        if (record.type === "nuevos") {
          monthData.get(monthKey)!.nuevos += total;
        } else if (record.type === "asistencias") {
          monthData.get(monthKey)!.asistencias += total;
        }
      }
    }

    // Convertir a array y formatear nombres de meses
    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];

    return Array.from(monthData.entries())
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split("-");
        return {
          month: `${monthNames[parseInt(month) - 1]} ${year}`,
          nuevos: data.nuevos,
          asistencias: data.asistencias,
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
  },
});

/**
 * Query: Obtiene la distribución por servicio de los registros
 */
export const getServiceDistribution = query({
  args: {
    groupId: v.optional(v.id("groups")),
    month: v.optional(v.number()),
    year: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Obtener IDs de usuarios (líder + discípulos)
    const userIds = await getUserIdsForStatistics(ctx, userId, args.groupId);

    // Calcular rango de fechas
    let periodStart: number;
    let periodEnd: number;

    if (args.month !== undefined && args.year !== undefined) {
      periodStart = getMonthStart(
        new Date(args.year, args.month - 1, 1).getTime()
      );
      periodEnd = getMonthEnd(
        new Date(args.year, args.month - 1, 1).getTime()
      );
    } else if (args.year !== undefined) {
      periodStart = getYearStart(args.year);
      periodEnd = getYearEnd(args.year);
    } else {
      // Si no se especifica período, usar año actual
      const currentYear = new Date().getFullYear();
      periodStart = getYearStart(currentYear);
      periodEnd = getYearEnd(currentYear);
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
    month: v.optional(v.number()),
    year: v.optional(v.number()),
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
    month: v.optional(v.number()),
    year: v.optional(v.number()),
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
