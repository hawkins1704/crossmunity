# Implementación de Estadísticas - Crossmunity

## Descripción General

Se implementará una sección de **ESTADISTICAS** en el Dashboard (`src/pages/Home.tsx`) con múltiples gráficos interactivos usando **Recharts (React)**. Todos los gráficos estarán filtrados por **GRUPO** (similar al filtro de REPORTES).

## Filtros

### Filtro de Grupo
- Dropdown similar al de REPORTES
- Opciones:
  - "TODOS LOS GRUPOS" (muestra estadísticas de todos los grupos del usuario)
  - Lista de grupos específicos del usuario
- Ubicación: Debajo del título "ESTADISTICAS" o en la parte superior de la sección

### Filtro de Período
- **CONFIRMADO**: Mismo filtro de mes/año que REPORTES
- Selector de modo Mes/Año
- Selector de mes (1-12) cuando está en modo Mes
- Selector de año
- Los gráficos que dependen de fechas (como tendencias de asistencia) usarán este filtro

## Gráficos a Implementar

### 1. Demografía y Composición

#### 1A. Distribución por Género
- **Tipo**: Pie Chart
- **Datos**: 
  - Hombres (Male)
  - Mujeres (Female)
- **Fuente**: Discípulos del grupo(s) seleccionado(s)
- **Query necesaria**: Obtener discípulos filtrados por grupo
- **Librería**: Recharts `PieChart`, `Pie`, `Cell`, `Legend`, `Tooltip`
- **Colores sugeridos**: 
  - Hombres: Azul (#3B82F6)
  - Mujeres: Rosa (#EC4899)

#### 1B. Distribución por Edad
- **Tipo**: Bar Chart (Horizontal o Vertical)
- **Datos**: 
  - Rangos de edad (CONFIRMADO):
    - Menos de 13 años (-13)
    - 13-17 años
    - 18-25 años
    - 26-35 años
    - 36-45 años
    - 46-55 años
    - 56+ años
- **Fuente**: `birthdate` de discípulos del grupo(s) seleccionado(s)
- **Query necesaria**: Calcular edad desde `birthdate` y agrupar por rangos
- **Librería**: Recharts `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`
- **Nota**: Solo incluir discípulos que tengan `birthdate` definido


### 2. Asistencia y Crecimiento

#### 2A. Tendencias de Asistencia (Nuevos y RESET)
- **Tipo**: Line Chart (Líneas múltiples)
- **Datos**: 
  - Línea 1: Nuevos asistentes por mes
  - Línea 2: Personas enviadas a RESET por mes
- **Fuente**: `attendanceRecords` filtrados por:
  - Tipo: "nuevos" y "reset"
  - Grupo seleccionado (a través de los discípulos del grupo)
  - Período: últimos 6-12 meses (a confirmar)
- **Query necesaria**: 
  - Agrupar registros por mes
  - Filtrar por discípulos del grupo seleccionado
  - Sumar `maleCount + femaleCount + kidsCount` por tipo
- **Librería**: Recharts `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`
- **Colores sugeridos**:
  - Nuevos: Verde (#10B981)
  - RESET: Púrpura (#8B5CF6)

#### 2B. Distribución por Servicio
- **Tipo**: Pie Chart
- **Datos**: 
  - Sábado NEXT 5PM (saturday-1)
  - Sábado NEXT 7PM (saturday-2)
  - Domingo 9AM (sunday-1)
  - Domingo 11:30AM (sunday-2)
- **Fuente**: `attendanceRecords` con campo `service`
- **Query necesaria**: 
  - Contar registros por `service`
  - Filtrar por discípulos del grupo seleccionado
  - Solo incluir registros de tipo "nuevos" y "asistencias"
- **Librería**: Recharts `PieChart`, `Pie`, `Cell`, `Legend`, `Tooltip`
- **Colores sugeridos**: Diferentes tonos para cada servicio

### 3. Formación y Educación

#### 3B. Participación en Escuela
- **Tipo**: Pie Chart
- **Datos**: 
  - Activos en escuela (`isActiveInSchool: true`)
  - No activos en escuela (`isActiveInSchool: false`)
- **Fuente**: Campo `isActiveInSchool` de discípulos
- **Query necesaria**: Contar discípulos del grupo por `isActiveInSchool`
- **Librería**: Recharts `PieChart`, `Pie`, `Cell`, `Legend`, `Tooltip`
- **Colores sugeridos**:
  - Activos: Verde (#10B981)
  - No activos: Gris (#6B7280)

#### 3C. Cursos Más Populares
- **Tipo**: Bar Chart (Horizontal recomendado)
- **Datos**: 
  - Lista de cursos con número de inscritos (CONFIRMADO: contar por inscritos)
- **Fuente**: Campo `currentCourses` de discípulos
- **Query necesaria**: 
  - Contar inscripciones por curso (usando `currentCourses`)
  - Filtrar por discípulos del grupo seleccionado
  - Obtener nombres de cursos desde tabla `courses`
- **Librería**: Recharts `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`
- **Nota**: Mostrar top 5-10 cursos más populares

### 4. Grupos y Liderazgo

#### 4B. Grupos por Día de la Semana
- **Tipo**: Bar Chart (Vertical)
- **Datos**: 
  - Número de grupos por día de la semana
  - Días: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
- **Fuente**: Campo `day` de la tabla `groups`
- **Query necesaria**: 
  - Contar grupos por `day`
  - Filtrar solo grupos donde el usuario es líder
  - Si hay grupo seleccionado, mostrar solo ese grupo (1 barra)
- **Librería**: Recharts `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`
- **Nota**: Si solo hay un grupo seleccionado, mostrar el día de ese grupo


### 6. Áreas de Servicio

#### 6A. Distribución por Área de Servicio
- **Tipo**: Pie Chart
- **Datos**: 
  - Número de discípulos por área de servicio
- **Fuente**: Campo `serviceId` de discípulos
- **Query necesaria**: 
  - Contar discípulos por `serviceId`
  - Obtener nombres de servicios desde tabla `services`
  - Filtrar por discípulos del grupo seleccionado
- **Librería**: Recharts `PieChart`, `Pie`, `Cell`, `Legend`, `Tooltip`
- **Nota**: Incluir opción "Sin área asignada" para discípulos sin `serviceId`

## Estructura de Archivos

### Nuevos Archivos a Crear

1. **`convex/statistics.ts`**
   - Queries para obtener datos estadísticos
   - Funciones helper para cálculos (edad, agrupaciones, etc.)

2. **`src/components/Statistics/`** (directorio)
   - Componentes individuales para cada gráfico
   - Componente wrapper para la sección completa

### Archivos a Modificar

1. **`src/pages/Home.tsx`**
   - Agregar contenido del tab "ESTADISTICAS"
   - Integrar filtro de grupo
   - Integrar componentes de gráficos

2. **`package.json`**
   - Agregar dependencia: `recharts`

## Queries Necesarias en `convex/statistics.ts`

### 1. `getGenderDistribution`
- Args: `groupId?: Id<"groups">`
- Retorna: `{ male: number, female: number }`

### 2. `getAgeDistribution`
- Args: `groupId?: Id<"groups">, month?: number, year?: number`
- Retorna: `Array<{ range: string, count: number }>`
- Rangos: "-13", "13-17", "18-25", "26-35", "36-45", "46-55", "56+"

### 3. `getDistrictDistribution`
- Args: `groupId?: Id<"groups">, month?: number, year?: number`
- Retorna: `Array<{ district: string, count: number }>`
- Nota: Incluir TODOS los distritos, incluso con count: 0

### 4. `getAttendanceTrends`
- Args: `groupId?: Id<"groups">, month?: number, year?: number, viewMode?: "month" | "year"`
- Retorna: `Array<{ month: string, nuevos: number, reset: number }>`
- Nota: Usar filtros de período (mes/año) para determinar el rango

### 5. `getServiceDistribution`
- Args: `groupId?: Id<"groups">, month?: number, year?: number`
- Retorna: `Array<{ service: string, count: number }>`

### 6. `getSchoolParticipation`
- Args: `groupId?: Id<"groups">, month?: number, year?: number`
- Retorna: `{ active: number, inactive: number }`

### 7. `getPopularCourses`
- Args: `groupId?: Id<"groups">, month?: number, year?: number, limit?: number`
- Retorna: `Array<{ courseName: string, count: number }>`
- Nota: Contar por inscritos (currentCourses), no por completados

### 8. `getGroupsByDay`
- Args: `groupId?: Id<"groups">, month?: number, year?: number`
- Retorna: `Array<{ day: string, count: number }>`

### 9. `getServiceAreaDistribution`
- Args: `groupId?: Id<"groups">, month?: number, year?: number`
- Retorna: `Array<{ serviceName: string, count: number }>`

## Decisiones Confirmadas

1. **Filtro de Período**: ✅ Los gráficos usarán el mismo filtro de mes/año que REPORTES
   - Selector de modo Mes/Año
   - Selector de mes (1-12) cuando está en modo Mes
   - Selector de año

2. **Líderes Más Activos (4D)**: ❌ **ELIMINADO** - Este gráfico no se implementará

3. **Cursos Más Populares (3C)**: ✅ Contar por **inscritos** (currentCourses)

4. **Distribución por Edad (1B)**: ✅ Rangos confirmados:
   - Menos de 13 años (-13)
   - 13-17 años
   - 18-25 años
   - 26-35 años
   - 36-45 años
   - 46-55 años
   - 56+ años

5. **Distribución por Distrito (1C)**: ✅ Mostrar **TODOS los distritos** (incluso con 0 si no hay grupos/discípulos)

## Orden de Implementación Sugerido

1. Instalar Recharts
2. Crear estructura de queries en `convex/statistics.ts`
3. Crear componente wrapper de Estadísticas
4. Implementar filtro de grupo
5. Implementar gráficos uno por uno:
   - **1B (Edad)** - Bar chart con cálculo de edad ⭐ PRIMERO
   - **1C (Distrito)** - Bar chart simple ⭐ PRIMERO
   - 1A (Género) - Pie chart simple
   - 3B (Escuela) - Pie chart similar a género
   - 2B (Servicio) - Pie chart similar a género
   - 6A (Área de servicio) - Pie chart similar a género
   - 4B (Día de semana) - Bar chart simple
   - 3C (Cursos) - Bar chart con datos relacionados
   - 2A (Tendencias) - Más complejo, requiere agrupación temporal

## Notas Técnicas

- Todos los gráficos deben ser responsive
- Usar colores consistentes con el diseño de la app (negro, blanco, grises)
- Incluir tooltips informativos
- Manejar casos donde no hay datos (mostrar mensaje apropiado)
- Optimizar queries para evitar múltiples llamadas innecesarias
- Considerar usar `useMemo` para cálculos pesados en el frontend

## Dependencias a Instalar

```bash
npm install recharts
```

## Referencias

- [Recharts Documentation](https://recharts.org/)
- [Recharts Examples](https://recharts.org/en-US/examples)
