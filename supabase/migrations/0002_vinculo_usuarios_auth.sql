-- =========================================================================
-- Migración 0002: vínculo entre Supabase Auth y la tabla `usuarios`
-- =========================================================================
-- Cuando creás un usuario en Authentication > Users (panel de Supabase),
-- Supabase lo guarda en auth.users pero no sabe nada de "dueño" o
-- "encargada" — eso es un concepto propio de este negocio. Este trigger
-- crea automáticamente la fila correspondiente en `usuarios` apenas se
-- crea el usuario de autenticación, tomando el rol desde los metadatos
-- que se le pasan al invitarlo (ver README, sección "Crear usuarios").
-- =========================================================================

create or replace function crear_usuario_desde_auth()
returns trigger as $$
begin
  insert into public.usuarios (auth_user_id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'rol')::rol_usuario, 'encargada')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_crear_usuario_desde_auth
  after insert on auth.users
  for each row execute function crear_usuario_desde_auth();
