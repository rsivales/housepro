-- CRÍTICO — corrige has_role(), que bloqueava (silenciosamente, via RLS)
-- escritas de administração em várias tabelas para QUALQUER utilizador,
-- incluindo admin/superadmin.
--
-- has_role() verificava a tabela `user_roles`, pensada como "fonte de
-- verdade" para permissões — mas nenhum script de arranque alguma vez a
-- populou. Está vazia desde sempre. Por isso qualquer política RLS que
-- dependa de has_role() (site_settings — marca de água, logótipos, etc. — e
-- outras) rejeitava sempre a escrita, mesmo com a app a reconhecer
-- corretamente o papel do utilizador (isso usa profiles.role/role_key, um
-- sistema completamente à parte do RLS).
--
-- Corrige na fonte: has_role() passa a verificar profiles.role diretamente
-- (a mesma coluna que já é a fonte de verdade em toda a aplicação), sem
-- alterar nenhuma política — todas as que já usam has_role() ficam corrigidas
-- automaticamente. Seguro para correr mais do que uma vez.
create or replace function has_role(r user_role) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and (p.role = r or p.role = 'admin')
  )
$$;
