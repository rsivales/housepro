import {describe,it,expect,beforeEach,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn(),config:vi.fn()}));
vi.mock('@/lib/supabase/auth',()=>({getSession:m.session}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:m.rpc})}));
vi.mock('@/lib/google-calendar',()=>({googleConfig:m.config,GOOGLE_CALLBACK:'https://housepro.pt/api/calendar/google/callback',GOOGLE_SCOPE:'scope1 scope2'}));
import {GET,PUT} from './route';
const req=(body:unknown)=>new Request('https://housepro.pt/api/admin/google-calendar',{method:'PUT',body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({agent:{id:'master',roleKey:'superadmin'}});m.config.mockResolvedValue({id:'id.apps.googleusercontent.com',secret:'secret-never-returned',redirect:'https://housepro.pt/api/calendar/google/callback',source:'stored'});m.rpc.mockResolvedValue({error:null});});
describe('central OAuth application settings',()=>{
 it('returns setup metadata without exposing the stored secret',async()=>{const r=await GET();expect(r.status).toBe(200);const body=await r.text();expect(body).toContain('secretConfigured');expect(body).not.toContain('secret-never-returned');});
 it('prevents agents and agency directors from reading or changing application credentials',async()=>{for(const roleKey of ['agente','diretor']){m.session.mockResolvedValue({agent:{roleKey}});expect((await GET()).status).toBe(403);expect((await PUT(req({}))).status).toBe(403);}expect(m.config).not.toHaveBeenCalled();expect(m.rpc).not.toHaveBeenCalled();});
 it('blocks demo and view-as writes',async()=>{for(const extra of [{demo:true},{viewingAs:true}]){m.session.mockResolvedValue({agent:{roleKey:'superadmin'},...extra});expect((await PUT(req({}))).status).toBe(403);}expect(m.rpc).not.toHaveBeenCalled();});
 it('requires an OAuth client and saves secrets only through the private configuration RPC',async()=>{expect((await PUT(req({clientId:'bad',secret:'password'}))).status).toBe(422);expect((await PUT(req({clientId:'id.apps.googleusercontent.com',secret:'private-secret'}))).status).toBe(200);expect(m.rpc).toHaveBeenCalledWith('set_google_calendar_app_config',{p_client_id:'id.apps.googleusercontent.com',p_secret:'private-secret',p_actor:'master'});});
});
