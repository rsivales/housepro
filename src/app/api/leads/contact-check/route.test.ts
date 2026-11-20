import {expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn()}));vi.mock('@/lib/supabase/auth',()=>({getSession:m.session}));vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:m.rpc})}));
import {POST} from './route';
it('does not trust browser warning timestamps or change ownership',async()=>{m.session.mockResolvedValue({agent:{id:'actual'}});m.rpc.mockResolvedValue({data:[]});expect((await POST()).status).toBe(200);expect(m.rpc).toHaveBeenCalledExactlyOnceWith('check_my_lead_followups',{p_actor:'actual'});});
it('does not run checks in supervision mode',async()=>{m.rpc.mockClear();m.session.mockResolvedValue({viewingAs:true,agent:{id:'actual'}});expect((await POST()).status).toBe(403);expect(m.rpc).not.toHaveBeenCalled();});
