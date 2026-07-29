-- =========================================================================
-- Migración 0001: Módulo de Productos y Stock
-- Sistema de Gestión — Indumentaria Masculina
-- =========================================================================
-- Convenciones:
--   * Todas las tablas usan uuid como PK (evita colisiones, seguro para
--     exponer en URLs/API sin filtrar información secuencial del negocio).
--   * created_at / updated_at en todas las tablas para auditoría.
--   * Nombres en español, snake_case, consistentes con el vocabulario
--     del negocio (documento de Decisiones de Arquitectura).
-- =========================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- Roles de usuario (dueño / encargada)
-- -------------------------------------------------------------------------
create type rol_usuario as enum ('dueno', 'encargada');

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null unique,
  rol rol_usuario not null default 'encargada',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- Sucursales (hoy: un solo registro. Preparado para crecer sin migrar nada)
-- -------------------------------------------------------------------------
create table sucursales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

insert into sucursales (nombre, direccion)
values ('Local Principal', null);

-- -------------------------------------------------------------------------
-- Catálogo: marcas y categorías
-- -------------------------------------------------------------------------
create table marcas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_padre_id uuid references categorias(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (nombre, categoria_padre_id)
);

-- -------------------------------------------------------------------------
-- Productos (el "modelo" general, ej: "Remera Lacoste Piqué")
-- -------------------------------------------------------------------------
create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  marca_id uuid references marcas(id) on delete set null,
  categoria_id uuid references categorias(id) on delete set null,
  margen_default numeric(5,2), -- % de margen sugerido para calcular precio_venta de sus variantes
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_productos_marca on productos(marca_id);
create index idx_productos_categoria on productos(categoria_id);
create index idx_productos_nombre on productos using gin (to_tsvector('spanish', nombre));

-- -------------------------------------------------------------------------
-- Variantes de producto (talle + color = unidad real de venta y stock)
-- -------------------------------------------------------------------------
create table variantes_producto (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  codigo_interno text not null unique, -- autogenerado, se usa para etiquetar y vender
  talle text not null,
  color text not null,
  costo numeric(12,2) not null default 0,
  precio_venta numeric(12,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (producto_id, talle, color)
);

create index idx_variantes_producto on variantes_producto(producto_id);
create index idx_variantes_codigo on variantes_producto(codigo_interno);

-- -------------------------------------------------------------------------
-- Stock por variante y sucursal
-- -------------------------------------------------------------------------
create table stock (
  variante_id uuid not null references variantes_producto(id) on delete cascade,
  sucursal_id uuid not null references sucursales(id) on delete cascade,
  cantidad integer not null default 0 check (cantidad >= 0),
  stock_minimo integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (variante_id, sucursal_id)
);

create index idx_stock_bajo on stock(sucursal_id) where cantidad <= stock_minimo;

-- -------------------------------------------------------------------------
-- Movimientos de stock (historial inmutable — nunca se pisa el stock)
-- -------------------------------------------------------------------------
create type tipo_movimiento_stock as enum (
  'ingreso_compra',
  'venta',
  'ajuste_manual',
  'devolucion'
);

create table movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references variantes_producto(id) on delete cascade,
  sucursal_id uuid not null references sucursales(id) on delete cascade,
  tipo tipo_movimiento_stock not null,
  cantidad integer not null, -- positivo = ingreso, negativo = egreso
  motivo text,
  usuario_id uuid references usuarios(id) on delete set null,
  venta_id uuid, -- se referencia cuando exista el módulo de ventas
  created_at timestamptz not null default now()
);

create index idx_movimientos_variante on movimientos_stock(variante_id, created_at desc);
create index idx_movimientos_sucursal on movimientos_stock(sucursal_id, created_at desc);

-- =========================================================================
-- Función + Trigger: registrar movimiento de stock actualiza `stock` solo
-- Mantiene `stock.cantidad` siempre consistente con la suma de movimientos,
-- sin que el frontend tenga que calcular ni actualizar cantidades a mano.
-- =========================================================================
create or replace function aplicar_movimiento_stock()
returns trigger as $$
begin
  insert into stock (variante_id, sucursal_id, cantidad, stock_minimo)
  values (new.variante_id, new.sucursal_id, greatest(new.cantidad, 0), 0)
  on conflict (variante_id, sucursal_id)
  do update set
    cantidad = stock.cantidad + new.cantidad,
    updated_at = now();

  if (select cantidad from stock where variante_id = new.variante_id and sucursal_id = new.sucursal_id) < 0 then
    raise exception 'Movimiento inválido: el stock resultante sería negativo para la variante %', new.variante_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_aplicar_movimiento_stock
  after insert on movimientos_stock
  for each row execute function aplicar_movimiento_stock();

-- =========================================================================
-- Función: generar código interno autoincremental (ej: PRD-000001)
-- =========================================================================
create sequence if not exists codigo_interno_seq start 1;

create or replace function generar_codigo_interno()
returns trigger as $$
begin
  if new.codigo_interno is null or new.codigo_interno = '' then
    new.codigo_interno := 'PRD-' || lpad(nextval('codigo_interno_seq')::text, 6, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_generar_codigo_interno
  before insert on variantes_producto
  for each row execute function generar_codigo_interno();

-- =========================================================================
-- updated_at automático
-- =========================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger trg_productos_updated_at before update on productos
  for each row execute function set_updated_at();
create trigger trg_variantes_updated_at before update on variantes_producto
  for each row execute function set_updated_at();
create trigger trg_usuarios_updated_at before update on usuarios
  for each row execute function set_updated_at();

-- =========================================================================
-- Row Level Security — todo usuario autenticado del negocio puede leer;
-- solo se restringe lo que la interfaz ya oculta a "encargada" (reportes,
-- que se sumará en un módulo futuro). Por ahora ambos roles operan sobre
-- productos/stock según lo definido en Etapa 1.
-- =========================================================================
alter table productos enable row level security;
alter table variantes_producto enable row level security;
alter table stock enable row level security;
alter table movimientos_stock enable row level security;
alter table marcas enable row level security;
alter table categorias enable row level security;
alter table usuarios enable row level security;

create policy "usuarios autenticados leen catalogo" on productos
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados escriben catalogo" on productos
  for all using (auth.role() = 'authenticated');

create policy "usuarios autenticados leen variantes" on variantes_producto
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados escriben variantes" on variantes_producto
  for all using (auth.role() = 'authenticated');

create policy "usuarios autenticados leen stock" on stock
  for select using (auth.role() = 'authenticated');

create policy "usuarios autenticados leen movimientos" on movimientos_stock
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados insertan movimientos" on movimientos_stock
  for insert with check (auth.role() = 'authenticated');

create policy "usuarios autenticados leen marcas" on marcas
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados escriben marcas" on marcas
  for all using (auth.role() = 'authenticated');

create policy "usuarios autenticados leen categorias" on categorias
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados escriben categorias" on categorias
  for all using (auth.role() = 'authenticated');

create policy "usuarios ven su propio perfil" on usuarios
  for select using (auth.uid() = auth_user_id);
