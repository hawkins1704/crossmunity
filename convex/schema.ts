import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  
  // Tabla de usuarios extendida con campos de la aplicación
  users: defineTable({
    // Campos de Convex Auth (ya incluidos por authTables)
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    
    // Campos adicionales de la aplicación
    role: v.union(v.literal("Pastor"), v.literal("Member")), // Rol del usuario
    gender: v.union(v.literal("Male"), v.literal("Female")), // Género del usuario
    birthday: v.optional(v.number()), // Fecha de cumpleaños (timestamp)
    gridId: v.optional(v.id("grids")), // Red a la que pertenece (solo para miembros de una red)
    leader: v.optional(v.id("users")), // Líder asignado cuando se une a un grupo (solo 1 líder)
    isActiveInSchool: v.boolean(), // Si está activo en la escuela
    currentCourses: v.optional(v.array(v.id("courses"))), // Cursos en los que está inscrito
    serviceId: v.optional(v.id("services")), // Área de servicio asignada (solo un servicio por usuario)
    isAdmin: v.boolean(), // Si el usuario es administrador (solo para gestión de cursos y redes)
  })
    .index("email", ["email"])
    .index("leader", ["leader"]) // Para buscar discípulos de un líder
    .index("gridId", ["gridId"]) // Para buscar usuarios de una red
    .index("role", ["role"]) // Para filtrar por rol
    .index("serviceId", ["serviceId"]), // Para buscar usuarios por área de servicio

  // Tabla de grupos de conexión
  groups: defineTable({
    name: v.string(), // Nombre del grupo
    address: v.string(), // Dirección del grupo
    district: v.string(), // Distrito de Lima donde se realiza el grupo
    minAge: v.optional(v.number()), // Edad mínima del grupo
    maxAge: v.optional(v.number()), // Edad máxima del grupo
    day: v.string(), // Día de la semana que se realiza el grupo
    time: v.string(), // Hora en que se realiza el grupo (formato HH:MM)
    leaders: v.array(v.id("users")), // Líderes del grupo (máximo 2: uno hombre, una mujer)
    disciples: v.array(v.id("users")), // Discípulos del grupo
    invitationCode: v.string(), // Código de invitación único para unirse al grupo
  })
    .index("invitationCode", ["invitationCode"]) // Para buscar grupo por código de invitación
    .index("leaders", ["leaders"]), // Para buscar grupos donde un usuario es líder

  // Tabla de redes (grids) lideradas por pastores
  grids: defineTable({
    name: v.string(), // Nombre de la red
    pastorId: v.id("users"), // ID del pastor creador de la red
  })
    .index("pastorId", ["pastorId"]), // Para buscar la red de un pastor

  // Tabla de cursos globales
  courses: defineTable({
    name: v.string(), // Nombre del curso
    description: v.optional(v.string()), // Descripción opcional del curso
    startDate: v.optional(v.number()), // Fecha de inicio del curso (timestamp)
    endDate: v.optional(v.number()), // Fecha de fin del curso (timestamp)
    durationWeeks: v.optional(v.number()), // Duración en semanas (por defecto 9)
  }),

  // Tabla de áreas de servicio
  services: defineTable({
    name: v.string(), // Nombre del área de servicio
  }),

  // Tabla de progreso de usuarios en cursos
  courseProgress: defineTable({
    userId: v.id("users"), // Usuario que tiene el progreso
    courseId: v.id("courses"), // Curso del progreso
    completedWeeks: v.array(v.number()), // Array de semanas completadas (1-9)
    completedWorkAndExam: v.boolean(), // Si completó trabajo y examen
  })
    .index("userId", ["userId"]) // Para buscar progreso de un usuario
    .index("courseId", ["courseId"]) // Para buscar progreso de un curso
    .index("userId_courseId", ["userId", "courseId"]), // Índice compuesto para búsqueda única

  // Tabla de actividades de grupos
  activities: defineTable({
    groupId: v.id("groups"), // Grupo al que pertenece la actividad
    name: v.string(), // Nombre de la actividad
    address: v.string(), // Dirección de la actividad
    dateTime: v.number(), // Fecha y hora (timestamp)
    description: v.string(), // Descripción con rich text (HTML)
    createdBy: v.id("users"), // Líder que creó la actividad
  })
    .index("groupId", ["groupId"]) // Para buscar actividades de un grupo
    .index("createdBy", ["createdBy"]), // Para buscar actividades creadas por un usuario

  // Tabla de respuestas de usuarios a actividades
  activityResponses: defineTable({
    activityId: v.id("activities"), // Actividad a la que responde
    userId: v.id("users"), // Usuario que responde
    status: v.union(
      v.literal("confirmed"), // Confirmado (asistirá)
      v.literal("pending"), // Pendiente (aún no responde)
      v.literal("denied") // Denegado (no asistirá)
    ),
    respondedAt: v.number(), // Timestamp de cuando respondió
  })
    .index("activityId", ["activityId"]) // Para buscar respuestas de una actividad
    .index("userId", ["userId"]) // Para buscar respuestas de un usuario
    .index("activityId_userId", ["activityId", "userId"]), // Índice compuesto para búsqueda única

  // Tabla de registros de asistencia y contadores
  attendanceRecords: defineTable({
    userId: v.id("users"), // Usuario que registra
    date: v.number(), // Fecha del registro (timestamp, solo fecha, sin hora)
    type: v.union(
      v.literal("nuevos"), // Registro de nuevos asistentes
      v.literal("asistencias"), // Registro de asistencias
      v.literal("reset"), // Personas enviadas a RESET
      v.literal("conferencia") // Asistencia a conferencia
    ),
    service: v.optional(v.union(
      v.literal("saturday-1"), // Sábado NEXT 5PM
      v.literal("saturday-2"), // Sábado NEXT 7PM
      v.literal("sunday-1"), // Domingo 9AM
      v.literal("sunday-2") // Domingo 11:30AM
    )), // Solo para nuevos y asistencias
    attended: v.optional(v.boolean()), // Si asistió (solo para asistencias y conferencia)
    maleCount: v.number(), // Cantidad de hombres
    femaleCount: v.number(), // Cantidad de mujeres
  })
    .index("userId", ["userId"]) // Para buscar registros de un usuario
    .index("userId_date", ["userId", "date"]) // Para buscar registros por usuario y fecha
    .index("userId_type", ["userId", "type"]), // Para buscar registros por usuario y tipo
});