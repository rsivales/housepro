create or replace function public.portfolio_caps(p_actor uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare a public.profiles; r text; defaults jsonb; override jsonb;
begin
 select * into a from public.profiles where id=p_actor and active is distinct from false;
 if not found then raise exception 'forbidden'; end if;
 r=coalesce(a.role_key,a.role::text,'agente');
 defaults=jsonb_build_object('viewAgency',r in ('admin','superadmin','diretor','coordenador'),'editAgency',r in ('admin','superadmin','diretor','coordenador'),'approveAgency',r in ('admin','superadmin','diretor','coordenador'),'duplicate',r in ('admin','superadmin','diretor','coordenador','agente','agente_ami'));
 select capabilities into override from public.property_portfolio_permissions where role_key=r;
 return defaults || coalesce(override,'{}') || jsonb_build_object('global',r in ('admin','superadmin'),'ownAMI',coalesce(a.own_ami,false) or r='agente_ami');
end; $$;
