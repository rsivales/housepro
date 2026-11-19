import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),authorized:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/supabase/auth',()=>({getSession:m.session}));
vi.mock('@/lib/db/agency-finance',()=>({authorizedAgency:m.authorized}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:m.rpc})}));
import {POST} from './route';
import {DEFAULT_REGIME} from '@/lib/data/commission-regime';
const id='11111111-1111-1111-1111-111111111111';
const request=(body:unknown)=>new Request('https://housepro.pt/api/agencies/commission-management',{method:'POST',body:JSON.stringify(body)});
const proposal={action:'request',kind:'regime',agencyId:id,version:0,payload:{...DEFAULT_REGIME,overrideTiers:[4,3,2,1]},reason:'Proposta fundamentada para a Marca'};
beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({agent:{id,roleKey:'diretor'},demo:false});m.authorized.mockResolvedValue({id});m.rpc.mockResolvedValue({data:id,error:null});});
describe('brand approval for commission changes',()=>{
 it('blocks signed-out, demo and view-as mutations before touching the database',async()=>{for(const s of [null,{demo:true},{viewingAs:true}]){m.session.mockResolvedValue(s);expect((await POST(request(proposal))).status).toBe(401);}expect(m.rpc).not.toHaveBeenCalled();});
 it('lets a broker propose but never directly authorize or update a commission',async()=>{const r=await POST(request(proposal));expect(r.status).toBe(200);expect(await r.json()).toMatchObject({pending:true});expect(m.rpc).toHaveBeenCalledWith('request_agency_management',expect.objectContaining({p_actor:id,p_version:0}));expect((await POST(request({action:'decide',id,approve:true,note:'Autorizado'}))).status).toBe(403);});
 it('checks agency scope and validates policy dates',async()=>{m.authorized.mockRejectedValueOnce(Error('forbidden'));expect((await POST(request(proposal))).status).toBe(403);expect((await POST(request({...proposal,kind:'agent_policy',agentId:id,payload:{joinedOn:'2099-01-01',annualRevenueGoal:60000,annualListingsGoal:12}}))).status).toBe(422);expect(m.rpc).not.toHaveBeenCalled();});
 it('refuses contribution tampering even through a proposal',async()=>{expect((await POST(request({...proposal,payload:{...DEFAULT_REGIME,royaltiesPct:0}}))).status).toBe(422);expect(m.rpc).not.toHaveBeenCalled();});
 it('requires a master decision with a reason and propagates stale/duplicate errors',async()=>{m.session.mockResolvedValue({agent:{id,roleKey:'superadmin'}});expect((await POST(request({action:'decide',id,approve:true,note:''}))).status).toBe(422);m.rpc.mockResolvedValue({error:{message:'stale_version'}});expect((await POST(request({action:'decide',id,approve:true,note:'Autorização da Marca'}))).status).toBe(409);expect(m.rpc).toHaveBeenCalledWith('decide_agency_management',{p_request:id,p_approve:true,p_note:'Autorização da Marca',p_actor:id});});
});
