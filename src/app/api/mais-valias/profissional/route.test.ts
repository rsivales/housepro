import {describe,it,expect,beforeEach,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),submit:vi.fn()}));
vi.mock('@/lib/supabase/auth',()=>({getSession:m.session}));
vi.mock('../route',()=>({POST:m.submit}));
import {POST} from './route';
const req=(body:unknown)=>new Request('https://housepro.pt/api/mais-valias/profissional',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({agent:{id:'real-consultant'}});m.submit.mockResolvedValue(new Response('{}'));});
describe('professional capital gains report attribution',()=>{
 it('binds report leads to the signed-in consultant despite a spoofed referral',async()=>{await POST(req({ref:'other-agent',pageUrl:'https://other.invalid',email:'client@example.invalid'}));const body=await m.submit.mock.calls[0][0].json();expect(body.ref).toBe('real-consultant');expect(body.pageUrl).toBe('https://housepro.pt/app/ferramentas?tab=maisvalias');});
 it('does not submit or send reports from signed-out, demo or view-as sessions',async()=>{for(const s of [null,{demo:true},{viewingAs:true}]){m.session.mockResolvedValue(s);expect((await POST(req({}))).status).toBe(401);}expect(m.submit).not.toHaveBeenCalled();});
});
