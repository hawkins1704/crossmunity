# Crossmunity - Resumen del Proyecto

## 📋 Descripción General

Crossmunity es una aplicación web para el manejo de grupos de conexión. La aplicación permite a los usuarios crear y gestionar grupos de conexión, donde cada grupo tiene líderes (máximo 2) y discípulos. Los usuarios pueden tener diferentes roles (Pastor o Miembro) y pertenecer a redes (grids) lideradas por pastores.

## 🎯 Objetivo del Negocio

La aplicación busca facilitar la gestión de grupos de conexión dentro de una organización religiosa/comunitaria, permitiendo:
- Crear y gestionar grupos de conexión
- Asignar líderes y discípulos a grupos
- Gestionar redes lideradas por pastores
- Seguimiento de cursos y estado de escuela
- Reportes y estadísticas para pastores

## 🗄️ Estructura de Datos

### Entidades Principales

#### 1. **Users (Usuarios)**
- Campos de Convex Auth (email, name, image, etc.)
- `role`: "Pastor" | "Member"
- `gender`: "Male" | "Female"
- `birthday`: Fecha de cumpleaños (timestamp, opcional)
- `gridId`: ID de la red a la que pertenece (opcional)
- `leader`: ID del líder asignado cuando se une a un grupo (opcional, solo 1)
- `isActiveInSchool`: boolean
- `currentCourses`: array de IDs de cursos (opcional)
- `serviceId`: ID del área de servicio asignada (opcional, solo un servicio por usuario)
- `isAdmin`: boolean (opcional, default false) - Solo para gestión administrativa

#### 2. **Groups (Grupos de Conexión)**
- `name`: Nombre del grupo
- `address`: Dirección del grupo
- `district`: Distrito de Lima donde se realiza el grupo
- `minAge`: Edad mínima del grupo (opcional)
- `maxAge`: Edad máxima del grupo (opcional)
- `day`: Día de la semana que se realiza el grupo
- `time`: Hora en que se realiza el grupo (formato HH:MM)
- `leaders`: Array de IDs de usuarios (máximo 2: uno hombre, una mujer)
- `disciples`: Array de IDs de usuarios
- `invitationCode`: Código único de 6 caracteres para unirse
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### 3. **Grids (Redes)**
- `name`: Nombre de la red
- `pastorId`: ID del pastor creador
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### 4. **Courses (Cursos)**
- `name`: Nombre del curso
- `description`: Descripción opcional
- `startDate`: Fecha de inicio del curso (timestamp, opcional)
- `endDate`: Fecha de fin del curso (timestamp, opcional)
- `durationWeeks`: Duración en semanas (opcional, default 9)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### 4.1. **CourseProgress (Progreso de Cursos)**
- `userId`: ID del usuario
- `courseId`: ID del curso
- `completedWeeks`: Array de números [1-9] (semanas completadas)
- `completedWorkAndExam`: boolean (trabajo y examen completado)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### 5. **Activities (Actividades)**
- `groupId`: ID del grupo al que pertenece
- `name`: Nombre de la actividad
- `address`: Dirección de la actividad
- `dateTime`: Fecha y hora (timestamp)
- `description`: Descripción con rich text (HTML)
- `createdBy`: ID del líder que creó la actividad
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

#### 6. **ActivityResponses (Respuestas a Actividades)**
- `activityId`: ID de la actividad
- `userId`: ID del usuario que responde
- `status`: "confirmed" | "pending" | "denied"
- `respondedAt`: Timestamp de cuando respondió

#### 7. **Services (Áreas de Servicio)**
- `name`: Nombre del área de servicio
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

## 📐 Reglas de Negocio

### Grupos
1. **Líderes**: Un grupo puede tener máximo 2 líderes
2. **Género de líderes**: Si hay 2 líderes, deben ser de diferente género (uno hombre, una mujer)
3. **Asignación de líder**: Cuando un usuario se une a un grupo:
   - Si hay 1 líder: se asigna ese líder automáticamente
   - Si hay 2 líderes: se asigna el líder del mismo género del usuario
4. **Un usuario solo puede ser discípulo en UN grupo** (porque solo puede tener 1 líder)
5. **Un usuario puede ser líder de múltiples grupos**

### Redes (Grids)
1. **Un pastor solo puede tener UNA red**
2. Los miembros de una red se asignan manualmente por el pastor
3. El pastor puede ver reportes de su red:
   - Total de miembros
   - Miembros en escuela (isActiveInSchool)
   - Grupos creados en su red
   - Distribución por género (hombres/mujeres)

### Usuarios
1. **Roles**: Pastor o Member
2. **Género**: Male o Female (requerido)
3. **Líder**: Se asigna automáticamente al unirse a un grupo
4. **Red**: Se asigna manualmente por el pastor

### Cursos
1. Los cursos son globales (no específicos por red)
2. Un usuario puede estar inscrito en múltiples cursos
3. Solo los administradores pueden crear cursos

### Servicios (Áreas de Servicio)
1. **Un usuario solo puede tener UN servicio asignado**
2. Los servicios son globales (no específicos por red)
3. Solo los administradores pueden crear, editar y eliminar servicios
4. Los usuarios pueden asignarse su propio servicio desde su perfil
5. Los líderes pueden ver el área de servicio de sus discípulos en la lista de discípulos
6. Útil para métricas futuras de quiénes están sirviendo y quiénes no

### Actividades
1. **Creación**: Solo los líderes pueden crear actividades para sus grupos
2. **Respuestas**: Todos los miembros del grupo (líderes y discípulos) pueden confirmar o negar asistencia
3. **Estados de respuesta**:
   - `confirmed`: El usuario confirmó que asistirá
   - `pending`: El usuario aún no ha respondido (se muestra automáticamente para miembros sin respuesta)
   - `denied`: El usuario negó que asistirá
4. **Visualización**: Todos los miembros pueden ver las listas de confirmados, pendientes y denegados
5. **Descripción**: Soporta rich text (HTML) con formato: negritas, cursivas, listas con viñetas, listas numeradas

## ✅ Lo que ya está implementado

### Backend (Convex)

#### Schema (`convex/schema.ts`)
- ✅ Tabla `users` extendida con campos de la aplicación
- ✅ Tabla `groups` con validaciones
- ✅ Tabla `grids` para redes
- ✅ Tabla `courses` para cursos globales
- ✅ Tabla `courseProgress` para progreso de usuarios en cursos
- ✅ Tabla `services` para áreas de servicio
- ✅ Tabla `activities` para actividades de grupos
- ✅ Tabla `activityResponses` para respuestas de usuarios a actividades
- ✅ Índices optimizados para consultas

#### Queries y Mutations

**Groups (`convex/groups.ts`)**
- ✅ `getGroupsAsLeader` - Obtiene grupos donde el usuario es líder
- ✅ `getGroupAsDisciple` - Obtiene el grupo donde el usuario es discípulo
- ✅ `getGroupByInvitationCode` - Busca grupo por código
- ✅ `getGroupById` - Obtiene grupo por ID con información completa de discípulos, cursos y servicios
- ✅ `getDisciplesWhoAreLeaders` - Obtiene información de discípulos que son líderes de otros grupos
  - Retorna usuario y sus grupos con información completa (líderes y discípulos)
- ✅ `createGroup` - Crea grupo con validaciones (máx 2 líderes, géneros diferentes)
  - Campos: name, address, district, minAge, maxAge, day, time, coLeaderId
  - Validaciones: rango de edad, géneros diferentes, máximo 2 líderes
- ✅ `joinGroup` - Une usuario a grupo (asigna líder según género)
- ✅ `updateGroup` - Actualiza información del grupo (solo líderes)
  - Campos editables: name, address, district, minAge, maxAge, day, time
  - Validaciones: rango de edad, solo líderes pueden actualizar

**Grids (`convex/grids.ts`)**
- ✅ `getMyGrid` - Obtiene la red del pastor
- ✅ `getAllGrids` - Obtiene todas las redes (solo administradores)
- ✅ `getGridMembers` - Obtiene miembros de la red del pastor
- ✅ `getGridMembersForAdmin` - Obtiene miembros de una red específica (solo administradores)
- ✅ `getGridStats` - Estadísticas de la red del pastor
- ✅ `getGridStatsForAdmin` - Estadísticas de una red específica (solo administradores)
- ✅ `searchGridsByName` - Busca redes por nombre (búsqueda parcial, hasta 10 resultados)
- ✅ `createGrid` - Crea red (solo pastores, una por pastor)
- ✅ `addMemberToGrid` - Agrega miembro a la red del pastor
- ✅ `addMemberToGridForAdmin` - Agrega miembro a una red específica (solo administradores)
- ✅ `removeMemberFromGrid` - Remueve miembro de la red del pastor
- ✅ `removeMemberFromGridForAdmin` - Remueve miembro de una red específica (solo administradores)
- ✅ `updateGrid` - Actualiza nombre de la red (solo el pastor de la red)
- ✅ `updateGridForAdmin` - Actualiza nombre de una red (solo administradores)
- ✅ `deleteGrid` - Elimina una red y remueve a todos sus miembros (solo administradores)

**Courses (`convex/courses.ts`)**
- ✅ `getAllCourses` - Obtiene todos los cursos
- ✅ `getMyCourses` - Obtiene cursos del usuario con progreso semanal
- ✅ `getCourseById` - Obtiene curso específico
- ✅ `getCourseProgress` - Obtiene progreso del usuario en un curso con estados calculados
- ✅ `createCourse` - Crea curso (solo administradores)
- ✅ `enrollInCourses` - Inscribe en cursos
- ✅ `unenrollFromCourses` - Desinscribe de cursos
- ✅ `updateSchoolStatus` - Actualiza estado de escuela
- ✅ `updateCourse` - Actualiza información del curso (solo administradores)
- ✅ `deleteCourse` - Elimina curso y su progreso asociado (solo administradores)
- ✅ `toggleWeekCompletion` - Marca o desmarca una semana como completada
- ✅ `toggleWorkAndExam` - Marca o desmarca trabajo y examen como completado

**Users (`convex/users.ts`)**
- ✅ `getMyProfile` - Perfil completo del usuario (incluye servicio)
- ✅ `getUserByEmail` - Busca usuario por email (coincidencia exacta)
- ✅ `searchUsersByEmail` - Busca usuarios por email (búsqueda parcial, hasta 10 resultados)
- ✅ `getDisciplesByLeader` - Obtiene discípulos de un líder
- ✅ `getDashboard` - Dashboard completo (grupos, cursos, red)
- ✅ `updateMyProfile` - Actualiza perfil (incluye birthday)
- ✅ `completeProfile` - Completa perfil inicial

**Services (`convex/services.ts`)**
- ✅ `getAllServices` - Obtiene todos los servicios disponibles (ordenados alfabéticamente)
- ✅ `getServiceById` - Obtiene un servicio específico por ID
- ✅ `getMyService` - Obtiene el servicio del usuario actual
- ✅ `createService` - Crea nuevo servicio (solo administradores)
- ✅ `updateService` - Actualiza información del servicio (solo administradores)
- ✅ `deleteService` - Elimina servicio y remueve de usuarios (solo administradores)
- ✅ `assignServiceToUser` - Asigna servicio al usuario actual
- ✅ `removeServiceFromUser` - Remueve servicio del usuario actual
- ✅ `assignServiceToUserForAdmin` - Asigna servicio a usuario específico (solo administradores)
- ✅ `removeServiceFromUserForAdmin` - Remueve servicio de usuario específico (solo administradores)

**Activities (`convex/activities.ts`)**
- ✅ `getActivitiesByGroup` - Obtiene todas las actividades de un grupo
- ✅ `getActivityWithResponses` - Obtiene actividad con respuestas organizadas (confirmados, pendientes, denegados)
- ✅ `getMyActivityResponse` - Obtiene la respuesta del usuario actual a una actividad
- ✅ `createActivity` - Crea nueva actividad (solo líderes)
  - Campos: name, address, dateTime, description (rich text)
  - Validaciones: nombre mínimo 2 caracteres, dirección válida, fecha futura, descripción mínimo 10 caracteres
- ✅ `respondToActivity` - Responde a una actividad (confirmar, negar o pendiente)
- ✅ `updateActivity` - Actualiza una actividad (solo el creador)
  - Campos editables: name, address, dateTime, description
  - Validaciones: nombre mínimo 2 caracteres, dirección válida, fecha futura
  - Verifica que el usuario sea el creador de la actividad
- ✅ `deleteActivity` - Elimina una actividad y sus respuestas (solo el creador)
  - Elimina automáticamente todas las respuestas asociadas
  - Verifica que el usuario sea el creador de la actividad

**Auth (`convex/auth.ts` y `convex/customProfile.ts`)**
- ✅ Configuración de Convex Auth con Password provider
- ✅ Perfil personalizado que captura: email, name, role, gender, gridId (opcional)
- ✅ Campos iniciales: isActiveInSchool (false), currentCourses ([])
- ✅ gridId se asigna al registrarse (opcional)

### Frontend (React)

#### Autenticación
- ✅ Página de SignIn (`src/pages/SignIn.tsx`)
  - Formulario de login
  - Formulario de registro con campos:
    - name, email, password, confirmPassword
    - role (toggle switch: Miembro/Pastor)
    - gender (dropdown: Hombre/Mujer)
    - gridId (buscador de redes con autocompletado, opcional):
      - Búsqueda en tiempo real por nombre de red
      - Muestra resultados mientras se escribe
      - Muestra nombre de red y pastor
      - Mensaje si no encuentra redes
      - Selección de red encontrada
      - Campo opcional
  - Validaciones en tiempo real
  - Diseño estilo Notion con colores celeste/azul
  - Tipografía Poppins

#### Layout (`src/components/Layout.tsx`)
- ✅ Sidebar con navegación
- ✅ Diseño responsive (hamburger menu en mobile)
- ✅ Rutas configuradas: Dashboard, Mi Grupo, Mis Grupos, Escuela
- ✅ Rutas de administración (solo para admins): Cursos, Redes
- ✅ Rutas para pastores: Mi Red (en lugar de Redes)
- ✅ Navegación condicional según rol del usuario
- ✅ Botón de cerrar sesión
- ✅ Acceso al perfil desde el sidebar

#### Rutas (`src/App.tsx`)
- ✅ Protección de rutas con Convex Auth
- ✅ Redirección a /login si no está autenticado
- ✅ Layout aplicado a rutas autenticadas

#### Páginas Implementadas

**Mi Grupo (`src/pages/MyGroup.tsx`)**
- ✅ Vista del grupo donde el usuario es discípulo
- ✅ Información completa del grupo (nombre, dirección, distrito, edad, día, hora)
- ✅ Lista de líderes con información detallada
- ✅ Lista de otros discípulos con sus cursos
- ✅ Formulario para unirse a un grupo con código de invitación
- ✅ Lista de actividades del grupo
- ✅ Botones para confirmar/negar asistencia a actividades
- ✅ Popup de detalles de actividad con listas de respuestas

**Mis Grupos (`src/pages/Groups.tsx`)**
- ✅ Lista de grupos donde el usuario es líder
- ✅ Cards con información completa del grupo
- ✅ Código de invitación con botón para copiar
- ✅ Cards clickeables que navegan a vista de detalle
- ✅ Botón para crear nuevo grupo
- ✅ Modal con formulario completo para crear grupo
- ✅ Buscador de co-líder con autocompletado

**Detalle del Grupo (`src/pages/GroupDetail.tsx`)**
- ✅ Vista de detalle accesible desde "Mis Grupos" (ruta `/groups/:groupId`)
- ✅ Banner con información completa del grupo (nombre, dirección, distrito, edad, día, hora)
- ✅ Botón de editar en el banner (solo visible para líderes)
- ✅ Modal para editar información del grupo (solo líderes):
  - Formulario prellenado con datos actuales
  - Campos editables: nombre, dirección, distrito, rango de edad, día, hora
  - Validaciones en frontend y backend
- ✅ Lista de líderes con información detallada
- ✅ Lista de discípulos con sus cursos inscritos y área de servicio:
  - Tabla desktop: columna "Área de Servicio" con badge morado
  - Cards mobile: badge de servicio junto a información de cursos
  - Modal de detalles: muestra área de servicio en información básica
- ✅ Modal de detalles de discípulo con información completa y progreso de cursos
- ✅ Sección de líderes (discípulos que tienen su propio grupo):
  - Tabla para desktop y cards para mobile
  - Click en líder abre modal con información de sus grupos
  - Modal muestra: información del grupo, líderes del grupo, lista completa de discípulos
- ✅ Lista de actividades del grupo ordenadas por fecha
- ✅ Modal para crear actividad con editor rich text (solo líderes)
- ✅ Modal para editar actividad (solo el creador):
  - Botón "Editar" en el modal de detalles de actividad
  - Formulario prellenado con datos actuales de la actividad
  - Campos editables: nombre, dirección, fecha/hora, descripción (rich text)
  - Validaciones en frontend y backend
  - Manejo de errores y estados de carga
- ✅ Modal de confirmación para eliminar actividad (solo el creador):
  - Botón "Eliminar" en el modal de detalles de actividad
  - Modal de confirmación con advertencia
  - Muestra información de la actividad a eliminar
  - Advertencia de que se eliminarán todas las respuestas asociadas
  - Eliminación automática de respuestas al eliminar actividad
- ✅ Botones para confirmar/negar asistencia a actividades
- ✅ Popup de detalles de actividad con listas organizadas:
  - Confirmados (con check verde)
  - Por Confirmar (pendientes, automáticamente incluye miembros sin respuesta)
  - No asistirán (denegados)
  - Botones de editar/eliminar visibles solo para el creador
- ✅ Estados vacíos cuando no hay discípulos o actividades
- ✅ Navegación de regreso a "Mis Grupos"

**Escuela (`src/pages/School.tsx`)**
- ✅ Vista de cursos inscritos del usuario
- ✅ Modal para inscribirse en nuevos cursos
- ✅ Progreso semanal por curso (9 semanas + trabajo/examen)
- ✅ Estados visuales calculados automáticamente: Al día (verde), Atrasado (rojo), Pendiente (gris)
- ✅ Botones interactivos para marcar semanas completadas
- ✅ Botón para marcar trabajo y examen completado
- ✅ Información de fechas de inicio y fin de cada curso
- ✅ Diseño con cards y colores consistentes

**Mi Perfil (`src/pages/Profile.tsx`)**
- ✅ Vista de información personal del usuario
- ✅ Edición de nombre, género, teléfono y fecha de cumpleaños
- ✅ Toggle para estado de escuela (isActiveInSchool)
- ✅ Sección "Área de Servicio" con selector dropdown:
  - Muestra servicio actual si tiene uno asignado
  - Dropdown con todos los servicios disponibles
  - Opción para remover servicio ("Sin área de servicio")
  - Badge morado mostrando el servicio actual
  - Actualización automática al seleccionar
- ✅ Información relacionada: cursos inscritos, red, líder asignado
- ✅ Acceso desde sidebar haciendo click en nombre del usuario
- ✅ Diseño con cards y formularios estilo Notion

**Redes (`src/pages/Grid.tsx`)**
- ✅ Vista diferenciada para administradores y pastores
- ✅ Administradores: gestión completa de todas las redes
- ✅ Pastores: gestión de su propia red
- ✅ Estadísticas expandibles por red
- ✅ Gestión de miembros con buscador de email
- ✅ Modales para edición y confirmaciones

**Cursos - Administración (`src/pages/CoursesAdmin.tsx`)**
- ✅ Solo visible para administradores
- ✅ Lista de todos los cursos con información completa
- ✅ Crear, editar y eliminar cursos
- ✅ Gestión de fechas y duración automática

#### Páginas Placeholder
- ⚠️ `Home.tsx` - Dashboard principal (placeholder básico - falta implementar funcionalidad completa)

#### Estilos (`src/index.css`)
- ✅ Configuración de Tailwind CSS
- ✅ Estilos globales con gradiente celeste/azul
- ✅ Scrollbar personalizado
- ✅ Animaciones
- ✅ Estilos para Tiptap Editor (ProseMirror)
- ✅ Estilos para contenido HTML renderizado (prose):
  - Párrafos con espaciado adecuado
  - Listas con viñetas y numeradas
  - Negritas y cursivas
  - Títulos, enlaces, código, citas

## 🚧 Lo que falta por implementar

### Frontend - Páginas Principales

#### 1. **Dashboard (`src/pages/Home.tsx` o `/dashboard`)**
- [ ] Implementar dashboard completo (actualmente es solo un placeholder)
- [ ] Mostrar información resumida del usuario (perfil)
- [ ] Mostrar grupo como discípulo (si existe) con link a `/my-group`
- [ ] Mostrar grupos como líder con links a `/groups/:groupId`
- [ ] Mostrar cursos del usuario con progreso resumido
- [ ] Mostrar información de red (si es pastor) con link a `/grid`
- [ ] Mostrar actividades próximas del usuario (próximas 5 actividades)
- [ ] Diseño estilo Notion con cards y colores pasteles
- [ ] Usar query `getDashboard` del backend que ya existe

### Componentes Reutilizables

- [x] `Modal` - Modal para formularios (`src/components/Modal.tsx`)
  - Implementado y usado en múltiples páginas (Groups, GroupDetail, CoursesAdmin, Grid)
  - Soporta diferentes tamaños (sm, md, lg, xl, 2xl)
  - Padding adecuado en contenido
  - Overlay con blur y animaciones
  - Manejo de scroll del body
- [x] `RichTextEditor` - Editor de texto enriquecido (`src/components/RichTextEditor.tsx`)
  - Basado en Tiptap
  - Soporta: negritas, cursivas, listas con viñetas, listas numeradas
  - Toolbar con botones de formato
  - Placeholder personalizable
- [ ] `Card` - Componente de tarjeta estilo Notion (actualmente se usan estilos inline)
- [ ] `Button` - Botones con estilo consistente (actualmente se usan estilos inline)
- [ ] `Input` - Inputs con estilo consistente (actualmente se usan estilos inline)
- [ ] `LoadingSpinner` - Spinner de carga reutilizable (actualmente se usa inline con Tailwind)
- [ ] `EmptyState` - Componente reutilizable para estados vacíos (actualmente se implementa inline en cada página)

### Funcionalidades Adicionales

- [x] **Búsqueda de usuarios**: Para agregar co-líderes o miembros a la red
  - Implementado en `searchUsersByEmail` (búsqueda parcial por email)
  - Usado en formularios de grupos (co-líder) y redes (agregar miembros)
  - Autocompletado en tiempo real con hasta 10 resultados
- [x] **Loading states**: Estados de carga básicos implementados (spinner con Tailwind)
  - Implementado en: Groups, Grid, GroupDetail, MyGroup, School, Profile
  - Usa `useQuery` que retorna `undefined` mientras carga
- [x] **Manejo de errores**: Mensajes de error en formularios
  - Implementado en formularios de creación/edición
  - Validaciones en frontend y backend
- [ ] **Notificaciones**: Sistema de notificaciones cuando alguien se une a tu grupo
- [ ] **Validación de perfil completo**: Redirigir si falta completar perfil al registrarse
- [ ] **Mejora de mensajes de error**: Mensajes más amigables y contextuales

### Diseño y UX

- [x] Diseño estilo Notion con colores celeste/azul aplicado en la mayoría de páginas
  - SignIn, Groups, MyGroup, GroupDetail, School, Profile, Grid, CoursesAdmin
- [x] Tipografía Poppins configurada globalmente
- [x] Botones con `rounded-full` aplicados en navegación y acciones principales
- [x] Cards con bordes redondeados (`rounded-xl`, `rounded-2xl`) y sombras suaves
- [x] Transiciones suaves en interacciones (hover, focus, etc.)
- [x] Responsive design implementado en Layout (hamburger menu en mobile)
- [ ] Verificar y mejorar responsive design en todas las páginas individuales
- [ ] Estandarizar estilos de loading states en todas las páginas

### Testing y Optimización

- [ ] Testing de las mutations y queries críticas
- [ ] Optimización de queries (evitar N+1)
- [ ] Validación de formularios en frontend
- [ ] Manejo de estados de error

## 🎨 Guía de Estilo

### Colores
- **Primarios**: Celeste (`sky-`) y Azul (`blue-`)
- **Gradientes**: `from-sky-50 via-blue-50 to-indigo-50` (fondos)
- **Acentos**: `from-sky-500 to-blue-500` (botones activos)
- **Sidebar**: `from-slate-800 to-slate-900` (fondo oscuro)

### Tipografía
- **Fuente principal**: Poppins (Google Fonts)
- **Tamaños**: Usar escala de Tailwind (text-sm, text-base, text-lg, etc.)

### Componentes
- **Botones**: `rounded-full` para botones de navegación
- **Cards**: `rounded-xl` o `rounded-2xl` con sombras suaves
- **Inputs**: Bordes redondeados con focus ring celeste/azul

## 📝 Notas Importantes

1. **Autenticación**: Ya está configurada con Convex Auth. El usuario se redirige a `/login` si no está autenticado.

2. **Rutas**: 
   - `/login` - Página de login y registro
   - `/` o `/dashboard` - Dashboard principal
   - `/my-group` - Mi grupo como discípulo
   - `/groups` - Mis grupos como líder
   - `/groups/:groupId` - Detalle del grupo (líderes y discípulos)
   - `/school` - Escuela (mis cursos con progreso)
   - `/profile` - Mi perfil
   - `/courses-admin` - Administración de cursos (solo administradores)
   - `/grid` - Redes (administradores ven todas las redes) o Mi Red (pastores ven solo su red)

3. **Validaciones de Backend**: Ya están implementadas en las mutations. El frontend debe mostrar mensajes de error apropiados.

4. **Estado de carga**: Usar `useQuery` de Convex que retorna `undefined` mientras carga.

5. **Navegación**: El sidebar tiene navegación activa basada en `location.pathname`.

## 🔄 Flujo de Usuario Típico

1. **Registro/Login**: Usuario se registra o inicia sesión
2. **Completar perfil**: Si es primera vez, completa perfil (name, role, gender, gridId opcional)
3. **Dashboard**: Ve su información y grupos
4. **Crear grupo**: Puede crear un grupo (se convierte en líder)
5. **Unirse a grupo**: Puede unirse a otro grupo con código (se convierte en discípulo)
6. **Gestionar red**: Si es pastor, puede crear y gestionar su red
7. **Actividades**:
   - Líderes pueden crear actividades para sus grupos
   - Todos los miembros pueden confirmar/negar asistencia
   - Todos pueden ver listas de confirmados, pendientes y denegados

---

**Última actualización**: Diciembre 2024
**Estado**: En desarrollo - Backend completo, Frontend ~92% completo (falta principalmente Dashboard)

## 📝 Changelog

### Diciembre 2024
- ✅ Agregado campo de Red (gridId) al registro
  - Buscador de redes con autocompletado en tiempo real
  - Búsqueda por nombre de red
  - Muestra información del pastor de la red
  - Campo opcional (puede registrarse sin seleccionar una red)
  - Query `searchGridsByName` creada para búsqueda parcial
  - Actualizado `customProfile.ts` para aceptar gridId opcional
- ✅ Implementada página "Mis Grupos" (`src/pages/Groups.tsx`)
  - Lista de grupos donde el usuario es líder
  - Cards con información completa del grupo (nombre, dirección, distrito, edad, día, hora, código de invitación)
  - Botón para copiar código de invitación
  - Modal para crear nuevo grupo
  - Formulario completo con todos los campos:
    - Nombre, dirección, distrito (dropdown con distritos de Lima)
    - Rango de edad (min/max opcional)
    - Día de la semana y hora
    - Buscador de co-líder con autocompletado en tiempo real
  - Validaciones en frontend y backend
  - Estado vacío cuando no hay grupos
- ✅ Implementada página "Mi Grupo" (`src/pages/MyGroup.tsx`)
  - Vista del grupo actual si el usuario pertenece a uno:
    - Información completa del grupo (nombre, dirección, distrito)
    - Rango de edad, día y hora de reunión
    - Lista de líderes con información detallada
    - Lista de otros discípulos del grupo
    - Indicador de estado activo
  - Formulario para unirse a un grupo si no tiene uno:
    - Input de código de invitación (6 caracteres, formato mayúsculas)
    - Validación en tiempo real
    - Manejo de errores del backend
    - Mensaje de éxito al unirse
    - Información sobre cómo obtener un código
- ✅ Actualizado schema de grupos con nuevos campos (district, minAge, maxAge, day, time)
- ✅ Actualizada mutation `createGroup` para aceptar nuevos campos y coLeaderId
- ✅ Creada query `searchUsersByEmail` para búsqueda parcial de usuarios (excluye usuario actual)
- ✅ Creado componente `Modal` reutilizable (`src/components/Modal.tsx`)
- ✅ Diseño estilo Notion con colores celeste/azul aplicado
- ✅ Implementado sistema completo de Actividades
  - Schema con tablas `activities` y `activityResponses`
  - Backend completo en `convex/activities.ts`:
    - Queries: `getActivitiesByGroup`, `getActivityWithResponses`, `getMyActivityResponse`
    - Mutations: `createActivity`, `respondToActivity`, `updateActivity`, `deleteActivity`
  - Editor rich text con Tiptap (`src/components/RichTextEditor.tsx`)
    - Soporta: negritas, cursivas, listas con viñetas, listas numeradas
  - Vista de detalle del grupo (`src/pages/GroupDetail.tsx`):
    - Banner con información del grupo
    - Lista de discípulos con sus cursos
    - Lista de actividades con botones de confirmación
    - Modal para crear actividades (solo líderes)
    - Modal para editar actividades (solo el creador)
    - Modal de confirmación para eliminar actividades (solo el creador)
    - Popup de detalles con listas de respuestas (todos los miembros)
  - Vista "Mi Grupo" actualizada (`src/pages/MyGroup.tsx`):
    - Lista de actividades del grupo
    - Botones para confirmar/negar asistencia
    - Popup de detalles con listas de respuestas
  - Funcionalidades:
    - Líderes pueden crear actividades con rich text
    - Creador puede editar actividades (nombre, dirección, fecha/hora, descripción)
    - Creador puede eliminar actividades (con confirmación, elimina respuestas asociadas)
    - Todos los miembros pueden confirmar/negar asistencia
    - Todos pueden ver listas de confirmados, pendientes y denegados
    - La lista "Por Confirmar" muestra automáticamente miembros sin respuesta
  - Estilos CSS para renderizado de HTML (rich text)
  - Cards de grupos clickeables para navegar a vista de detalle
- ✅ Implementada sección "Escuela" (`src/pages/School.tsx`)
  - Vista de cursos inscritos con progreso semanal
  - 9 botones de semanas + 1 botón de trabajo/examen
  - Estados visuales: Al día (verde), Atrasado (rojo), Pendiente (gris)
  - Cálculo automático de estados basado en fecha de inicio del curso
  - Sistema de progreso con tabla `courseProgress`
- ✅ Implementada sección "Mi Perfil" (`src/pages/Profile.tsx`)
  - Vista y edición de información personal
  - Toggle para estado de escuela
  - Información relacionada: cursos, red, líder
  - Acceso desde sidebar haciendo click en nombre del usuario
- ✅ Implementado sistema de administración
  - Campo `isAdmin` agregado a usuarios (default false)
  - Sección "Cursos" para administradores (`src/pages/CoursesAdmin.tsx`)
    - Crear, editar, eliminar cursos
    - Gestión completa de cursos con fechas y duración
    - Fechas solo con fecha (sin hora) - tipo `date`
    - Duración en semanas calculada automáticamente según las fechas (campo deshabilitado)
  - Sección "Redes" para administradores (`src/pages/Grid.tsx`)
    - Vista de todas las redes
    - Estadísticas y miembros por red
  - Navegación condicional: secciones admin solo visibles para administradores
- ✅ Actualizado schema de cursos con campos de fechas y duración
- ✅ Creada tabla `courseProgress` para seguimiento de progreso semanal
- ✅ Mutations actualizadas para verificar permisos de administrador
- ✅ Implementada funcionalidad completa de gestión de redes
  - Vista diferenciada para administradores y pastores
  - Administradores pueden ver, editar y eliminar todas las redes
  - Pastores pueden crear y gestionar solo su red
  - Mutations para administradores: `updateGridForAdmin`, `deleteGrid`, `addMemberToGridForAdmin`, `removeMemberFromGridForAdmin`
  - Queries para administradores: `getGridMembersForAdmin`, `getGridStatsForAdmin`
  - Vista de edición con modales similar a CoursesAdmin
  - Buscador de usuarios por email para agregar miembros
  - Funcionalidad de agregar/remover miembros con confirmaciones
  - Navegación condicional: "Mi Red" para pastores, "Redes" para administradores
- ✅ Implementada funcionalidad de edición de grupos en GroupDetail
  - Botón de editar en el banner del grupo (solo visible para líderes)
  - Modal de edición con formulario prellenado con datos actuales del grupo
  - Campos editables: nombre, dirección, distrito, rango de edad, día, hora
  - Actualización de mutation `updateGroup` para aceptar todos los campos editables
  - Validaciones en frontend y backend
  - Manejo de errores y estados de carga
- ✅ Implementada funcionalidad de detalles de líderes en GroupDetail
  - Sección "Líderes" muestra discípulos que tienen su propio grupo
  - Filas y cards clickeables para abrir modal de detalles
  - Modal muestra información completa del líder y todos sus grupos
  - Para cada grupo muestra: información completa, lista de líderes, lista completa de discípulos
  - Diseño consistente con otros modales de la aplicación
  - Responsive: tabla para desktop, cards para mobile
- ✅ Mejoras en diseño y UX
  - Diseño estilo Notion aplicado consistentemente en todas las páginas implementadas
  - Estados vacíos (EmptyState) implementados inline en todas las páginas principales
  - Loading states con spinners consistentes
  - Transiciones y animaciones suaves
  - Responsive design en Layout con hamburger menu para mobile
- ✅ Funcionalidad de edición de grupos en GroupDetail
  - Botón de editar en el banner del grupo (solo líderes)
  - Modal de edición con formulario prellenado
  - Actualización de mutation `updateGroup` para aceptar todos los campos editables
  - Validaciones en frontend y backend
- ✅ Agregado campo `birthday` (fecha de cumpleaños) al modelo Users
  - Campo opcional en el schema
  - Agregado a la vista de perfil con selector de fecha
  - Manejo correcto de zona horaria (mismo patrón que fechas de cursos)
  - Funciones helper para conversión timestamp ↔ fecha local
- ✅ Implementado sistema completo de Áreas de Servicio (Services)
  - Schema con tabla `services` (name, createdAt, updatedAt)
  - Campo `serviceId` opcional en usuarios (un usuario solo puede tener un servicio)
  - Backend completo en `convex/services.ts`:
    - Queries: `getAllServices`, `getServiceById`, `getMyService`
    - Mutations: `createService`, `updateService`, `deleteService` (solo admins)
    - Mutations de usuario: `assignServiceToUser`, `removeServiceFromUser`
    - Mutations de admin: `assignServiceToUserForAdmin`, `removeServiceFromUserForAdmin`
  - Vista de perfil (`src/pages/Profile.tsx`):
    - Sección "Área de Servicio" debajo de "Estado en Escuela"
    - Dropdown para seleccionar servicio
    - Badge morado mostrando servicio actual
    - Actualización automática al cambiar
  - Vista de detalle de grupo (`src/pages/GroupDetail.tsx`):
    - Columna "Área de Servicio" en tabla de discípulos (desktop)
    - Badge de servicio en cards de discípulos (mobile)
    - Área de servicio visible en modal de detalles del discípulo
   - `getMyProfile` y `getGroupById` actualizados para incluir información de servicio
   - Índice `serviceId` en usuarios para búsquedas optimizadas
- ✅ Funcionalidad de editar y eliminar actividades en GroupDetail
  - Botones de editar/eliminar en el modal de detalles de actividad (solo visible para el creador)
  - Modal de edición con formulario prellenado:
    - Campos editables: nombre, dirección, fecha/hora, descripción (rich text)
    - Validaciones en frontend (nombre mínimo 2 caracteres, dirección válida, fecha futura)
    - Manejo de errores y estados de carga
  - Modal de confirmación para eliminar:
    - Advertencia de que se eliminarán todas las respuestas asociadas
    - Muestra información de la actividad a eliminar
    - Botones de cancelar y confirmar con estados de carga
  - Verificación de permisos: solo el creador puede editar/eliminar
  - Actualización automática de la lista después de editar/eliminar

