-- ═══════════════════════════════════════════════════════════════
--   CHOCOBAR HERNANDO — Seguridad de la base (RLS)
--   Pegar TODO en Supabase → SQL Editor → Run.
--   Se puede correr más de una vez sin problema.
-- ═══════════════════════════════════════════════════════════════

-- 1) Borrar las políticas que hubiera antes en las tablas
--    (si quedara alguna tipo "permitir todo", anularía las nuevas)
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('propiedades', 'tipos_propiedad', 'fotos_propiedad')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2) Activar RLS en las tres tablas
alter table public.propiedades     enable row level security;
alter table public.tipos_propiedad enable row level security;
alter table public.fotos_propiedad enable row level security;

-- 3) Cualquiera puede VER (la página pública lo necesita)
create policy "lectura publica" on public.propiedades
  for select to anon, authenticated using (true);
create policy "lectura publica" on public.tipos_propiedad
  for select to anon, authenticated using (true);
create policy "lectura publica" on public.fotos_propiedad
  for select to anon, authenticated using (true);

-- 4) Solo un usuario logueado (no anónimo) puede crear, editar o borrar
create policy "admin escribe" on public.propiedades
  for all to authenticated
  using      ((auth.jwt() ->> 'is_anonymous')::boolean is not true)
  with check ((auth.jwt() ->> 'is_anonymous')::boolean is not true);

create policy "admin escribe" on public.tipos_propiedad
  for all to authenticated
  using      ((auth.jwt() ->> 'is_anonymous')::boolean is not true)
  with check ((auth.jwt() ->> 'is_anonymous')::boolean is not true);

create policy "admin escribe" on public.fotos_propiedad
  for all to authenticated
  using      ((auth.jwt() ->> 'is_anonymous')::boolean is not true)
  with check ((auth.jwt() ->> 'is_anonymous')::boolean is not true);

-- 5) Fotos (Storage): borrar políticas viejas del bucket y crear la nueva.
--    El bucket es público, así que las fotos se siguen viendo sin política de lectura.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%propiedades-fotos%'
           or coalesce(with_check, '') ilike '%propiedades-fotos%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy "admin gestiona fotos" on storage.objects
  for all to authenticated
  using      (bucket_id = 'propiedades-fotos' and (auth.jwt() ->> 'is_anonymous')::boolean is not true)
  with check (bucket_id = 'propiedades-fotos' and (auth.jwt() ->> 'is_anonymous')::boolean is not true);

-- ═══════════════════════════════════════════════════════════════
--   OPCIONAL (más adelante): limitar a UN email concreto.
--   Cuando tengas el email del admin, reemplazá en los pasos 4 y 5
--     (auth.jwt() ->> 'is_anonymous')::boolean is not true
--   por
--     auth.jwt() ->> 'email' = 'EMAIL_DEL_ADMIN'
--   y volvé a correr todo el archivo.
-- ═══════════════════════════════════════════════════════════════
