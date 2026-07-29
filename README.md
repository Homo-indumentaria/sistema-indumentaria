# Sistema de Gestión — Indumentaria Masculina

Sistema propio para reemplazar a KIBOO. Módulo entregado: **Productos y Stock**, con login y roles.

## Qué incluye esta entrega

- Login con email y contraseña (Supabase Auth), rutas protegidas.
- Roles dueño / encargada, visibles en el encabezado de la app.
- Catálogo de productos con variantes por talle y color.
- Código interno autogenerado por variante (PRD-000001, PRD-000002, ...).
- Alta de producto con múltiples variantes en un solo formulario.
- Edición de producto: datos generales, edición de cada variante (talle, color, costo, precio), alta de variantes nuevas sobre un producto existente.
- Ajuste manual de stock con motivo, desde la pantalla de edición (por ejemplo, para volcar el resultado de un recuento físico).
- Alertas de stock mínimo en la pantalla principal.
- Historial de movimientos de stock (nunca se pisa el número, todo queda registrado).
- Preparado desde el modelo de datos para múltiples sucursales a futuro.

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto en Supabase
1. Entrá a supabase.com, creá una cuenta (gratis) y un proyecto nuevo.
2. Elegí una contraseña para la base de datos y guardala en un lugar seguro.
3. En Project Settings > API, copiá Project URL y anon public key.

### 2. Configurar las variables de entorno
Copiá `.env.example` como `.env.local` y completá:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

### 3. Ejecutar las migraciones de base de datos
En el SQL Editor de Supabase, ejecutá en orden:
1. `supabase/migrations/0001_productos_stock.sql`
2. `supabase/migrations/0002_vinculo_usuarios_auth.sql`

### 4. Crear tus usuarios (dueño y encargada)
Este paso tiene 2 partes: crear el login en Supabase Auth, y decirle al
sistema qué rol tiene esa persona (dueño / encargada).

**Parte A — crear el login:**
1. Panel de Supabase → Authentication → Users → "Add user" → "Create new user".
2. Cargá email y contraseña.
3. Asegurate de tildar **"Auto confirm user?"**.
4. "Create user".

**Parte B — asignar el rol:**
En el SQL Editor, ejecutá (cambiando el email y el nombre según corresponda):
```sql
insert into usuarios (auth_user_id, nombre, email, rol)
select id, 'Nombre de la persona', email, 'dueno'  -- o 'encargada' para la empleada
from auth.users
where email = 'el-email-que-usaste@ejemplo.com';
```
Repetí la Parte A y B para cada persona que vaya a usar el sistema.

### 5. Correr el proyecto
```bash
npm install
npm run dev
```
Abrí http://localhost:3000 — te pide login y después te lleva a Productos.

## Estructura del proyecto
```
src/app/login/              -> pantalla de ingreso
src/app/productos/          -> pantallas de Next.js (listado, alta, edición)
src/app/api/productos/      -> endpoints backend (API) de productos y variantes
src/app/api/stock/          -> endpoints de movimientos de stock
src/app/api/variantes/      -> endpoint de edición de una variante puntual
src/modules/productos/      -> tipos, validaciones y lógica de negocio del módulo
src/modules/inventario/     -> componentes de alertas de stock
src/modules/compartido/     -> componentes de UI reutilizables (Button, Badge, Encabezado)
src/proxy.ts                -> protección de rutas (requiere sesión iniciada)
supabase/migrations/        -> esquema de base de datos versionado
```

## Qué falta para dar el módulo por completo
- Importador del Excel de KIBOO para migrar tu catálogo actual.
- Restringir en la interfaz lo que ve la encargada según el rol (hoy el rol
  se muestra pero no hay ninguna pantalla que deba ocultársele todavía —
  eso cobra sentido cuando sumemos reportes/caja).
- Pruebas automatizadas de los cálculos de precio y de los movimientos de stock.

## Notas técnicas importantes
- El precio que se guarda en cada venta futura será "fotografiado" (no
  cambia retroactivamente si mañana actualizás precios).
- El stock nunca se escribe directo: todo pasa por `movimientos_stock`,
  así que en cualquier momento se puede reconstruir por qué cambió.
- Las rutas de la app están protegidas por `src/proxy.ts`: sin sesión
  iniciada, redirige a /login.
