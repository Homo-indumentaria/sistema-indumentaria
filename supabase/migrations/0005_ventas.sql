-- =========================================================================
-- Migración 0005: Módulo de Ventas (punto de venta)
-- =========================================================================
-- Decisiones clave (ver Decisiones-de-Arquitectura.md):
--   * El precio se "fotografía" en venta_items.precio_unitario_venta: no
--     cambia retroactivamente si después se actualiza el precio del
--     producto.
--   * Efectivo NO requiere factura; todo otro medio de pago sí
--     (`requiere_factura`), quedando en estado 'pendiente' hasta que se
--     conecte la integración real con ARCA (módulo de Facturación,
--     todavía no implementado).
--   * Venta y descuento de stock son atómicos: se hacen dentro de una
--     única función de base de datos (`registrar_venta`), no como una
--     secuencia de llamadas desde el frontend. Si algo falla a mitad de
--     camino (por ejemplo, stock insuficiente en el segundo ítem del
--     carrito), TODA la venta se cancela — nunca queda una venta a medias
--     con el stock descontado parcialmente.
-- =========================================================================

create type medio_pago_venta as enum (
  'efectivo',
  'transferencia',
  'debito',
  'credito',
  'qr'
);

create type estado_venta as enum (
  'completada',
  'anulada',
  'con_cambio'
);

create type estado_factura_venta as enum (
  'no_aplica',
  'pendiente',
  'emitida',
  'error'
);

create type tipo_cambio_devolucion as enum (
  'cambio',
  'devolucion'
);

-- -------------------------------------------------------------------------
-- Secuencia de numeración de venta (correlativo, independiente del id uuid)
-- -------------------------------------------------------------------------
create sequence if not exists numero_venta_seq start 1;

create table ventas (
  id uuid primary key default gen_random_uuid(),
  numero_venta integer not null default nextval('numero_venta_seq') unique,
  fecha timestamptz not null default now(),
  sucursal_id uuid not null references sucursales(id),
  usuario_id uuid references usuarios(id) on delete set null,
  medio_pago medio_pago_venta not null,
  descuento_porcentaje numeric(5,2) not null default 0,
  subtotal numeric(12,2) not null,
  total numeric(12,2) not null,
  estado estado_venta not null default 'completada',
  requiere_factura boolean not null default false,
  estado_factura estado_factura_venta not null default 'no_aplica',
  created_at timestamptz not null default now()
);

create index idx_ventas_fecha on ventas(fecha desc);
create index idx_ventas_sucursal on ventas(sucursal_id, fecha desc);

create table venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  variante_id uuid not null references variantes_producto(id),
  cantidad integer not null check (cantidad > 0),
  precio_unitario_venta numeric(12,2) not null, -- fotografiado al momento de la venta
  subtotal numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index idx_venta_items_venta on venta_items(venta_id);
create index idx_venta_items_variante on venta_items(variante_id);

create table cambios_devoluciones (
  id uuid primary key default gen_random_uuid(),
  venta_original_id uuid not null references ventas(id),
  tipo tipo_cambio_devolucion not null,
  variante_devuelta_id uuid not null references variantes_producto(id),
  cantidad_devuelta integer not null check (cantidad_devuelta > 0),
  variante_nueva_id uuid references variantes_producto(id), -- solo si tipo = 'cambio'
  cantidad_nueva integer check (cantidad_nueva > 0),
  motivo text,
  usuario_id uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_cambios_venta on cambios_devoluciones(venta_original_id);

-- Ahora que existe `ventas`, se agrega la referencia formal que había
-- quedado pendiente en `movimientos_stock` (migración 0001).
alter table movimientos_stock
  add constraint fk_movimientos_venta foreign key (venta_id) references ventas(id);

-- =========================================================================
-- registrar_venta: crea la venta, sus ítems y descuenta el stock de forma
-- atómica. Si el trigger de stock (aplicar_movimiento_stock) rechaza
-- algún ítem por falta de stock, toda la operación se revierte.
-- =========================================================================
create or replace function registrar_venta(
  p_sucursal_id uuid,
  p_usuario_id uuid,
  p_medio_pago medio_pago_venta,
  p_descuento_porcentaje numeric,
  p_items jsonb -- [{ "variante_id": "...", "cantidad": 2, "precio_unitario": 15000 }, ...]
) returns uuid as $$
declare
  v_venta_id uuid;
  v_subtotal numeric := 0;
  v_total numeric;
  v_requiere_factura boolean;
  item jsonb;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene ítems';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal
      + (item->>'cantidad')::integer * (item->>'precio_unitario')::numeric;
  end loop;

  v_total := round(v_subtotal * (1 - p_descuento_porcentaje / 100), 2);
  v_requiere_factura := p_medio_pago <> 'efectivo';

  insert into ventas (
    sucursal_id, usuario_id, medio_pago, descuento_porcentaje,
    subtotal, total, requiere_factura, estado_factura
  )
  values (
    p_sucursal_id, p_usuario_id, p_medio_pago, p_descuento_porcentaje,
    v_subtotal, v_total, v_requiere_factura,
    case when v_requiere_factura then 'pendiente' else 'no_aplica' end
  )
  returning id into v_venta_id;

  for item in select * from jsonb_array_elements(p_items) loop
    insert into venta_items (venta_id, variante_id, cantidad, precio_unitario_venta, subtotal)
    values (
      v_venta_id,
      (item->>'variante_id')::uuid,
      (item->>'cantidad')::integer,
      (item->>'precio_unitario')::numeric,
      (item->>'cantidad')::integer * (item->>'precio_unitario')::numeric
    );

    -- Descuenta stock. El trigger existente rechaza (raise exception) si
    -- el stock resultante sería negativo, lo que aborta TODA la función.
    insert into movimientos_stock (variante_id, sucursal_id, tipo, cantidad, motivo, usuario_id, venta_id)
    values (
      (item->>'variante_id')::uuid,
      p_sucursal_id,
      'venta',
      -1 * (item->>'cantidad')::integer,
      'Venta #' || (select numero_venta from ventas where id = v_venta_id),
      p_usuario_id,
      v_venta_id
    );
  end loop;

  return v_venta_id;
end;
$$ language plpgsql security definer;

-- =========================================================================
-- registrar_cambio_devolucion: repone stock del producto devuelto y,
-- si es un cambio, descuenta stock del producto nuevo. Atómico por el
-- mismo motivo que registrar_venta.
-- =========================================================================
create or replace function registrar_cambio_devolucion(
  p_venta_original_id uuid,
  p_sucursal_id uuid,
  p_usuario_id uuid,
  p_tipo tipo_cambio_devolucion,
  p_variante_devuelta_id uuid,
  p_cantidad_devuelta integer,
  p_variante_nueva_id uuid default null,
  p_cantidad_nueva integer default null,
  p_motivo text default null
) returns uuid as $$
declare
  v_id uuid;
begin
  if p_tipo = 'cambio' and (p_variante_nueva_id is null or p_cantidad_nueva is null) then
    raise exception 'Un cambio necesita indicar la variante y cantidad nueva';
  end if;

  insert into cambios_devoluciones (
    venta_original_id, tipo, variante_devuelta_id, cantidad_devuelta,
    variante_nueva_id, cantidad_nueva, motivo, usuario_id
  )
  values (
    p_venta_original_id, p_tipo, p_variante_devuelta_id, p_cantidad_devuelta,
    p_variante_nueva_id, p_cantidad_nueva, p_motivo, p_usuario_id
  )
  returning id into v_id;

  -- Repone stock de lo devuelto
  insert into movimientos_stock (variante_id, sucursal_id, tipo, cantidad, motivo, usuario_id, venta_id)
  values (
    p_variante_devuelta_id, p_sucursal_id, 'devolucion', p_cantidad_devuelta,
    coalesce(p_motivo, 'Devolución de venta'), p_usuario_id, p_venta_original_id
  );

  -- Si es cambio, descuenta stock de la variante nueva (puede fallar si no hay stock)
  if p_tipo = 'cambio' then
    insert into movimientos_stock (variante_id, sucursal_id, tipo, cantidad, motivo, usuario_id, venta_id)
    values (
      p_variante_nueva_id, p_sucursal_id, 'venta', -1 * p_cantidad_nueva,
      coalesce(p_motivo, 'Cambio de venta'), p_usuario_id, p_venta_original_id
    );
  end if;

  update ventas set estado = 'con_cambio' where id = p_venta_original_id;

  return v_id;
end;
$$ language plpgsql security definer;

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table ventas enable row level security;
alter table venta_items enable row level security;
alter table cambios_devoluciones enable row level security;

create policy "usuarios autenticados leen ventas" on ventas
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados leen venta_items" on venta_items
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados leen cambios" on cambios_devoluciones
  for select using (auth.role() = 'authenticated');

-- Las escrituras se hacen exclusivamente a través de las funciones
-- registrar_venta / registrar_cambio_devolucion (security definer), así
-- que no se necesitan políticas de insert directas sobre estas tablas.
