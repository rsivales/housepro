import {describe,it,beforeEach,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({calls:[] as {table:string;method:string;args:unknown[]}[],agency:vi.fn(),workspaces:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('./agency-finance',()=>({agencyWorkspaces:m.workspaces,authorizedAgency:m.agency}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({from:(table:string)=>{const q:Record<string,unknown>={};for(const method of ['select','eq','in','order','limit','or'])q[method]=(...args:unknown[])=>{m.calls.push({table,method,args});return q;};q.then=(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:[],error:null}).then(resolve);return q;}})}));
import {helixFeesWorkspace} from './helix-fees';
import type {Agent} from '@/lib/data/types';
const master={id:'self',roleKey:'superadmin'} as Agent;
beforeEach(()=>{m.calls=[];vi.clearAllMocks();m.agency.mockResolvedValue({id:'agency',name:'Agency'});m.workspaces.mockResolvedValue([{id:'agency'}]);});
describe('fees workspace scope',()=>{
 it('does not promote a personal Super Admin view into a Brand or broker view',async()=>{const data=await helixFeesWorkspace(master);expect(data.master).toBe(false);expect(data.managed).toEqual([]);expect(m.workspaces).not.toHaveBeenCalled();expect(m.agency).not.toHaveBeenCalled();const filters=m.calls.filter(c=>c.method==='or');expect(filters).toHaveLength(3);for(const filter of filters)expect(filter.args).toEqual(['agent_id.eq.self']);expect(m.calls).toContainEqual({table:'profiles',method:'eq',args:['id','self']});});
 it('limits the agency view to an explicitly authorized agency and keeps Brand controls off',async()=>{const data=await helixFeesWorkspace(master,'agency','agency');expect(m.agency).toHaveBeenCalledWith(master,'agency');expect(data.master).toBe(false);for(const filter of m.calls.filter(c=>c.method==='or'))expect(filter.args).toEqual(['agency_id.in.(agency)']);});
 it('reserves the global Brand view for network finance administrators',async()=>{await expect(helixFeesWorkspace({id:'self',roleKey:'agente'} as Agent,'brand')).rejects.toThrow('forbidden');expect(m.calls).toHaveLength(0);});
});
