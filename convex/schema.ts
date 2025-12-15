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
    gridId: v.optional(v.id("grids")), // Red a la que pertenece (solo para miembros de una red)
    leader: v.optional(v.id("users")), // Líder asignado cuando se une a un grupo (solo 1 líder)
    isActiveInSchool: v.boolean(), // Si está activo en la escuela
    currentCourses: v.optional(v.array(v.id("courses"))), // Cursos en los que está inscrito
  })
    .index("email", ["email"])
    .index("leader", ["leader"]) // Para buscar discípulos de un líder
    .index("gridId", ["gridId"]) // Para buscar usuarios de una red
    .index("role", ["role"]), // Para filtrar por rol

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
    createdAt: v.number(), // Fecha de creación
    updatedAt: v.number(), // Fecha de última actualización
  })
    .index("invitationCode", ["invitationCode"]) // Para buscar grupo por código de invitación
    .index("leaders", ["leaders"]), // Para buscar grupos donde un usuario es líder

  // Tabla de redes (grids) lideradas por pastores
  grids: defineTable({
    name: v.string(), // Nombre de la red
    pastorId: v.id("users"), // ID del pastor creador de la red
    createdAt: v.number(), // Fecha de creación
    updatedAt: v.number(), // Fecha de última actualización
  })
    .index("pastorId", ["pastorId"]), // Para buscar la red de un pastor

  // Tabla de cursos globales
  courses: defineTable({
    name: v.string(), // Nombre del curso
    description: v.optional(v.string()), // Descripción opcional del curso
    createdAt: v.number(), // Fecha de creación
    updatedAt: v.number(), // Fecha de última actualización
  }),

  // Tabla de actividades de grupos
  activities: defineTable({
    groupId: v.id("groups"), // Grupo al que pertenece la actividad
    name: v.string(), // Nombre de la actividad
    address: v.string(), // Dirección de la actividad
    dateTime: v.number(), // Fecha y hora (timestamp)
    description: v.string(), // Descripción con rich text (HTML)
    createdBy: v.id("users"), // Líder que creó la actividad
    createdAt: v.number(), // Fecha de creación
    updatedAt: v.number(), // Fecha de última actualización
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
});