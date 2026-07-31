-- =========================================================================
-- Migración 0007: Módulo de Caja (apertura, movimientos, cierre)
-- =========================================================================
-- Flujo real del negocio (según lo descripto por el dueño):
--   1. A la mañana se abre la caja con un saldo inicial en efectivo.
--   2. Durante el día, las ventas se registran contra esa caja abierta.
--      También puede haber retiros de efectivo (ej: comprar insumos de
--      limpieza) y, rara vez, ingresos manuales.
--   3. Al cerrar, el sistema calcula cuánto efectivo debería haber
--      (saldo inicial + ventas en efectivo + ingresos - retiros) y el
--      dueño/encargada carga cuánto contó realmente; el sistema muestra
--      la diferencia.
--
-- Decisión clave: una venta SOLO puede registrarse si hay una caja
-- abierta para la sucursal. Esto se refuerza en `registrar_venta`
-- (redefinida acá), no solo en la interfaz, para que nunca quede una
-- venta "flotando" sin pertenecer a ningún control de caja.
-- =========================================================================

create type estado_caja as enum ('abierta', 'cerrada');
create type tipo_movimiento_caja as enum ('retiro', 'ingreso');

create table cajas (
  id uuid primary key default gen_random_uuid(),
  sucursal_id uuid not null references sucursales(id),
  fecha_apertura timestamptz not null default now(),
  saldo_inicial numeric(12,2) not null default 0,
  usuario_apertura_id uuid references usuarios(id) on delete set null,
  fecha_cierre timestamptz,
  saldo_final_contado numeric(12,2),
  saldo_final_esperado numeric(12,2),
  diferencia numeric(12,2),
  usuario_cierre_id uuid references usuarios(id) on delete set null,
  estado estado_caja not null default 'abierta',
  created_at timestamptz not null default now()
);

-- Solo puede haber UNA caja abierta por sucursal a la vez.
create unique index idx_una_caja_abierta_por_sucursal
  on cajas(sucursal_id)
  where estado = 'abierta';

create index idx_cajas_sucursal_fecha on cajas(sucursal_id, fecha_apertura desc);

create table movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  caja_id uuid not null references cajas(id) on delete cascade,
  tipo tipo_movimiento_caja not null,
  monto numeric(12,2) not null check (monto > 0),
  motivo text not null,
  usuario_id uuid references usuarios(id) on delete set null,
  fecha timestamptz not null default now()
);

create index idx_movimientos_caja_caja on movimientos_caja(caja_id);

-- Se agrega el vínculo entre ventas y la caja en la que se registraron.
alter table ventas add column caja_id uuid references cajas(id);
create index idx_ventas_caja on ventas(caja_id);

-- =========================================================================
-- abrir_caja
-- =========================================================================
create or replace function abrir_caja(
  p_sucursal_id uuid,
  p_usuario_id uuid,
  p_saldo_inicial numeric
) returns uuid as $$
declare
  v_caja_id uuid;
begin
  if exists (select 1 from cajas where sucursal_id = p_sucursal_id and estado = 'abierta') then
    raise exception 'Ya hay una caja abierta para esta sucursal';
  end if;

  insert into cajas (sucursal_id, usuario_apertura_id, saldo_inicial)
  values (p_sucursal_id, p_usuario_id, p_saldo_inicial)
  returning id into v_caja_id;

  return v_caja_id;
end;
$$ language plpgsql security definer;

-- =========================================================================
-- registrar_movimiento_caja (retiro / ingreso manual)
-- =========================================================================
create or replace function registrar_movimiento_caja(
  p_caja_id uuid,
  p_usuario_id uuid,
  p_tipo tipo_movimiento_caja,
  p_monto numeric,
  p_motivo text
) returns uuid as $$
declare
  v_id uuid;
  v_estado estado_caja;
begin
  select estado into v_estado from cajas where id = p_caja_id;
  if v_estado is null then
    raise exception 'La caja no existe';
  end if;
  if v_estado <> 'abierta' then
    raise exception 'La caja ya está cerrada';
  end if;

  insert into movimientos_caja (caja_id, tipo, monto, motivo, usuario_id)
  values (p_caja_id, p_tipo, p_monto, p_motivo, p_usuario_id)
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer;

-- =========================================================================
-- cerrar_caja: calcula el efectivo esperado y registra el conteo real.
-- =========================================================================
create or replace function cerrar_caja(
  p_caja_id uuid,
  p_usuario_id uuid,
  p_saldo_contado numeric
) returns jsonb as $$
declare
  v_caja cajas%rowtype;
  v_total_ventas_efectivo numeric := 0;
  v_total_retiros numeric := 0;
  v_total_ingresos numeric := 0;
  v_esperado numeric;
begin
  select * into v_caja from cajas where id = p_caja_id;
  if v_caja.id is null then
    raise exception 'La caja no existe';
  end if;
  if v_caja.estado <> 'abierta' then
    raise exception 'La caja ya está cerrada';
  end if;

  select coalesce(sum(total), 0) into v_total_ventas_efectivo
  from ventas
  where caja_id = p_caja_id and medio_pago = 'efectivo' and estado <> 'anulada';

  select coalesce(sum(monto), 0) into v_total_retiros
  from movimientos_caja where caja_id = p_caja_id and tipo = 'retiro';

  select coalesce(sum(monto), 0) into v_total_ingresos
  from movimientos_caja where caja_id = p_caja_id and tipo = 'ingreso';

  v_esperado := v_caja.saldo_inicial + v_total_ventas_efectivo + v_total_ingresos - v_total_retiros;

  update cajas set
    fecha_cierre = now(),
    saldo_final_contado = p_saldo_contado,
    saldo_final_esperado = v_esperado,
    diferencia = p_saldo_contado - v_esperado,
    usuario_cierre_id = p_usuario_id,
    estado = 'cerrada'
  where id = p_caja_id;

  return jsonb_build_object(
    'saldo_final_esperado', v_esperado,
    'saldo_final_contado', p_saldo_contado,
    'diferencia', p_saldo_contado - v_esperado,
    'total_ventas_efectivo', v_total_ventas_efectivo,
    'total_retiros', v_total_retiros,
    'total_ingresos', v_total_ingresos
  );
end;
$$ language plpgsql security definer;

-- =========================================================================
-- registrar_venta (redefinida): ahora exige una caja abierta y la
-- vincula a la venta.
-- =========================================================================
create or replace function registrar_venta(
  p_sucursal_id uuid,
  p_usuario_id uuid,
  p_medio_pago medio_pago_venta,
  p_descuento_porcentaje numeric,
  p_items jsonb
) returns uuid as $$
declare
  v_venta_id uuid;
  v_caja_id uuid;
  v_subtotal numeric := 0;
  v_total numeric;
  v_requiere_factura boolean;
  item jsonb;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene ítems';
  end if;

  select id into v_caja_id from cajas
  where sucursal_id = p_sucursal_id and estado = 'abierta';

  if v_caja_id is null then
    raise exception 'No hay ninguna caja abierta. Abrí la caja antes de vender.';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal
      + (item->>'cantidad')::integer * (item->>'precio_unitario')::numeric;
  end loop;

  v_total := round(v_subtotal * (1 - p_descuento_porcentaje / 100), 2);
  v_requiere_factura := p_medio_pago <> 'efectivo';

  insert into ventas (
    sucursal_id, usuario_id, medio_pago, descuento_porcentaje,
    subtotal, total, requiere_factura, estado_factura, caja_id
  )
  values (
    p_sucursal_id, p_usuario_id, p_medio_pago, p_descuento_porcentaje,
    v_subtotal, v_total, v_requiere_factura,
    case when v_requiere_factura then 'pendiente' else 'no_aplica' end,
    v_caja_id
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
-- Row Level Security
-- =========================================================================
alter table cajas enable row level security;
alter table movimientos_caja enable row level security;

create policy "usuarios autenticados leen cajas" on cajas
  for select using (auth.role() = 'authenticated');
create policy "usuarios autenticados leen movimientos_caja" on movimientos_caja
  for select using (auth.role() = 'authenticated');
