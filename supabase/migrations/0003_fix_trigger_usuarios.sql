-- =========================================================================
-- Migración 0003: eliminar el trigger automático de vínculo Auth -> usuarios
-- =========================================================================
-- Ver nota en 0002_vinculo_usuarios_auth.sql. El trigger automático llegó
-- a bloquear la creación de usuarios desde el panel de Supabase. Se
-- elimina y se reemplaza por un proceso manual de 2 pasos, documentado
-- en el README ("Crear usuarios"):
--
--   1) Crear el usuario en Authentication > Users > Add user.
--   2) Ejecutar:
--        insert into usuarios (auth_user_id, nombre, email, rol)
--        select id, 'Nombre de la persona', email, 'dueno'  -- o 'encargada'
--        from auth.users
--        where email = 'el-email-que-usaste@ejemplo.com';
--
-- Es un paso manual extra, pero es más confiable y más fácil de
-- diagnosticar que la vinculación automática si algo sale mal.
-- =========================================================================

drop trigger if exists trg_crear_usuario_desde_auth on auth.users;
drop function if exists crear_usuario_desde_auth();
