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
- `gridId`: ID de la red a la que pertenece (opcional)
- `leader`: ID del líder asignado cuando se une a un grupo (opcional, solo 1)
- `isActiveInSchool`: boolean
- `currentCourses`: array de IDs de cursos (opcional)

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
3. Solo los pastores pueden crear cursos

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
- ✅ Tabla `activities` para actividades de grupos
- ✅ Tabla `activityResponses` para respuestas de usuarios a actividades
- ✅ Índices optimizados para consultas

#### Queries y Mutations

**Groups (`convex/groups.ts`)**
- ✅ `getGroupsAsLeader` - Obtiene grupos donde el usuario es líder
- ✅ `getGroupAsDisciple` - Obtiene el grupo donde el usuario es discípulo
- ✅ `getGroupByInvitationCode` - Busca grupo por código
- ✅ `getGroupById` - Obtiene grupo por ID con información completa de discípulos y cursos
- ✅ `createGroup` - Crea grupo con validaciones (máx 2 líderes, géneros diferentes)
  - Campos: name, address, district, minAge, maxAge, day, time, coLeaderId
  - Validaciones: rango de edad, géneros diferentes, máximo 2 líderes
- ✅ `joinGroup` - Une usuario a grupo (asigna líder según género)
- ✅ `updateGroup` - Actualiza información del grupo

**Grids (`convex/grids.ts`)**
- ✅ `getMyGrid` - Obtiene la red del pastor
- ✅ `getGridMembers` - Obtiene miembros de la red
- ✅ `getGridStats` - Estadísticas de la red
- ✅ `searchGridsByName` - Busca redes por nombre (búsqueda parcial, hasta 10 resultados)
- ✅ `createGrid` - Crea red (solo pastores, una por pastor)
- ✅ `addMemberToGrid` - Agrega miembro a la red
- ✅ `removeMemberFromGrid` - Remueve miembro de la red
- ✅ `updateGrid` - Actualiza nombre de la red

**Courses (`convex/courses.ts`)**
- ✅ `getAllCourses` - Obtiene todos los cursos
- ✅ `getMyCourses` - Obtiene cursos del usuario
- ✅ `getCourseById` - Obtiene curso específico
- ✅ `createCourse` - Crea curso (solo pastores)
- ✅ `enrollInCourses` - Inscribe en cursos
- ✅ `unenrollFromCourses` - Desinscribe de cursos
- ✅ `updateSchoolStatus` - Actualiza estado de escuela
- ✅ `updateCourse` - Actualiza información del curso

**Users (`convex/users.ts`)**
- ✅ `getMyProfile` - Perfil completo del usuario
- ✅ `getUserByEmail` - Busca usuario por email (coincidencia exacta)
- ✅ `searchUsersByEmail` - Busca usuarios por email (búsqueda parcial, hasta 10 resultados)
- ✅ `getDisciplesByLeader` - Obtiene discípulos de un líder
- ✅ `getDashboard` - Dashboard completo (grupos, cursos, red)
- ✅ `updateMyProfile` - Actualiza perfil
- ✅ `completeProfile` - Completa perfil inicial

**Activities (`convex/activities.ts`)**
- ✅ `getActivitiesByGroup` - Obtiene todas las actividades de un grupo
- ✅ `getActivityWithResponses` - Obtiene actividad con respuestas organizadas (confirmados, pendientes, denegados)
- ✅ `getMyActivityResponse` - Obtiene la respuesta del usuario actual a una actividad
- ✅ `createActivity` - Crea nueva actividad (solo líderes)
  - Campos: name, address, dateTime, description (rich text)
  - Validaciones: nombre mínimo 2 caracteres, dirección válida, fecha futura, descripción mínimo 10 caracteres
- ✅ `respondToActivity` - Responde a una actividad (confirmar, negar o pendiente)
- ✅ `updateActivity` - Actualiza una actividad (solo el creador)
- ✅ `deleteActivity` - Elimina una actividad y sus respuestas (solo el creador)

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
- ✅ Rutas configuradas: Dashboard, Mi Grupo, Mis Grupos, Mi Red
- ✅ Botón de cerrar sesión

#### Rutas (`src/App.tsx`)
- ✅ Protección de rutas con Convex Auth
- ✅ Redirección a /login si no está autenticado
- ✅ Layout aplicado a rutas autenticadas

#### Páginas Placeholder
- ✅ `Home.tsx` - Página principal (placeholder)
- ✅ `MyGroup.tsx` - Mi Grupo (placeholder)
- ✅ `Groups.tsx` - Mis Grupos (placeholder)
- ✅ `Grid.tsx` - Mi Red (placeholder)

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
- [ ] Mostrar información del usuario (perfil)
- [ ] Mostrar grupo como discípulo (si existe)
- [ ] Mostrar grupos como líder
- [ ] Mostrar cursos del usuario
- [ ] Mostrar información de red (si es pastor)
- [ ] Diseño estilo Notion con cards y colores pasteles

#### 2. **Mi Grupo (`src/pages/MyGroup.tsx`)**
- [x] Mostrar información del grupo donde el usuario es discípulo
- [x] Mostrar líderes del grupo con información completa
- [x] Mostrar otros discípulos del grupo con sus cursos
- [x] Mostrar información completa del grupo (nombre, dirección, distrito, edad, día, hora)
- [x] Opción para unirse a un grupo (si no tiene grupo)
- [x] Formulario para unirse con código de invitación:
  - Input con formato de código (6 caracteres, mayúsculas)
  - Validación en tiempo real
  - Manejo de errores del backend
  - Mensaje de éxito al unirse
- [x] Lista de actividades del grupo
- [x] Botones para confirmar/negar asistencia a actividades
- [x] Popup de detalles de actividad con:
  - Información completa (nombre, dirección, fecha, hora, descripción con rich text)
  - Botones de confirmación/negación
  - Listas de confirmados, pendientes y denegados
- [ ] Mostrar código de invitación (si es líder) - Pendiente (esto va en otra vista)

#### 3. **Mis Grupos (`src/pages/Groups.tsx`)**
- [x] Lista de grupos donde el usuario es líder
- [x] Card para cada grupo con:
  - Nombre y dirección
  - Distrito
  - Rango de edad (si está definido)
  - Día y hora de reunión
  - Código de invitación (con botón para copiar)
  - Número de discípulos
  - Lista de líderes
- [x] Cards clickeables que navegan a vista de detalle del grupo
- [x] Botón para crear nuevo grupo
- [x] Formulario modal para crear grupo:
  - Nombre del grupo
  - Dirección
  - Distrito (dropdown con todos los distritos de Lima)
  - Rango de edad (min y max, opcional)
  - Día de la semana (dropdown)
  - Hora (input tipo time)
  - Buscador de co-líder con autocompletado:
    - Búsqueda en tiempo real por email
    - Muestra resultados mientras se escribe
    - Mensaje si no encuentra usuarios
    - Selección de usuario encontrado
- [ ] Opción para editar grupo (solo líderes) - Pendiente

#### 3.1. **Detalle del Grupo (`src/pages/GroupDetail.tsx`)**
- [x] Vista de detalle accesible desde "Mis Grupos" (ruta `/groups/:groupId`)
- [x] Banner con información del grupo
- [x] Lista de discípulos con sus cursos
- [x] Lista de actividades del grupo
- [x] Botón para crear nueva actividad (solo líderes)
- [x] Modal para crear actividad con:
  - Nombre de la actividad
  - Dirección
  - Fecha y hora (datetime-local)
  - Editor rich text para descripción (viñetas, negritas, cursivas, listas numeradas)
- [x] Botones para confirmar/negar asistencia (líderes y discípulos)
- [x] Popup de detalles de actividad con:
  - Información completa (nombre, dirección, fecha, hora, descripción con rich text)
  - Botones de confirmación/negación
  - Listas de confirmados, pendientes y denegados
  - Accesible para todos los miembros del grupo

#### 4. **Mi Red (`src/pages/Grid.tsx`)**
- [ ] Solo visible para pastores
- [ ] Si no tiene red: opción para crear una
- [ ] Si tiene red:
  - Estadísticas de la red (cards con números):
    - Total de miembros
    - Miembros en escuela
    - Grupos creados
    - Distribución por género (hombres/mujeres)
  - Tabla de miembros con:
    - Nombre, email, rol, género, estado en escuela
  - Opción para agregar miembros por email
  - Opción para remover miembros

### Componentes Reutilizables

- [ ] `Card` - Componente de tarjeta estilo Notion
- [ ] `Button` - Botones con estilo consistente
- [ ] `Input` - Inputs con estilo consistente
- [x] `Modal` - Modal para formularios (implementado en Groups y Activities)
  - Soporta diferentes tamaños (sm, md, lg, xl, 2xl)
  - Padding adecuado en contenido
  - Overlay con blur
- [x] `RichTextEditor` - Editor de texto enriquecido (`src/components/RichTextEditor.tsx`)
  - Basado en Tiptap
  - Soporta: negritas, cursivas, listas con viñetas, listas numeradas
  - Toolbar con botones de formato
- [ ] `LoadingSpinner` - Spinner de carga
- [x] `EmptyState` - Estado vacío cuando no hay datos (implementado en Groups)

### Funcionalidades Adicionales

- [ ] **Búsqueda de usuarios**: Para agregar co-líderes o miembros a la red
- [ ] **Notificaciones**: Cuando alguien se une a tu grupo
- [ ] **Validación de perfil completo**: Redirigir si falta completar perfil
- [ ] **Manejo de errores**: Mensajes de error amigables
- [ ] **Loading states**: Estados de carga en todas las queries

### Diseño y UX

- [ ] Aplicar diseño estilo Notion con colores celeste/azul en todas las páginas
- [ ] Usar tipografía Poppins en toda la aplicación
- [ ] Botones con `rounded-full` donde corresponda
- [ ] Cards con bordes redondeados y sombras suaves
- [ ] Transiciones suaves en todas las interacciones
- [ ] Responsive design completo

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
   - `/` o `/dashboard` - Dashboard principal
   - `/my-group` - Mi grupo como discípulo
   - `/groups` - Mis grupos como líder
   - `/groups/:groupId` - Detalle del grupo (líderes y discípulos)
   - `/grid` - Mi red (solo pastores)

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
**Estado**: En desarrollo - Backend completo, Frontend en progreso

## 📝 Changelog

### Diciembre 2024
- ✅ Agregado campo de Red (gridId) al registro
  - Buscador de redes con autocompletado en tiempo real
  - Búsqueda por nombre de red
  - Muestra información del pastor de la red
  - Campo opcional (puede registrarse sin seleccionar una red)
  - Query `searchGridsByName` creada para búsqueda parcial
  - Actualizado `customProfile.ts` para aceptar gridId opcional
- ✅ Implementada página "Mi Grupo" (`src/pages/MyGroup.tsx`)
  - Vista del grupo actual si el usuario pertenece a uno
  - Formulario para unirse con código de invitación
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
    - Popup de detalles con listas de respuestas (todos los miembros)
  - Vista "Mi Grupo" actualizada (`src/pages/MyGroup.tsx`):
    - Lista de actividades del grupo
    - Botones para confirmar/negar asistencia
    - Popup de detalles con listas de respuestas
  - Funcionalidades:
    - Líderes pueden crear actividades con rich text
    - Todos los miembros pueden confirmar/negar asistencia
    - Todos pueden ver listas de confirmados, pendientes y denegados
    - La lista "Por Confirmar" muestra automáticamente miembros sin respuesta
  - Estilos CSS para renderizado de HTML (rich text)
  - Cards de grupos clickeables para navegar a vista de detalle

