import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

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
 * El timestamp recibido del frontend representa medianoche UTC para la fecha calendario seleccionada.
 * Extraemos los componentes UTC y creamos una nueva fecha UTC a medianoche.
 * Esto asegura que la fecha se guarde correctamente independientemente de la zona horaria.
 */
function normalizeDate(timestamp: number): number {
  const date = new Date(timestamp);
  // Usar getUTCFullYear, getUTCMonth, getUTCDate ya que el timestamp es UTC
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  // Crear nueva fecha en UTC a medianoche
  return Date.UTC(year, month, day, 0, 0, 0, 0);
}

/**
 * Query: Obtiene los colíderes del sexo opuesto del usuario actual
 * Retorna los colíderes de todos los grupos donde el usuario es líder
 */
export const getCoLeaders = query({
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

    // Obtener todos los grupos donde el usuario es líder
    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((group) =>
      group.leaders.includes(userId)
    );

    // Obtener colíderes del sexo opuesto
    const coLeaders: Array<{
      _id: Id<"users">;
      name?: string;
      email?: string;
      gender: "Male" | "Female";
    }> = [];

    for (const group of userGroups) {
      if (group.leaders.length === 2) {
        // Hay un colíder, encontrar cuál no es el usuario actual
        const coLeaderId = group.leaders.find((id) => id !== userId);
        if (coLeaderId) {
          const coLeader = await ctx.db.get(coLeaderId);
          if (coLeader && coLeader.gender !== user.gender) {
            // Solo agregar si no está ya en la lista
            if (!coLeaders.find((c) => c._id === coLeader._id)) {
              coLeaders.push({
                _id: coLeader._id,
                name: coLeader.name,
                email: coLeader.email,
                gender: coLeader.gender,
              });
            }
          }
        }
      }
    }

    return coLeaders;
  },
});

/**
 * Mutation: Registra nuevos asistentes, asistencias, RESET o conferencia
 * Maneja la creación de registros separados para colíderes cuando hay personas del sexo opuesto
 */
export const recordAttendance = mutation({
  args: {
    date: v.number(), // Timestamp de la fecha
    type: v.union(
      v.literal("nuevos"),
      v.literal("asistencias"),
      v.literal("reset"),
      v.literal("conferencia")
    ),
    service: v.optional(
      v.union(
        v.literal("saturday-1"),
        v.literal("saturday-2"),
        v.literal("sunday-1"),
        v.literal("sunday-2")
      )
    ), // Solo para nuevos y asistencias
    attended: v.optional(v.boolean()), // Solo para asistencias y conferencia
    maleCount: v.number(), // Cantidad de hombres
    femaleCount: v.number(), // Cantidad de mujeres
    coLeaderId: v.optional(v.id("users")), // ID del colíder para asignar registros del sexo opuesto
    coLeaderAttended: v.optional(v.boolean()), // Si el colíder asistió (solo para asistencias y conferencia)
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

    // Normalizar fecha (solo fecha, sin hora)
    const normalizedDate = normalizeDate(args.date);

    // Validar que service esté presente solo para nuevos y asistencias
    if (
      (args.type === "nuevos" || args.type === "asistencias") &&
      !args.service
    ) {
      throw new Error("Debes seleccionar un servicio");
    }

    // Validar que attended esté presente solo para asistencias y conferencia
    if (
      (args.type === "asistencias" || args.type === "conferencia") &&
      args.attended === undefined
    ) {
      throw new Error("Debes indicar si asististe o no");
    }

    // Validar que los conteos sean no negativos
    if (args.maleCount < 0 || args.femaleCount < 0) {
      throw new Error("Las cantidades deben ser números no negativos");
    }

    // Permitir 0 personas solo si es asistencias o conferencia y el usuario o colíder asistió
    const canHaveZeroCount =
      (args.type === "asistencias" || args.type === "conferencia") &&
      (args.attended === true ||
        (args.coLeaderId && args.coLeaderAttended === true));

    // Validar que al menos haya una persona registrada (excepto cuando se permite 0)
    if (
      args.maleCount === 0 &&
      args.femaleCount === 0 &&
      !canHaveZeroCount
    ) {
      throw new Error("Debes registrar al menos una persona");
    }

    const recordIds: Id<"attendanceRecords">[] = [];

    // Determinar qué registros crear según el género del usuario y si hay colíder
    const oppositeGenderCount =
      user.gender === "Male" ? args.femaleCount : args.maleCount;
    const sameGenderCount =
      user.gender === "Male" ? args.maleCount : args.femaleCount;

    // Si hay personas del sexo opuesto y se proporcionó un colíder
    if (oppositeGenderCount > 0 && args.coLeaderId) {
      // Validar que el colíder existe y es del sexo opuesto
      const coLeader = await ctx.db.get(args.coLeaderId);
      if (!coLeader) {
        throw new Error("Colíder no encontrado");
      }

      // Verificar que el usuario tiene este colíder en sus grupos
      const allGroups = await ctx.db.query("groups").collect();
      const userGroups = allGroups.filter((group) =>
        group.leaders.includes(userId)
      );
      const hasCoLeader = userGroups.some(
        (group) =>
          group.leaders.length === 2 &&
          group.leaders.includes(args.coLeaderId!) &&
          group.leaders.includes(userId)
      );

      if (!hasCoLeader) {
        throw new Error("El colíder especificado no pertenece a tus grupos");
      }

      if (coLeader.gender === user.gender) {
        throw new Error("El colíder debe ser del sexo opuesto");
      }

      // Crear registro para el colíder con personas del sexo opuesto
      // Para asistencias y conferencia, usar coLeaderAttended si está disponible, sino usar attended
      const coLeaderAttendedValue =
        (args.type === "asistencias" || args.type === "conferencia") &&
        args.coLeaderAttended !== undefined
          ? args.coLeaderAttended
          : args.type === "asistencias" || args.type === "conferencia"
            ? args.attended
            : undefined;

      const coLeaderRecordId = await ctx.db.insert("attendanceRecords", {
        userId: args.coLeaderId,
        date: normalizedDate,
        type: args.type,
        service:
          args.type === "nuevos" || args.type === "asistencias"
            ? args.service
            : undefined,
        attended: coLeaderAttendedValue,
        maleCount: user.gender === "Male" ? 0 : oppositeGenderCount,
        femaleCount: user.gender === "Female" ? 0 : oppositeGenderCount,
      });
      recordIds.push(coLeaderRecordId);

      // Crear registro para el usuario con personas del mismo sexo (si hay)
      if (sameGenderCount > 0) {
        const userRecordId = await ctx.db.insert("attendanceRecords", {
          userId,
          date: normalizedDate,
          type: args.type,
          service:
            args.type === "nuevos" || args.type === "asistencias"
              ? args.service
              : undefined,
          attended:
            args.type === "asistencias" || args.type === "conferencia"
              ? args.attended
              : undefined,
          maleCount: user.gender === "Male" ? sameGenderCount : 0,
          femaleCount: user.gender === "Female" ? sameGenderCount : 0,
        });
        recordIds.push(userRecordId);
      }
    } else {
      // Crear registro normal para el usuario (sin colíder o sin personas del sexo opuesto)
      const userRecordId = await ctx.db.insert("attendanceRecords", {
        userId,
        date: normalizedDate,
        type: args.type,
        service:
          args.type === "nuevos" || args.type === "asistencias"
            ? args.service
            : undefined,
        attended:
          args.type === "asistencias" || args.type === "conferencia"
            ? args.attended
            : undefined,
        maleCount: args.maleCount,
        femaleCount: args.femaleCount,
      });
      recordIds.push(userRecordId);

      // Si hay un colíder y se proporciona coLeaderAttended (para asistencias/conferencia),
      // crear un registro para el colíder aunque no haya personas del sexo opuesto
      if (
        args.coLeaderId &&
        (args.type === "asistencias" || args.type === "conferencia") &&
        args.coLeaderAttended !== undefined
      ) {
        const user = await ctx.db.get(userId);
        if (!user) {
          throw new Error("Usuario no encontrado");
        }

        // Validar que el colíder existe y es del sexo opuesto
        const coLeader = await ctx.db.get(args.coLeaderId);
        if (!coLeader) {
          throw new Error("Colíder no encontrado");
        }

        // Verificar que el usuario tiene este colíder en sus grupos
        const allGroups = await ctx.db.query("groups").collect();
        const userGroups = allGroups.filter((group) =>
          group.leaders.includes(userId)
        );
        const hasCoLeader = userGroups.some(
          (group) =>
            group.leaders.length === 2 &&
            group.leaders.includes(args.coLeaderId!) &&
            group.leaders.includes(userId)
        );

        if (!hasCoLeader) {
          throw new Error("El colíder especificado no pertenece a tus grupos");
        }

        if (coLeader.gender === user.gender) {
          throw new Error("El colíder debe ser del sexo opuesto");
        }

        // Crear registro para el colíder sin personas (solo para registrar asistencia)
        const coLeaderRecordId = await ctx.db.insert("attendanceRecords", {
          userId: args.coLeaderId,
          date: normalizedDate,
          type: args.type,
          service:
            args.type === "asistencias" ? args.service : undefined,
          attended: args.coLeaderAttended,
          maleCount: 0,
          femaleCount: 0,
        });
        recordIds.push(coLeaderRecordId);
      }
    }

    return { recordIds };
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
      v.literal("nuevos"),
      v.literal("asistencias"),
      v.literal("reset"),
      v.literal("conferencia")
    ),
    service: v.optional(
      v.union(
        v.literal("saturday-1"),
        v.literal("saturday-2"),
        v.literal("sunday-1"),
        v.literal("sunday-2")
      )
    ), // Solo para nuevos y asistencias
    attended: v.optional(v.boolean()), // Solo para asistencias y conferencia
    maleCount: v.number(), // Cantidad de hombres
    femaleCount: v.number(), // Cantidad de mujeres
    coLeaderId: v.optional(v.id("users")), // ID del colíder (opcional)
    coLeaderAttended: v.optional(v.boolean()), // Si el colíder asistió (solo para asistencias y conferencia)
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

    // Validar que service esté presente solo para nuevos y asistencias
    if (
      (args.type === "nuevos" || args.type === "asistencias") &&
      !args.service
    ) {
      throw new Error("Debes seleccionar un servicio");
    }

    // Validar que attended esté presente solo para asistencias y conferencia
    if (
      (args.type === "asistencias" || args.type === "conferencia") &&
      args.attended === undefined
    ) {
      throw new Error("Debes indicar si asististe o no");
    }

    // Validar que los conteos sean no negativos
    if (args.maleCount < 0 || args.femaleCount < 0) {
      throw new Error("Las cantidades deben ser números no negativos");
    }

    // Permitir 0 personas solo si es asistencias o conferencia y el usuario o colíder asistió
    const canHaveZeroCount =
      (args.type === "asistencias" || args.type === "conferencia") &&
      (args.attended === true ||
        (args.coLeaderId && args.coLeaderAttended === true));

    // Validar que al menos haya una persona registrada (excepto cuando se permite 0)
    if (
      args.maleCount === 0 &&
      args.femaleCount === 0 &&
      !canHaveZeroCount
    ) {
      throw new Error("Debes registrar al menos una persona");
    }

    // Actualizar registro
    await ctx.db.patch(args.recordId, {
      date: normalizedDate,
      type: args.type,
      service:
        args.type === "nuevos" || args.type === "asistencias"
          ? args.service
          : undefined,
      attended:
        args.type === "asistencias" || args.type === "conferencia"
          ? args.attended
          : undefined,
      maleCount: args.maleCount,
      femaleCount: args.femaleCount,
    });

    // Si se proporciona información del colíder para asistencias o conferencia
    if (
      args.coLeaderId &&
      args.coLeaderAttended !== undefined &&
      (args.type === "asistencias" || args.type === "conferencia")
    ) {
      const user = await ctx.db.get(userId);
      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      // Validar que el colíder existe y es del sexo opuesto
      const coLeader = await ctx.db.get(args.coLeaderId);
      if (!coLeader) {
        throw new Error("Colíder no encontrado");
      }

      // Verificar que el usuario tiene este colíder en sus grupos
      const allGroups = await ctx.db.query("groups").collect();
      const userGroups = allGroups.filter((group) =>
        group.leaders.includes(userId)
      );
      const hasCoLeader = userGroups.some(
        (group) =>
          group.leaders.length === 2 &&
          group.leaders.includes(args.coLeaderId!) &&
          group.leaders.includes(userId)
      );

      if (!hasCoLeader) {
        throw new Error("El colíder especificado no pertenece a tus grupos");
      }

      if (coLeader.gender === user.gender) {
        throw new Error("El colíder debe ser del sexo opuesto");
      }

      // Determinar qué personas van al colíder (personas del género opuesto)
      const oppositeGenderCount =
        user.gender === "Male" ? args.femaleCount : args.maleCount;

      // Buscar registro del colíder para la misma fecha y tipo
      const coLeaderRecords = await ctx.db
        .query("attendanceRecords")
        .withIndex("userId", (q) => q.eq("userId", args.coLeaderId!))
        .collect();

      const coLeaderRecord = coLeaderRecords.find(
        (r) =>
          normalizeDate(r.date) === normalizedDate && r.type === args.type
      );

      if (coLeaderRecord) {
        // Actualizar registro existente del colíder
        await ctx.db.patch(coLeaderRecord._id, {
          attended: args.coLeaderAttended,
          // Mantener las cantidades existentes (solo actualizamos attended)
        });
      } else if (oppositeGenderCount > 0) {
        // Crear nuevo registro para el colíder si hay personas del género opuesto
        // Solo para asistencias y conferencia (ya estamos dentro de ese bloque if)
        const service = args.type === "asistencias" ? args.service : undefined;
        await ctx.db.insert("attendanceRecords", {
          userId: args.coLeaderId!,
          date: normalizedDate,
          type: args.type,
          service,
          attended: args.coLeaderAttended,
          maleCount: user.gender === "Male" ? 0 : oppositeGenderCount,
          femaleCount: user.gender === "Female" ? 0 : oppositeGenderCount,
        });
      }
    }

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
        v.literal("nuevos"),
        v.literal("asistencias"),
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

    // Verificar que el usuario solicitado sea discípulo en alguno de los grupos del líder
    const disciple = await ctx.db.get(args.userId);
    if (!disciple) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar si el discípulo pertenece a alguno de los grupos del usuario actual
    const isDiscipleInUserGroups = userGroups.some((group) =>
      group.disciples.includes(args.userId)
    );

    if (!isDiscipleInUserGroups) {
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

    // Helper para calcular total de personas en un registro (incluyendo al usuario si asistió)
    const getRecordTotal = (record: typeof periodRecords[0]): number => {
      // Para asistencias y conferencia, incluir al usuario si asistió
      if (
        (record.type === "asistencias" || record.type === "conferencia") &&
        record.attended
      ) {
        return 1 + record.maleCount + record.femaleCount;
      }
      // Para nuevos y reset, solo contar las personas registradas
      return record.maleCount + record.femaleCount;
    };

    // Calcular totales por tipo
    const report = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        records: periodRecords.filter((r) => r.type === "nuevos"),
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        records: periodRecords.filter((r) => r.type === "asistencias"),
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

    // Obtener información del usuario para conocer su género
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Sumar totales y género para nuevos
    report.nuevos.records.forEach((r) => {
      const total = r.maleCount + r.femaleCount;
      report.nuevos.total += total;
      report.nuevos.male += r.maleCount;
      report.nuevos.female += r.femaleCount;
    });

    // Sumar totales y género para asistencias
    report.asistencias.records.forEach((r) => {
      const total = getRecordTotal(r);
      report.asistencias.total += total;
      // Para asistencias, si el usuario asistió, contar según su género
      if (r.attended) {
        if (user.gender === "Male") {
          report.asistencias.male += 1 + r.maleCount;
          report.asistencias.female += r.femaleCount;
        } else {
          report.asistencias.male += r.maleCount;
          report.asistencias.female += 1 + r.femaleCount;
        }
      } else {
        report.asistencias.male += r.maleCount;
        report.asistencias.female += r.femaleCount;
      }
    });

    // Sumar totales y género para reset
    report.reset.records.forEach((r) => {
      const total = r.maleCount + r.femaleCount;
      report.reset.total += total;
      report.reset.male += r.maleCount;
      report.reset.female += r.femaleCount;
    });

    // Sumar totales y género para conferencia
    report.conferencia.records.forEach((r) => {
      const total = getRecordTotal(r);
      report.conferencia.total += total;
      // Para conferencia, si el usuario asistió, contar según su género
      if (r.attended) {
        if (user.gender === "Male") {
          report.conferencia.male += 1 + r.maleCount;
          report.conferencia.female += r.femaleCount;
        } else {
          report.conferencia.male += r.maleCount;
          report.conferencia.female += 1 + r.femaleCount;
        }
      } else {
        report.conferencia.male += r.maleCount;
        report.conferencia.female += r.femaleCount;
      }
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
    groupId: v.optional(v.id("groups")), // ID del grupo para filtrar, opcional. Si no se proporciona, muestra todos los grupos
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
        if (
          (record.type === "asistencias" || record.type === "conferencia") &&
          record.attended
        ) {
          return 1 + record.maleCount + record.femaleCount;
        }
        return record.maleCount + record.femaleCount;
      };

      const myReport = {
        nuevos: {
          total: 0,
          male: 0,
          female: 0,
          records: periodRecords.filter((r) => r.type === "nuevos"),
        },
        asistencias: {
          total: 0,
          male: 0,
          female: 0,
          records: periodRecords.filter((r) => r.type === "asistencias"),
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

      // Sumar totales para nuevos
      myReport.nuevos.records.forEach((r) => {
        myReport.nuevos.total += r.maleCount + r.femaleCount;
        myReport.nuevos.male += r.maleCount;
        myReport.nuevos.female += r.femaleCount;
      });

      // Sumar totales para asistencias
      myReport.asistencias.records.forEach((r) => {
        const total = getRecordTotal(r);
        myReport.asistencias.total += total;
        if (r.attended) {
          if (user.gender === "Male") {
            myReport.asistencias.male += 1 + r.maleCount;
            myReport.asistencias.female += r.femaleCount;
          } else {
            myReport.asistencias.male += r.maleCount;
            myReport.asistencias.female += 1 + r.femaleCount;
          }
        } else {
          myReport.asistencias.male += r.maleCount;
          myReport.asistencias.female += r.femaleCount;
        }
      });

      // Sumar totales para reset
      myReport.reset.records.forEach((r) => {
        myReport.reset.total += r.maleCount + r.femaleCount;
        myReport.reset.male += r.maleCount;
        myReport.reset.female += r.femaleCount;
      });

      // Sumar totales para conferencia
      myReport.conferencia.records.forEach((r) => {
        const total = getRecordTotal(r);
        myReport.conferencia.total += total;
        if (r.attended) {
          if (user.gender === "Male") {
            myReport.conferencia.male += 1 + r.maleCount;
            myReport.conferencia.female += r.femaleCount;
          } else {
            myReport.conferencia.male += r.maleCount;
            myReport.conferencia.female += 1 + r.femaleCount;
          }
        } else {
          myReport.conferencia.male += r.maleCount;
          myReport.conferencia.female += r.femaleCount;
        }
      });

      return {
        isLeader: false,
        myReport,
        groupReport: null,
      };
    }

    // Obtener todos los discípulos de los grupos del usuario
    let allDisciples: Array<{
      _id: Id<"users">;
      name?: string;
      email?: string;
      gender: "Male" | "Female";
      leader?: Id<"users">;
    }>;

    // Si se especifica un grupo, obtener discípulos directamente del grupo
    if (args.groupId !== undefined) {
      // Verificar que el grupo pertenezca al usuario
      const selectedGroup = userGroups.find((g) => g._id === args.groupId);
      if (!selectedGroup) {
        throw new Error("El grupo especificado no pertenece a tus grupos");
      }
      // Obtener los discípulos directamente del grupo
      const groupDisciples = await Promise.all(
        selectedGroup.disciples.map((discipleId) => ctx.db.get(discipleId))
      );
      allDisciples = groupDisciples.filter(
        (disciple): disciple is NonNullable<typeof disciple> => disciple !== null
      );
    } else {
      // Si no se especifica grupo, obtener todos los discípulos del usuario
      allDisciples = await ctx.db
        .query("users")
        .withIndex("leader", (q) => q.eq("leader", userId))
        .collect();
    }

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
      if (
        (record.type === "asistencias" || record.type === "conferencia") &&
        record.attended
      ) {
        return 1 + record.maleCount + record.femaleCount;
      }
      return record.maleCount + record.femaleCount;
    };

    // Helper para calcular total de personas en un registro de discípulo
    const getDiscipleRecordTotal = (record: typeof disciplePeriodRecords[0]): number => {
      if (
        (record.type === "asistencias" || record.type === "conferencia") &&
        record.attended
      ) {
        return 1 + record.maleCount + record.femaleCount;
      }
      return record.maleCount + record.femaleCount;
    };

    // Calcular reporte propio
    const myReport = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        records: myPeriodRecords.filter((r) => r.type === "nuevos"),
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        records: myPeriodRecords.filter((r) => r.type === "asistencias"),
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

    // Sumar totales para nuevos propios
    myReport.nuevos.records.forEach((r) => {
      myReport.nuevos.total += r.maleCount + r.femaleCount;
      myReport.nuevos.male += r.maleCount;
      myReport.nuevos.female += r.femaleCount;
    });

    // Sumar totales para asistencias propias
    myReport.asistencias.records.forEach((r) => {
      const total = getRecordTotal(r);
      myReport.asistencias.total += total;
      if (r.attended) {
        if (user.gender === "Male") {
          myReport.asistencias.male += 1 + r.maleCount;
          myReport.asistencias.female += r.femaleCount;
        } else {
          myReport.asistencias.male += r.maleCount;
          myReport.asistencias.female += 1 + r.femaleCount;
        }
      } else {
        myReport.asistencias.male += r.maleCount;
        myReport.asistencias.female += r.femaleCount;
      }
    });

    // Sumar totales para reset propios
    myReport.reset.records.forEach((r) => {
      myReport.reset.total += r.maleCount + r.femaleCount;
      myReport.reset.male += r.maleCount;
      myReport.reset.female += r.femaleCount;
    });

    // Sumar totales para conferencia propias
    myReport.conferencia.records.forEach((r) => {
      const total = getRecordTotal(r);
      myReport.conferencia.total += total;
      if (r.attended) {
        if (user.gender === "Male") {
          myReport.conferencia.male += 1 + r.maleCount;
          myReport.conferencia.female += r.femaleCount;
        } else {
          myReport.conferencia.male += r.maleCount;
          myReport.conferencia.female += 1 + r.femaleCount;
        }
      } else {
        myReport.conferencia.male += r.maleCount;
        myReport.conferencia.female += r.femaleCount;
      }
    });

    // Calcular reporte de discípulos
    const disciplesReport = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        records: disciplePeriodRecords.filter((r) => r.type === "nuevos"),
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        records: disciplePeriodRecords.filter(
          (r) => r.type === "asistencias"
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
        records: disciplePeriodRecords.filter(
          (r) => r.type === "conferencia"
        ),
      },
    };

    // Sumar totales para nuevos de discípulos
    disciplesReport.nuevos.records.forEach((r) => {
      disciplesReport.nuevos.total += r.maleCount + r.femaleCount;
      disciplesReport.nuevos.male += r.maleCount;
      disciplesReport.nuevos.female += r.femaleCount;
    });

    // Sumar totales para asistencias de discípulos
    disciplesReport.asistencias.records.forEach((r) => {
      const total = getDiscipleRecordTotal(r);
      disciplesReport.asistencias.total += total;
      const discipleGender = discipleGenderMap.get(r.userId);
      if (r.attended) {
        if (discipleGender === "Male") {
          disciplesReport.asistencias.male += 1 + r.maleCount;
          disciplesReport.asistencias.female += r.femaleCount;
        } else {
          disciplesReport.asistencias.male += r.maleCount;
          disciplesReport.asistencias.female += 1 + r.femaleCount;
        }
      } else {
        disciplesReport.asistencias.male += r.maleCount;
        disciplesReport.asistencias.female += r.femaleCount;
      }
    });

    // Sumar totales para reset de discípulos
    disciplesReport.reset.records.forEach((r) => {
      disciplesReport.reset.total += r.maleCount + r.femaleCount;
      disciplesReport.reset.male += r.maleCount;
      disciplesReport.reset.female += r.femaleCount;
    });

    // Sumar totales para conferencia de discípulos
    disciplesReport.conferencia.records.forEach((r) => {
      const total = getDiscipleRecordTotal(r);
      disciplesReport.conferencia.total += total;
      const discipleGender = discipleGenderMap.get(r.userId);
      if (r.attended) {
        if (discipleGender === "Male") {
          disciplesReport.conferencia.male += 1 + r.maleCount;
          disciplesReport.conferencia.female += r.femaleCount;
        } else {
          disciplesReport.conferencia.male += r.maleCount;
          disciplesReport.conferencia.female += 1 + r.femaleCount;
        }
      } else {
        disciplesReport.conferencia.male += r.maleCount;
        disciplesReport.conferencia.female += r.femaleCount;
      }
    });

    // Calcular totales combinados
    // El total solo incluye los discípulos filtrados, SIN incluir los registros del líder
    const groupReport = {
      nuevos: {
        total: disciplesReport.nuevos.total, // Solo discípulos filtrados
        myTotal: myReport.nuevos.total,
        disciplesTotal: disciplesReport.nuevos.total,
        male: disciplesReport.nuevos.male, // Solo discípulos filtrados
        female: disciplesReport.nuevos.female, // Solo discípulos filtrados
        myMale: myReport.nuevos.male,
        myFemale: myReport.nuevos.female,
        disciplesMale: disciplesReport.nuevos.male,
        disciplesFemale: disciplesReport.nuevos.female,
      },
      asistencias: {
        total: disciplesReport.asistencias.total, // Solo discípulos filtrados
        myTotal: myReport.asistencias.total,
        disciplesTotal: disciplesReport.asistencias.total,
        male: disciplesReport.asistencias.male, // Solo discípulos filtrados
        female: disciplesReport.asistencias.female, // Solo discípulos filtrados
        myMale: myReport.asistencias.male,
        myFemale: myReport.asistencias.female,
        disciplesMale: disciplesReport.asistencias.male,
        disciplesFemale: disciplesReport.asistencias.female,
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

