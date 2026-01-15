# Guía de Migración al Estilo Minimalista Squarespace

Esta guía documenta el nuevo sistema de diseño minimalista tipo Squarespace implementado en la aplicación. Úsala como referencia para migrar páginas y componentes existentes.

## 📋 Tabla de Contenidos

- [Filosofía del Diseño](#filosofía-del-diseño)
- [Paleta de Colores](#paleta-de-colores)
- [Tipografía](#tipografía)
- [Componentes](#componentes)
- [Guía de Migración](#guía-de-migración)
- [Ejemplos](#ejemplos)

---

## Filosofía del Diseño

El nuevo estilo se caracteriza por:

- **Minimalismo**: Diseño limpio y sin elementos decorativos innecesarios
- **Rectangular**: Botones e inputs con bordes rectos (sin border-radius)
- **Alto contraste**: Texto negro sobre fondos claros
- **Espaciado generoso**: Abundante espacio en blanco entre elementos
- **Paleta restringida**: Grises, negro y blanco como base
- **Sin efectos**: Sin gradientes, sombras pronunciadas, blur o transformaciones

---

## Paleta de Colores

### Colores Principales

```css
/* Fondos */
bg-[#fafafa]     /* Fondo principal (hueso/gris muy claro) */
bg-white         /* Fondo de cards/contenedores */
bg-black         /* Botones primarios, elementos destacados */

/* Texto */
text-black       /* Texto principal */
text-[#666666]   /* Texto secundario */
text-[#999999]   /* Texto terciario, placeholders, iconos */

/* Bordes */
border-[#e5e5e5] /* Bordes estándar (gris muy claro) */
border-black     /* Bordes en focus/activos */

/* Estados de Error */
border-[#d32f2f] /* Borde de error */
text-[#d32f2f]   /* Texto de error */
bg-[#ffebee]     /* Fondo de mensajes de error */
border-[#ffcdd2] /* Borde de mensajes de error */

/* Estados Hover */
hover:bg-[#fafafa]  /* Hover en elementos interactivos */
hover:bg-[#333333]  /* Hover en botones negros */
hover:text-black    /* Hover en enlaces */
```

### Clases de Tailwind Equivalentes

Si prefieres usar clases de Tailwind estándar:

```css
/* Fondos */
bg-[#fafafa]  → bg-gray-50 (aproximado, pero mejor usar el hex exacto)
bg-white      → bg-white
bg-black      → bg-black

/* Texto */
text-black    → text-black
text-[#666666] → text-gray-600 (aproximado)
text-[#999999] → text-gray-400 (aproximado)
```

---

## Tipografía

### Jerarquía de Texto

```tsx
// Títulos principales
<h1 className="text-2xl font-normal text-black tracking-tight">
  Título Principal
</h1>

// Subtítulos
<h2 className="text-lg font-normal text-black">
  Subtítulo
</h2>

// Texto de cuerpo
<p className="text-sm font-normal text-black">
  Texto de cuerpo
</p>

// Texto secundario
<p className="text-sm font-normal text-[#666666]">
  Texto secundario
</p>

// Labels de formularios
<label className="text-xs font-normal text-black uppercase tracking-wide">
  Label
</label>

// Texto pequeño/terciario
<span className="text-xs text-[#999999] font-normal">
  Texto pequeño
</span>
```

### Características

- **Font weight**: `font-normal` (400) para casi todo. Evitar `font-bold` o `font-semibold` excepto en casos muy específicos
- **Tracking**: `tracking-tight` para títulos, `tracking-wide` para labels en mayúsculas
- **Tamaños**: `text-xs` (12px), `text-sm` (14px), `text-lg` (18px), `text-2xl` (24px)

---

## Componentes

### Botones

#### Botón Primario (Rectangular, Negro)

```tsx
<button
  type="submit"
  className="bg-black text-white py-3 px-4 font-normal text-sm hover:bg-[#333333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
>
  Enviar
</button>
```

**Características:**
- Fondo negro (`bg-black`)
- Texto blanco
- Sin border-radius
- Hover: `bg-[#333333]`
- Padding: `py-3 px-4`
- Font: `font-normal text-sm`

#### Botón Secundario (Rectangular, Blanco con Borde)

```tsx
<button
  type="button"
  className="bg-white text-black py-3 px-4 border border-[#e5e5e5] font-normal text-sm hover:bg-[#fafafa] transition-colors"
>
  Cancelar
</button>
```

#### Botón Toggle/Segmentado

```tsx
<div className="flex border border-[#e5e5e5]">
  <button
    type="button"
    className={`flex-1 py-3 px-4 text-sm font-normal transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
      isActive
        ? "bg-black text-white"
        : "bg-white text-black hover:bg-[#fafafa]"
    }`}
  >
    Opción 1
  </button>
  <button
    type="button"
    className={`flex-1 py-3 px-4 text-sm font-normal transition-colors border-r border-[#e5e5e5] last:border-r-0 ${
      !isActive
        ? "bg-black text-white"
        : "bg-white text-black hover:bg-[#fafafa]"
    }`}
  >
    Opción 2
  </button>
</div>
```

### Inputs

#### Input de Texto Estándar

```tsx
<div>
  <label
    htmlFor="input-name"
    className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
  >
    Nombre
  </label>
  <input
    id="input-name"
    type="text"
    className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors"
    placeholder="Ingresa tu nombre"
  />
</div>
```

#### Input con Icono

```tsx
<div>
  <label
    htmlFor="email"
    className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
  >
    Email
  </label>
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <HiMail className="h-4 w-4 text-[#999999]" />
    </div>
    <input
      id="email"
      type="email"
      className="block w-full pl-10 pr-3 py-3 border border-[#e5e5e5] bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors"
      placeholder="tu@email.com"
    />
  </div>
</div>
```

#### Input con Estado de Error

```tsx
<input
  className={`block w-full px-4 py-3 border bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors ${
    errors.field
      ? "border-[#d32f2f]"
      : "border-[#e5e5e5]"
  }`}
/>
{errors.field && (
  <p className="mt-2 text-xs text-[#d32f2f]">{errors.field}</p>
)}
```

### Select

```tsx
<select
  className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black focus:outline-none focus:border-black transition-colors"
>
  <option value="">Selecciona una opción</option>
  <option value="1">Opción 1</option>
</select>
```

### Cards/Contenedores

```tsx
<div className="bg-white border border-[#e5e5e5] p-10">
  {/* Contenido */}
</div>
```

**Características:**
- Fondo blanco
- Borde sutil `border-[#e5e5e5]`
- Padding generoso (`p-10`)
- Sin sombras, sin border-radius

### Mensajes de Error

```tsx
<div className="bg-[#ffebee] border border-[#ffcdd2] p-3">
  <p className="text-xs text-[#d32f2f]">Mensaje de error</p>
</div>
```

### Enlaces

```tsx
<button
  type="button"
  className="text-xs text-[#666666] font-normal transition-colors hover:text-black"
>
  ¿No tienes cuenta?{" "}
  <span className="text-black hover:underline">
    Regístrate aquí
  </span>
</button>
```

---

## Elementos con Colores (Badges, Botones, etc.)

Durante la migración, **NO debemos eliminar completamente los colores**. En su lugar, debemos usar **colores pasteles sutiles** que mantengan la diferenciación visual mientras preservan el estilo minimalista.

### Principios para Elementos con Color

1. **Usar colores pasteles sutiles** (nivel 50-100 de Tailwind)
2. **Mantener bordes sutiles** del mismo color (nivel 200)
3. **Texto negro** para mantener legibilidad
4. **Sin border-radius** (mantener rectangular)
5. **Sin sombras** ni efectos

### Badges/Etiquetas

#### Badge de Estado (Ej: "Activo")

```tsx
<div className="px-3 py-1 bg-green-50 text-black border border-green-200 text-sm font-normal flex items-center gap-1">
  <HiCheckCircle className="h-4 w-4" />
  Activo
</div>
```

**Colores disponibles:**
- Verde: `bg-green-50 border-green-200` (estado activo/confirmado)
- Rojo: `bg-red-50 border-red-200` (estado inactivo/denegado)
- Amarillo: `bg-yellow-50 border-yellow-200` (estado pendiente)
- Azul: `bg-blue-50 border-blue-200` (estado informativo)

### Botones con Color

#### Botón de Acción con Color (Ej: Confirmar/Denegar)

```tsx
<button
  className={`px-3 py-2 border font-normal text-sm transition-colors ${
    isActive
      ? "bg-green-50 text-black border-green-200"
      : "bg-white text-black border-[#e5e5e5] hover:border-green-200 hover:bg-green-50"
  }`}
>
  Confirmar
</button>
```

**Colores para botones:**
- **Verde** (Confirmar/Aceptar): `bg-green-50 border-green-200`
- **Rojo** (Denegar/Cancelar): `bg-red-50 border-red-200`
- **Amarillo** (Pendiente/Advertencia): `bg-yellow-50 border-yellow-200`
- **Azul** (Información): `bg-blue-50 border-blue-200`

### Avatares/Iconos con Iniciales

#### Avatar con Color según Género

```tsx
<div className={`w-10 h-10 flex items-center justify-center font-normal ${
  gender === "Male" 
    ? "bg-blue-100 text-blue-700" 
    : "bg-pink-100 text-pink-700"
}`}>
  {initial}
</div>
```

**Colores para avatares:**
- **Hombres**: `bg-blue-100 text-blue-700`
- **Mujeres**: `bg-pink-100 text-pink-700`
- **Neutro**: `bg-black text-white` (si no hay género)

### Columnas/Secciones con Fondo de Color

#### Secciones de Lista (Ej: Confirmados, Pendientes, Denegados)

```tsx
{/* Confirmados */}
<div className="bg-green-50 p-4 border border-green-200">
  <h4 className="font-normal text-black text-sm">
    Confirmados ({count})
  </h4>
  <div className="space-y-2">
    {items.map((item) => (
      <div className="text-sm font-normal text-black bg-white p-2 border border-green-200">
        {item.name}
      </div>
    ))}
  </div>
</div>

{/* Pendientes */}
<div className="bg-yellow-50 p-4 border border-yellow-200">
  {/* ... */}
</div>

{/* Denegados */}
<div className="bg-red-50 p-4 border border-red-200">
  {/* ... */}
</div>
```

**Colores para secciones:**
- **Verde**: `bg-green-50 border-green-200` (confirmados/éxito)
- **Amarillo**: `bg-yellow-50 border-yellow-200` (pendientes/advertencia)
- **Rojo**: `bg-red-50 border-red-200` (denegados/error)
- **Azul**: `bg-blue-50 border-blue-200` (información)

### Paleta de Colores Pasteles

```css
/* Verde (Confirmado/Activo/Éxito) */
bg-green-50    /* Fondo muy claro */
border-green-200  /* Borde sutil */
text-green-700    /* Texto (solo si es necesario) */

/* Rojo (Denegado/Error) */
bg-red-50      /* Fondo muy claro */
border-red-200   /* Borde sutil */
text-red-700     /* Texto (solo si es necesario) */

/* Amarillo (Pendiente/Advertencia) */
bg-yellow-50   /* Fondo muy claro */
border-yellow-200 /* Borde sutil */
text-yellow-700   /* Texto (solo si es necesario) */

/* Azul (Información/Hombres) */
bg-blue-50     /* Fondo muy claro */
bg-blue-100    /* Fondo para avatares */
border-blue-200  /* Borde sutil */
text-blue-700    /* Texto para avatares */

/* Rosa (Mujeres) */
bg-pink-50     /* Fondo muy claro */
bg-pink-100    /* Fondo para avatares */
border-pink-200  /* Borde sutil */
text-pink-700    /* Texto para avatares */
```

### Reglas Importantes

1. **Nunca usar colores saturados** (nivel 500+ de Tailwind) como fondo
2. **Siempre usar nivel 50-100** para fondos pasteles
3. **Bordes siempre nivel 200** para mantener sutileza
4. **Texto siempre negro** excepto en avatares donde se puede usar el color del fondo
5. **Mantener rectangular** - sin border-radius
6. **Sin sombras** - solo bordes sutiles

---

## Guía de Migración

### Checklist para Migrar una Página

- [ ] **Fondo**: Cambiar de gradientes a `bg-[#fafafa]` o `bg-white`
- [ ] **Botones**: 
  - Eliminar `rounded-xl`, `rounded-full`, `rounded-2xl`
  - Cambiar gradientes por `bg-black` (botones primarios) o colores pasteles sutiles (botones con significado)
  - Eliminar `shadow-lg`, `shadow-xl`
  - Eliminar `transform`, `hover:scale-*`
  - **Si el botón tiene significado de color** (confirmar/denegar): usar colores pasteles (`bg-green-50 border-green-200` o `bg-red-50 border-red-200`)
- [ ] **Inputs**:
  - Eliminar `rounded-xl`, `rounded-lg`
  - Cambiar `bg-white/50 backdrop-blur-sm` por `bg-white`
  - Cambiar `focus:ring-2 focus:ring-*` por `focus:border-black`
  - Usar `border-[#e5e5e5]` en lugar de `border-gray-200`
- [ ] **Labels**:
  - Cambiar a `text-xs font-normal uppercase tracking-wide`
  - Color `text-black`
- [ ] **Tipografía**:
  - Cambiar `font-bold`, `font-semibold` por `font-normal`
  - Ajustar colores: `text-black` para principal, `text-[#666666]` para secundario
- [ ] **Cards/Contenedores**:
  - Eliminar `rounded-2xl`, `rounded-xl`
  - Eliminar `shadow-xl`, `shadow-lg`
  - Eliminar `backdrop-blur-sm`, `bg-white/80`
  - Usar `border border-[#e5e5e5]`
- [ ] **Espaciado**:
  - Aumentar espaciado entre secciones (`mb-12` en lugar de `mb-8`)
  - Usar `space-y-6` en lugar de `space-y-5` en formularios
- [ ] **Iconos**:
  - Tamaño: `h-4 w-4` para iconos en inputs
  - Color: `text-[#999999]` para iconos secundarios
- [ ] **Estados Hover**:
  - Simplificar: `hover:bg-[#fafafa]` o `hover:bg-[#333333]`
  - Eliminar efectos complejos
- [ ] **Elementos con Color**:
  - **Badges**: Convertir a colores pasteles (`bg-green-50 border-green-200` para activo, etc.)
  - **Botones con significado**: Mantener colores pasteles sutiles (verde para confirmar, rojo para denegar)
  - **Avatares**: Usar `bg-blue-100 text-blue-700` para hombres, `bg-pink-100 text-pink-700` para mujeres
  - **Secciones/Columnas**: Usar fondos pasteles (`bg-green-50`, `bg-yellow-50`, `bg-red-50`) con bordes sutiles
  - **Nunca eliminar completamente los colores** - solo hacerlos más sutiles y pasteles

### Antes y Después

#### Botón

**Antes:**
```tsx
<button className="bg-gradient-to-r from-sky-500 to-blue-500 text-white py-3 px-4 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all">
  Enviar
</button>
```

**Después:**
```tsx
<button className="bg-black text-white py-3 px-4 font-normal text-sm hover:bg-[#333333] transition-colors">
  Enviar
</button>
```

#### Input

**Antes:**
```tsx
<input className="block w-full px-4 py-3 border rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300" />
```

**Después:**
```tsx
<input className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors" />
```

#### Card

**Antes:**
```tsx
<div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
```

**Después:**
```tsx
<div className="bg-white border border-[#e5e5e5] p-10">
```

---

## Ejemplos

### Formulario Completo

```tsx
<div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
  <div className="w-full max-w-md">
    <div className="text-center mb-12">
      <h1 className="text-2xl font-normal text-black mb-3 tracking-tight">
        Título
      </h1>
      <p className="text-sm text-[#666666] font-normal">
        Descripción
      </p>
    </div>

    <div className="bg-white border border-[#e5e5e5] p-10">
      <form className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-normal text-black mb-2 uppercase tracking-wide"
          >
            Nombre
          </label>
          <input
            id="name"
            type="text"
            className="block w-full px-4 py-3 border border-[#e5e5e5] bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors"
            placeholder="Ingresa tu nombre"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-3 px-4 font-normal text-sm hover:bg-[#333333] transition-colors"
        >
          Enviar
        </button>
      </form>
    </div>
  </div>
</div>
```

### Lista de Elementos

```tsx
<div className="bg-white border border-[#e5e5e5]">
  {items.map((item) => (
    <button
      key={item.id}
      className="w-full px-4 py-3 text-left hover:bg-[#fafafa] transition-colors border-b border-[#e5e5e5] last:border-b-0"
    >
      <p className="text-sm font-normal text-black">{item.name}</p>
      <p className="text-xs text-[#666666] mt-1">{item.description}</p>
    </button>
  ))}
</div>
```

---

## Referencia Rápida

### Clases Comunes

```tsx
// Fondo de página
bg-[#fafafa]

// Contenedor/Card
bg-white border border-[#e5e5e5] p-10

// Botón primario
bg-black text-white py-3 px-4 font-normal text-sm hover:bg-[#333333] transition-colors

// Input
border border-[#e5e5e5] bg-white text-black placeholder-[#999999] focus:outline-none focus:border-black transition-colors

// Label
text-xs font-normal text-black uppercase tracking-wide

// Texto principal
text-sm font-normal text-black

// Texto secundario
text-sm font-normal text-[#666666]

// Texto terciario
text-xs text-[#999999] font-normal
```

---

## Notas Importantes

1. **Consistencia**: Mantén el mismo estilo en toda la aplicación
2. **Accesibilidad**: El alto contraste (negro sobre blanco) mejora la legibilidad
3. **Espaciado**: No tengas miedo de usar mucho espacio en blanco
4. **Simplicidad**: Menos es más. Elimina efectos innecesarios
5. **Referencia**: Usa `SignIn.tsx` como ejemplo de implementación completa

---





