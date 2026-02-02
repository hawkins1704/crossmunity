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
 * Helper: Obtiene el inicio de la semana (lunes) para una fecha dada
 * Retorna el lunes de la semana actual hasta hoy
 */
function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que lunes sea 0
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
  const month = date.getMonth(); // 0-11
  
  let quarterStartMonth: number;
  if (month >= 0 && month <= 3) {
    // Enero-Abril (meses 0-3)
    quarterStartMonth = 0; // Enero
  } else if (month >= 4 && month <= 7) {
    // Mayo-Agosto (meses 4-7)
    quarterStartMonth = 4; // Mayo
  } else {
    // Septiembre-Diciembre (meses 8-11)
    quarterStartMonth = 8; // Septiembre
  }
  
  return new Date(year, quarterStartMonth, 1).getTime();
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
    // Nota: El índice "leaders" busca por array completo, no por elemento individual.
    // Esto requiere obtener todos los grupos y filtrar en memoria.
    // Una optimización futura sería cambiar la estructura o agregar un índice diferente.
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
    sede: v.optional(v.union(
      v.literal("CENTRAL"),
      v.literal("LINCE"),
      v.literal("LOS OLIVOS"),
      v.literal("SJM"),
      v.literal("VMT"),
      v.literal("PACHACAMAC"),
      v.literal("SJL"),
      v.literal("CHORRILLOS"),
      v.literal("SURCO"),
      v.literal("MIRAFLORES"),
      v.literal("VES")
    )), // Sede donde se realizó el registro
    attended: v.optional(v.boolean()), // Solo para asistencias y conferencia
    maleCount: v.number(), // Cantidad de hombres
    femaleCount: v.number(), // Cantidad de mujeres
    kidsCount: v.number(), // Cantidad de niños
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
    if (args.maleCount < 0 || args.femaleCount < 0 || args.kidsCount < 0) {
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
      args.kidsCount === 0 &&
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
        sede: args.sede,
        attended: coLeaderAttendedValue,
        maleCount: user.gender === "Male" ? 0 : oppositeGenderCount,
        femaleCount: user.gender === "Female" ? 0 : oppositeGenderCount,
        kidsCount: args.kidsCount, // Los niños se asignan al colíder también
      });
      recordIds.push(coLeaderRecordId);

      // Crear registro para el usuario con personas del mismo sexo (si hay)
      if (sameGenderCount > 0 || args.kidsCount > 0) {
        const userRecordId = await ctx.db.insert("attendanceRecords", {
          userId,
          date: normalizedDate,
          type: args.type,
          service:
            args.type === "nuevos" || args.type === "asistencias"
              ? args.service
              : undefined,
          sede: args.sede,
          attended:
            args.type === "asistencias" || args.type === "conferencia"
              ? args.attended
              : undefined,
          maleCount: user.gender === "Male" ? sameGenderCount : 0,
          femaleCount: user.gender === "Female" ? sameGenderCount : 0,
          kidsCount: args.kidsCount, // Los niños se asignan también al usuario
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
        sede: args.sede,
        attended:
          args.type === "asistencias" || args.type === "conferencia"
            ? args.attended
            : undefined,
        maleCount: args.maleCount,
        femaleCount: args.femaleCount,
        kidsCount: args.kidsCount,
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
          sede: args.sede,
          attended: args.coLeaderAttended,
          maleCount: 0,
          femaleCount: 0,
          kidsCount: 0,
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
    sede: v.optional(v.union(
      v.literal("CENTRAL"),
      v.literal("LINCE"),
      v.literal("LOS OLIVOS"),
      v.literal("SJM"),
      v.literal("VMT"),
      v.literal("PACHACAMAC"),
      v.literal("SJL"),
      v.literal("CHORRILLOS"),
      v.literal("SURCO"),
      v.literal("MIRAFLORES"),
      v.literal("VES")
    )), // Sede donde se realizó el registro
    attended: v.optional(v.boolean()), // Solo para asistencias y conferencia
    maleCount: v.number(), // Cantidad de hombres
    femaleCount: v.number(), // Cantidad de mujeres
    kidsCount: v.number(), // Cantidad de niños
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
    if (args.maleCount < 0 || args.femaleCount < 0 || args.kidsCount < 0) {
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
      args.kidsCount === 0 &&
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
      sede: args.sede,
      attended:
        args.type === "asistencias" || args.type === "conferencia"
          ? args.attended
          : undefined,
      maleCount: args.maleCount,
      femaleCount: args.femaleCount,
      kidsCount: args.kidsCount,
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
      // Optimización: Usar índice userId_type si fuera necesario, pero por ahora
      // filtramos en memoria ya que necesitamos filtrar por fecha también
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
          sede: args.sede,
          attended: args.coLeaderAttended,
          maleCount: user.gender === "Male" ? 0 : oppositeGenderCount,
          femaleCount: user.gender === "Female" ? 0 : oppositeGenderCount,
          kidsCount: args.kidsCount,
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

    // Optimización: Usar el índice más específico disponible
    // Si se especifica tipo, usar userId_type; si no, usar userId
    let records;
    if (args.type) {
      // Usar índice userId_type para filtrar por tipo directamente
      records = await ctx.db
        .query("attendanceRecords")
        .withIndex("userId_type", (q) =>
          q.eq("userId", userId).eq("type", args.type!)
        )
        .collect();
    } else {
      // Usar índice userId si no se especifica tipo
      records = await ctx.db
        .query("attendanceRecords")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .collect();
    }

    // Filtrar por mes y año si se especifican
    // Nota: Filtrar en memoria es necesario porque Convex no soporta range queries
    // directamente en índices. El índice userId_date solo permite igualdad exacta.
    // El índice userId_date_type también requiere valores exactos para date.
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
    // Nota: Optimización limitada por el índice "leaders" que busca por array completo
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
 * Helper: Calcula el rango de fechas según el tipo de período
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
      // Si el mes de referencia es el mes actual, usar hasta hoy. Si es pasado, usar hasta fin de mes.
      if (timestamp <= todayTimestamp && referenceDate.getMonth() === today.getMonth() && referenceDate.getFullYear() === today.getFullYear()) {
        return {
          start: monthStart,
          end: getWeekEnd(todayTimestamp), // Hasta hoy
        };
      } else {
        return {
          start: monthStart,
          end: monthEnd, // Hasta fin de mes
        };
      }
    }
    case "quarter": {
      const quarterStart = getQuarterStart(timestamp);
      // Calcular fin del cuatrimestre
      const refMonth = referenceDate.getMonth();
      let quarterEndMonth: number;
      if (refMonth >= 0 && refMonth <= 3) {
        quarterEndMonth = 3; // Abril
      } else if (refMonth >= 4 && refMonth <= 7) {
        quarterEndMonth = 7; // Agosto
      } else {
        quarterEndMonth = 11; // Diciembre
      }
      const quarterEnd = new Date(referenceDate.getFullYear(), quarterEndMonth + 1, 0, 23, 59, 59, 999).getTime();
      
      // Si el cuatrimestre de referencia es el actual, usar hasta hoy
      const currentQuarter = Math.floor(today.getMonth() / 4);
      const refQuarter = Math.floor(refMonth / 4);
      if (timestamp <= todayTimestamp && referenceDate.getFullYear() === today.getFullYear() && refQuarter === currentQuarter) {
        return {
          start: quarterStart,
          end: getWeekEnd(todayTimestamp), // Hasta hoy
        };
      } else {
        return {
          start: quarterStart,
          end: quarterEnd, // Hasta fin de cuatrimestre
        };
      }
    }
    case "year": {
      const yearStart = getYearStart(referenceDate.getFullYear());
      const yearEnd = getYearEnd(referenceDate.getFullYear());
      // Si el año de referencia es el año actual, usar hasta hoy
      if (referenceDate.getFullYear() === today.getFullYear()) {
        return {
          start: yearStart,
          end: getWeekEnd(todayTimestamp), // Hasta hoy
        };
      } else {
        return {
          start: yearStart,
          end: yearEnd, // Hasta fin de año
        };
      }
    }
  }
}

/**
 * Helper: Calcula el período anterior para comparación
 */
function getPreviousPeriodRange(
  periodType: "week" | "month" | "quarter" | "year",
  referenceDate: Date
): { start: number; end: number } {
  const timestamp = referenceDate.getTime();
  
  switch (periodType) {
    case "week": {
      // Semana anterior: 7 días antes
      const prevWeekDate = new Date(timestamp);
      prevWeekDate.setDate(prevWeekDate.getDate() - 7);
      return {
        start: getWeekStart(prevWeekDate.getTime()),
        end: getWeekEnd(prevWeekDate.getTime()),
      };
    }
    case "month": {
      // Mes anterior
      const prevMonthDate = new Date(referenceDate);
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      return {
        start: getMonthStart(prevMonthDate.getTime()),
        end: getMonthEnd(prevMonthDate.getTime()),
      };
    }
    case "quarter": {
      // Cuatrimestre anterior: 4 meses antes
      const prevQuarterDate = new Date(referenceDate);
      prevQuarterDate.setMonth(prevQuarterDate.getMonth() - 4);
      return {
        start: getQuarterStart(prevQuarterDate.getTime()),
        end: getWeekEnd(prevQuarterDate.getTime()),
      };
    }
    case "year": {
      // Año anterior
      const prevYear = referenceDate.getFullYear() - 1;
      return {
        start: getYearStart(prevYear),
        end: getWeekEnd(new Date(prevYear, 11, 31).getTime()),
      };
    }
  }
}

/**
 * Query: Obtiene el reporte del período seleccionado del usuario actual
 * Retorna totales agrupados por tipo para el período especificado
 */
export const getMyMonthlyReport = query({
  args: {
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(), // Timestamp de la fecha de referencia
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const referenceDate = new Date(args.referenceDate);
    const { start: periodStart, end: periodEnd } = getPeriodRange(
      args.periodType,
      referenceDate
    );
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(
      args.periodType,
      referenceDate
    );

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
        return 1 + record.maleCount + record.femaleCount + (record.kidsCount || 0);
      }
      // Para nuevos y reset, solo contar las personas registradas
      return record.maleCount + record.femaleCount + (record.kidsCount || 0);
    };

    // Obtener información del usuario para conocer su género
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Calcular totales por tipo - optimizado: una sola iteración sobre los registros
    const report = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof periodRecords,
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof periodRecords,
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof periodRecords,
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof periodRecords,
      },
    };

    // Una sola iteración sobre todos los registros para calcular totales
    for (const r of periodRecords) {
      const reportType = report[r.type];
      if (!reportType) continue;

      reportType.records.push(r);

      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        reportType.total += total;
        reportType.male += r.maleCount;
        reportType.female += r.femaleCount;
        reportType.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getRecordTotal(r);
        reportType.total += total;
        // Si el usuario asistió, contar según su género
        if (r.attended) {
          if (user.gender === "Male") {
            reportType.male += 1 + r.maleCount;
            reportType.female += r.femaleCount;
          } else {
            reportType.male += r.maleCount;
            reportType.female += 1 + r.femaleCount;
          }
        } else {
          reportType.male += r.maleCount;
          reportType.female += r.femaleCount;
        }
        reportType.kids += r.kidsCount || 0;
      }
    }

    // Calcular reporte del período anterior para comparación
    const prevPeriodRecords = allRecords.filter(
      (r) => r.date >= prevStart && r.date <= prevEnd
    );

    const prevReport = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
    };

    for (const r of prevPeriodRecords) {
      const reportType = prevReport[r.type];
      if (!reportType) continue;

      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        reportType.total += total;
        reportType.male += r.maleCount;
        reportType.female += r.femaleCount;
        reportType.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getRecordTotal(r);
        reportType.total += total;
        if (r.attended) {
          if (user.gender === "Male") {
            reportType.male += 1 + r.maleCount;
            reportType.female += r.femaleCount;
          } else {
            reportType.male += r.maleCount;
            reportType.female += 1 + r.femaleCount;
          }
        } else {
          reportType.male += r.maleCount;
          reportType.female += r.femaleCount;
        }
        reportType.kids += r.kidsCount || 0;
      }
    }

    return {
      current: report,
      previous: prevReport,
      periodStart,
      periodEnd,
    };
  },
});

/**
 * Query: Obtiene el reporte individual de un discípulo específico
 * Similar a getMyMonthlyReport pero para cualquier discípulo (requiere que el usuario sea líder del discípulo)
 */
export const getDiscipleAttendanceReport = query({
  args: {
    discipleId: v.id("users"), // ID del discípulo
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(), // Timestamp de la fecha de referencia
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario sea líder del discípulo
    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((group) =>
      group.leaders.includes(userId)
    );
    
    const isDiscipleInUserGroups = userGroups.some((group) =>
      group.disciples.includes(args.discipleId)
    );

    if (!isDiscipleInUserGroups) {
      throw new Error("No tienes permiso para ver los datos de este discípulo");
    }

    const referenceDate = new Date(args.referenceDate);
    const { start: periodStart, end: periodEnd } = getPeriodRange(
      args.periodType,
      referenceDate
    );
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(
      args.periodType,
      referenceDate
    );

    // Obtener todos los registros del discípulo
    const allRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", args.discipleId))
      .collect();

    const periodRecords = allRecords.filter(
      (r) => r.date >= periodStart && r.date <= periodEnd
    );

    // Obtener información del discípulo para conocer su género
    const disciple = await ctx.db.get(args.discipleId);
    if (!disciple) {
      throw new Error("Discípulo no encontrado");
    }

    // Helper para calcular total de personas en un registro (incluyendo al discípulo si asistió)
    const getRecordTotal = (record: typeof periodRecords[0]): number => {
      // Para asistencias y conferencia, incluir al discípulo si asistió
      if (
        (record.type === "asistencias" || record.type === "conferencia") &&
        record.attended
      ) {
        return 1 + record.maleCount + record.femaleCount + (record.kidsCount || 0);
      }
      // Para nuevos y reset, solo contar las personas registradas
      return record.maleCount + record.femaleCount + (record.kidsCount || 0);
    };

    // Calcular totales por tipo
    const report = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
    };

    // Una sola iteración sobre todos los registros para calcular totales
    for (const r of periodRecords) {
      const reportType = report[r.type];
      if (!reportType) continue;

      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        reportType.total += total;
        reportType.male += r.maleCount;
        reportType.female += r.femaleCount;
        reportType.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getRecordTotal(r);
        reportType.total += total;
        // Si el discípulo asistió, contar según su género
        if (r.attended) {
          if (disciple.gender === "Male") {
            reportType.male += 1 + r.maleCount;
            reportType.female += r.femaleCount;
          } else {
            reportType.male += r.maleCount;
            reportType.female += 1 + r.femaleCount;
          }
        } else {
          reportType.male += r.maleCount;
          reportType.female += r.femaleCount;
        }
        reportType.kids += r.kidsCount || 0;
      }
    }

    // Calcular reporte del período anterior para comparación
    const prevPeriodRecords = allRecords.filter(
      (r) => r.date >= prevStart && r.date <= prevEnd
    );

    const prevReport = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
      },
    };

    for (const r of prevPeriodRecords) {
      const reportType = prevReport[r.type];
      if (!reportType) continue;

      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        reportType.total += total;
        reportType.male += r.maleCount;
        reportType.female += r.femaleCount;
        reportType.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getRecordTotal(r);
        reportType.total += total;
        if (r.attended) {
          if (disciple.gender === "Male") {
            reportType.male += 1 + r.maleCount;
            reportType.female += r.femaleCount;
          } else {
            reportType.male += r.maleCount;
            reportType.female += 1 + r.femaleCount;
          }
        } else {
          reportType.male += r.maleCount;
          reportType.female += r.femaleCount;
        }
        reportType.kids += r.kidsCount || 0;
      }
    }

    return {
      current: report,
      previous: prevReport,
      periodStart,
      periodEnd,
    };
  },
});

/**
 * Query: Obtiene el reporte mensual o anual de grupo para líderes
 * Incluye totales de sus discípulos + sus propios registros
 * Agrupado por tipo y con desglose de propios vs discípulos
 */
export const getGroupAttendanceReport = query({
  args: {
    periodType: v.union(
      v.literal("week"),
      v.literal("month"),
      v.literal("quarter"),
      v.literal("year")
    ),
    referenceDate: v.number(), // Timestamp de la fecha de referencia
    groupId: v.optional(v.id("groups")), // ID del grupo para filtrar, opcional. Si no se proporciona, muestra todos los grupos
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    // Verificar que el usuario tenga grupos (sea líder)
    // Nota: El índice "leaders" busca por array completo, no por elemento.
    // Por ahora necesitamos obtener todos los grupos, pero esto se puede optimizar
    // si agregamos un índice diferente o cambiamos la estructura de datos.
    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((group) =>
      group.leaders.includes(userId)
    );

    // Obtener información del usuario para conocer su género
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const referenceDate = new Date(args.referenceDate);
    const { start: periodStart, end: periodEnd } = getPeriodRange(
      args.periodType,
      referenceDate
    );
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(
      args.periodType,
      referenceDate
    );

    if (userGroups.length === 0) {
      // Si no es líder, retornar solo su reporte personal
      // Nota: Filtrar por fecha en memoria es necesario porque Convex no soporta
      // range queries directamente en índices simples
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
          return 1 + record.maleCount + record.femaleCount + (record.kidsCount || 0);
        }
        return record.maleCount + record.femaleCount + (record.kidsCount || 0);
      };

      // Calcular reporte - optimizado: una sola iteración sobre los registros
      const myReport = {
        nuevos: {
          total: 0,
          male: 0,
          female: 0,
          kids: 0,
          records: [] as typeof periodRecords,
        },
        asistencias: {
          total: 0,
          male: 0,
          female: 0,
          kids: 0,
          records: [] as typeof periodRecords,
        },
        reset: {
          total: 0,
          male: 0,
          female: 0,
          kids: 0,
          records: [] as typeof periodRecords,
        },
        conferencia: {
          total: 0,
          male: 0,
          female: 0,
          kids: 0,
          records: [] as typeof periodRecords,
        },
      };

      // Una sola iteración sobre todos los registros para calcular totales
      for (const r of periodRecords) {
        const reportType = myReport[r.type];
        if (!reportType) continue;

        reportType.records.push(r);

        if (r.type === "nuevos" || r.type === "reset") {
          const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
          reportType.total += total;
          reportType.male += r.maleCount;
          reportType.female += r.femaleCount;
          reportType.kids += r.kidsCount || 0;
        } else if (r.type === "asistencias" || r.type === "conferencia") {
          const total = getRecordTotal(r);
          reportType.total += total;
          if (r.attended) {
            if (user.gender === "Male") {
              reportType.male += 1 + r.maleCount;
              reportType.female += r.femaleCount;
            } else {
              reportType.male += r.maleCount;
              reportType.female += 1 + r.femaleCount;
            }
          } else {
            reportType.male += r.maleCount;
            reportType.female += r.femaleCount;
          }
          reportType.kids += r.kidsCount || 0;
        }
      }

      // Calcular reporte del período anterior para comparación
      const prevPeriodRecords = allRecords.filter(
        (r) => r.date >= prevStart && r.date <= prevEnd
      );

      const prevMyReport = {
        nuevos: { total: 0, male: 0, female: 0, kids: 0 },
        asistencias: { total: 0, male: 0, female: 0, kids: 0 },
        reset: { total: 0, male: 0, female: 0, kids: 0 },
        conferencia: { total: 0, male: 0, female: 0, kids: 0 },
      };

      for (const r of prevPeriodRecords) {
        const reportType = prevMyReport[r.type];
        if (!reportType) continue;

        if (r.type === "nuevos" || r.type === "reset") {
          const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
          reportType.total += total;
          reportType.male += r.maleCount;
          reportType.female += r.femaleCount;
          reportType.kids += r.kidsCount || 0;
        } else if (r.type === "asistencias" || r.type === "conferencia") {
          const total = getRecordTotal(r);
          reportType.total += total;
          if (r.attended) {
            if (user.gender === "Male") {
              reportType.male += 1 + r.maleCount;
              reportType.female += r.femaleCount;
            } else {
              reportType.male += r.maleCount;
              reportType.female += 1 + r.femaleCount;
            }
          } else {
            reportType.male += r.maleCount;
            reportType.female += r.femaleCount;
          }
          reportType.kids += r.kidsCount || 0;
        }
      }

      return {
        isLeader: false,
        myReport,
        groupReport: null,
        previous: {
          myReport: prevMyReport,
          groupReport: null,
        },
        periodStart,
        periodEnd,
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
      // Si no se especifica grupo, obtener TODOS los discípulos de TODOS los grupos del usuario
      // Esto incluye discípulos de ambos líderes (hombre y mujer) en grupos mixtos
      const allDiscipleIds = new Set<Id<"users">>();
      
      // Recopilar todos los IDs de discípulos de todos los grupos
      for (const group of userGroups) {
        for (const discipleId of group.disciples) {
          allDiscipleIds.add(discipleId);
        }
      }
      
      // Obtener información de todos los discípulos únicos
      const disciplesArray = await Promise.all(
        Array.from(allDiscipleIds).map((discipleId) => ctx.db.get(discipleId))
      );
      
      allDisciples = disciplesArray.filter(
        (disciple): disciple is NonNullable<typeof disciple> => disciple !== null
      );
    }

    // Obtener registros propios del período usando el índice userId_date
    // Filtrar por rango de fechas directamente en la query cuando sea posible
    const myRecords = await ctx.db
      .query("attendanceRecords")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    const myPeriodRecords = myRecords.filter(
      (r) => r.date >= periodStart && r.date <= periodEnd
    );

    // Optimización: Obtener registros de todos los discípulos en paralelo
    // pero filtrar por fecha en memoria ya que Convex no soporta rangos directamente en índices simples
    const discipleIds = allDisciples.map((d) => d._id);
    
    // Si hay muchos discípulos, esto puede ser lento. Una alternativa sería
    // agregar un índice compuesto (userId, date) y usar range queries si Convex lo soporta.
    // Por ahora, optimizamos usando Promise.all para queries paralelas
    const allDiscipleRecords = await Promise.all(
      discipleIds.map(async (discipleId) => {
        const records = await ctx.db
          .query("attendanceRecords")
          .withIndex("userId", (q) => q.eq("userId", discipleId))
          .collect();
        // Filtrar por fecha en memoria - esto es necesario porque el índice userId_date
        // solo permite búsqueda exacta, no rangos
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
        return 1 + record.maleCount + record.femaleCount + (record.kidsCount || 0);
      }
      return record.maleCount + record.femaleCount + (record.kidsCount || 0);
    };

    // Helper para calcular total de personas en un registro de discípulo
    const getDiscipleRecordTotal = (record: typeof disciplePeriodRecords[0]): number => {
      if (
        (record.type === "asistencias" || record.type === "conferencia") &&
        record.attended
      ) {
        return 1 + record.maleCount + record.femaleCount + (record.kidsCount || 0);
      }
      return record.maleCount + record.femaleCount + (record.kidsCount || 0);
    };

    // Calcular reporte propio - optimizado: una sola iteración sobre los registros
    const myReport = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof myPeriodRecords,
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof myPeriodRecords,
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof myPeriodRecords,
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof myPeriodRecords,
      },
    };

    // Una sola iteración sobre todos los registros para calcular totales
    for (const r of myPeriodRecords) {
      const report = myReport[r.type];
      if (!report) continue;

      report.records.push(r);
      
      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        report.total += total;
        report.male += r.maleCount;
        report.female += r.femaleCount;
        report.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getRecordTotal(r);
        report.total += total;
        if (r.attended) {
          if (user.gender === "Male") {
            report.male += 1 + r.maleCount;
            report.female += r.femaleCount;
          } else {
            report.male += r.maleCount;
            report.female += 1 + r.femaleCount;
          }
        } else {
          report.male += r.maleCount;
          report.female += r.femaleCount;
        }
        report.kids += r.kidsCount || 0;
      }
    }

    // Calcular reporte de discípulos - optimizado: una sola iteración sobre los registros
    const disciplesReport = {
      nuevos: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof disciplePeriodRecords,
      },
      asistencias: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof disciplePeriodRecords,
      },
      reset: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof disciplePeriodRecords,
      },
      conferencia: {
        total: 0,
        male: 0,
        female: 0,
        kids: 0,
        records: [] as typeof disciplePeriodRecords,
      },
    };

    // Una sola iteración sobre todos los registros de discípulos
    for (const r of disciplePeriodRecords) {
      const report = disciplesReport[r.type];
      if (!report) continue;

      report.records.push(r);
      const discipleGender = discipleGenderMap.get(r.userId);

      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        report.total += total;
        report.male += r.maleCount;
        report.female += r.femaleCount;
        report.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getDiscipleRecordTotal(r);
        report.total += total;
        if (r.attended && discipleGender) {
          if (discipleGender === "Male") {
            report.male += 1 + r.maleCount;
            report.female += r.femaleCount;
          } else {
            report.male += r.maleCount;
            report.female += 1 + r.femaleCount;
          }
        } else {
          report.male += r.maleCount;
          report.female += r.femaleCount;
        }
        report.kids += r.kidsCount || 0;
      }
    }

    // Calcular totales combinados
    // El total solo incluye los discípulos filtrados, SIN incluir los registros del líder
    const groupReport = {
      nuevos: {
        total: disciplesReport.nuevos.total, // Solo discípulos filtrados
        myTotal: myReport.nuevos.total,
        disciplesTotal: disciplesReport.nuevos.total,
        male: disciplesReport.nuevos.male, // Solo discípulos filtrados
        female: disciplesReport.nuevos.female, // Solo discípulos filtrados
        kids: disciplesReport.nuevos.kids, // Solo discípulos filtrados
        myMale: myReport.nuevos.male,
        myFemale: myReport.nuevos.female,
        myKids: myReport.nuevos.kids,
        disciplesMale: disciplesReport.nuevos.male,
        disciplesFemale: disciplesReport.nuevos.female,
        disciplesKids: disciplesReport.nuevos.kids,
      },
      asistencias: {
        total: disciplesReport.asistencias.total, // Solo discípulos filtrados
        myTotal: myReport.asistencias.total,
        disciplesTotal: disciplesReport.asistencias.total,
        male: disciplesReport.asistencias.male, // Solo discípulos filtrados
        female: disciplesReport.asistencias.female, // Solo discípulos filtrados
        kids: disciplesReport.asistencias.kids, // Solo discípulos filtrados
        myMale: myReport.asistencias.male,
        myFemale: myReport.asistencias.female,
        myKids: myReport.asistencias.kids,
        disciplesMale: disciplesReport.asistencias.male,
        disciplesFemale: disciplesReport.asistencias.female,
        disciplesKids: disciplesReport.asistencias.kids,
      },
      reset: {
        total: disciplesReport.reset.total, // Solo discípulos filtrados
        myTotal: myReport.reset.total,
        disciplesTotal: disciplesReport.reset.total,
        male: disciplesReport.reset.male, // Solo discípulos filtrados
        female: disciplesReport.reset.female, // Solo discípulos filtrados
        kids: disciplesReport.reset.kids, // Solo discípulos filtrados
        myMale: myReport.reset.male,
        myFemale: myReport.reset.female,
        myKids: myReport.reset.kids,
        disciplesMale: disciplesReport.reset.male,
        disciplesFemale: disciplesReport.reset.female,
        disciplesKids: disciplesReport.reset.kids,
      },
      conferencia: {
        total: disciplesReport.conferencia.total, // Solo discípulos filtrados
        myTotal: myReport.conferencia.total,
        disciplesTotal: disciplesReport.conferencia.total,
        male: disciplesReport.conferencia.male, // Solo discípulos filtrados
        female: disciplesReport.conferencia.female, // Solo discípulos filtrados
        kids: disciplesReport.conferencia.kids, // Solo discípulos filtrados
        myMale: myReport.conferencia.male,
        myFemale: myReport.conferencia.female,
        myKids: myReport.conferencia.kids,
        disciplesMale: disciplesReport.conferencia.male,
        disciplesFemale: disciplesReport.conferencia.female,
        disciplesKids: disciplesReport.conferencia.kids,
      },
    };

    // Calcular reporte del período anterior para comparación
    const prevMyRecords = myRecords.filter(
      (r) => r.date >= prevStart && r.date <= prevEnd
    );
    
    const prevDiscipleRecords = allDiscipleRecords.map((records) =>
      records.filter((r) => r.date >= prevStart && r.date <= prevEnd)
    ).flat();

    const prevMyReport = {
      nuevos: { total: 0, male: 0, female: 0, kids: 0 },
      asistencias: { total: 0, male: 0, female: 0, kids: 0 },
      reset: { total: 0, male: 0, female: 0, kids: 0 },
      conferencia: { total: 0, male: 0, female: 0, kids: 0 },
    };

    for (const r of prevMyRecords) {
      const report = prevMyReport[r.type];
      if (!report) continue;
      
      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        report.total += total;
        report.male += r.maleCount;
        report.female += r.femaleCount;
        report.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getRecordTotal(r);
        report.total += total;
        if (r.attended) {
          if (user.gender === "Male") {
            report.male += 1 + r.maleCount;
            report.female += r.femaleCount;
          } else {
            report.male += r.maleCount;
            report.female += 1 + r.femaleCount;
          }
        } else {
          report.male += r.maleCount;
          report.female += r.femaleCount;
        }
        report.kids += r.kidsCount || 0;
      }
    }

    const prevDisciplesReport = {
      nuevos: { total: 0, male: 0, female: 0, kids: 0 },
      asistencias: { total: 0, male: 0, female: 0, kids: 0 },
      reset: { total: 0, male: 0, female: 0, kids: 0 },
      conferencia: { total: 0, male: 0, female: 0, kids: 0 },
    };

    for (const r of prevDiscipleRecords) {
      const report = prevDisciplesReport[r.type];
      if (!report) continue;
      const discipleGender = discipleGenderMap.get(r.userId);

      if (r.type === "nuevos" || r.type === "reset") {
        const total = r.maleCount + r.femaleCount + (r.kidsCount || 0);
        report.total += total;
        report.male += r.maleCount;
        report.female += r.femaleCount;
        report.kids += r.kidsCount || 0;
      } else if (r.type === "asistencias" || r.type === "conferencia") {
        const total = getDiscipleRecordTotal(r);
        report.total += total;
        if (r.attended && discipleGender) {
          if (discipleGender === "Male") {
            report.male += 1 + r.maleCount;
            report.female += r.femaleCount;
          } else {
            report.male += r.maleCount;
            report.female += 1 + r.femaleCount;
          }
        } else {
          report.male += r.maleCount;
          report.female += r.femaleCount;
        }
        report.kids += r.kidsCount || 0;
      }
    }

    const prevGroupReport = {
      nuevos: { total: prevDisciplesReport.nuevos.total },
      asistencias: { total: prevDisciplesReport.asistencias.total },
      reset: { total: prevDisciplesReport.reset.total },
      conferencia: { total: prevDisciplesReport.conferencia.total },
    };

    return {
      isLeader: true,
      myReport,
      groupReport,
      previous: {
        myReport: prevMyReport,
        groupReport: prevGroupReport,
      },
      periodStart,
      periodEnd,
    };
  },
});

