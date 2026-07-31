-- =========================================================================
-- Migración 0006: corrección masiva de precios en un solo llamado
-- =========================================================================
-- Problema detectado: la corrección de precios (y el importador) hacían
-- una consulta a la base por cada producto del archivo de KIBOO. Con
-- archivos de 1000+ filas, el tiempo total supera el límite de ejecución
-- de las funciones serverless de Vercel (10s en el plan gratuito), y el
-- proceso se corta a mitad de camino sin terminar de actualizar todo.
--
-- Solución: una única función de base de datos que recibe TODOS los
-- productos del archivo de una vez (como jsonb) y hace el cruce y la
-- actualización enteramente del lado de Postgres, en una sola llamada de
-- red desde el servidor de la aplicación — sin im portar cuántas filas
-- tenga el archivo.
-- =========================================================================

create or replace function corregir_precios_masivo(p_items jsonb)
returns jsonb as $$
declare
  item jsonb;
  v_producto_id uuid;
  v_actualizadas integer;
  v_actualizados_count integer := 0;
  v_sin_coincidencia_count integer := 0;
begin
  for item in select * from jsonb_array_elements(p_items) loop
    select id into v_producto_id
    from productos
    where nombre = (item->>'nombre')
    limit 1;

    if v_producto_id is null then
      v_sin_coincidencia_count := v_sin_coincidencia_count + 1;
      continue;
    end if;

    update variantes_producto
    set costo = (item->>'costo')::numeric,
        precio_venta = (item->>'precioVenta')::numeric
    where producto_id = v_producto_id;

    get diagnostics v_actualizadas = row_count;

    if v_actualizadas > 0 then
      v_actualizados_count := v_actualizados_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'productosActualizados', v_actualizados_count,
    'sinCoincidencia', v_sin_coincidencia_count,
    'totalProcesados', jsonb_array_length(p_items)
  );
end;
$$ language plpgsql security definer;
