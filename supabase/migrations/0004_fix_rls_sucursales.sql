-- =========================================================================
-- Migración 0004: política de RLS faltante en `sucursales`
-- =========================================================================
-- Al probar en producción, la tabla `sucursales` quedó con Row Level
-- Security activado (por una configuración por defecto de Supabase) pero
-- sin ninguna política de lectura asociada. Esto bloqueaba cualquier
-- consulta a la tabla -incluso logueado- con el resultado "no se
-- encuentra ninguna sucursal activa", ya que sin una política de SELECT
-- explícita, RLS deniega todo por defecto.
-- =========================================================================

alter table sucursales enable row level security;

drop policy if exists "usuarios autenticados leen sucursales" on sucursales;
create policy "usuarios autenticados leen sucursales" on sucursales
  for select using (auth.role() = 'authenticated');
