import {describe,it,expect} from 'vitest';
import {navigationAccess,navigationGroups,linkIsActive} from './navigation';
import type {Agent} from '@/lib/data/types';
const actor=(roleKey:string,publicTitle?:string)=>({id:'self',roleKey,publicTitle}) as Agent;
const links=(a:Agent,broker=false)=>navigationGroups(navigationAccess(a,broker)).flatMap(g=>g.items.map(i=>i.href));
describe('role-aware Helix navigation',()=>{
 it('keeps broker and Brand approvals out of a consultant menu',()=>{expect(links(actor('agente'))).toContain('/app/crm');expect(links(actor('agente'))).not.toContain('/app/broker');expect(links(actor('agente'))).not.toContain('/app/aprovacoes-comissoes');});
 it('includes actual broker tools while reserving approval to the master',()=>{expect(links(actor('diretor'),true)).toContain('/app/broker/comissionamento');expect(links(actor('diretor'),true)).not.toContain('/app/aprovacoes-comissoes');expect(links(actor('superadmin'))).toContain('/app/aprovacoes-comissoes');});
 it('distinguishes Brand-only supervisors from supervisors who also work as consultants',()=>{expect(links(actor('superadmin'))).not.toContain('/app/crm');expect(links(actor('superadmin','Consultor HousePro'))).toContain('/app/crm');});
 it('does not highlight every Brand page as the Brand home or confuse similarly named paths',()=>{expect(linkIsActive('/admin/agencias','/admin')).toBe(false);expect(linkIsActive('/app/crm/abc','/app/crm')).toBe(true);expect(linkIsActive('/app/leads-dashboard','/app/leads')).toBe(false);});
});
