import {expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),filter:vi.fn()}));
vi.mock('server-only',()=>({}));vi.mock('@/lib/supabase/admin',()=>({hasServiceRole:()=>true,createAdminClient:()=>({rpc:m.rpc,from:m.from})}));vi.mock('@/lib/email-delivery',()=>({emailDeliveryCredentials:vi.fn()}));
import {runMatching} from './server';
it('invalidates only active matching rows with an explicit filter required by production safeupdate',async()=>{
 const q={in:()=>q,order:()=>q,range:()=>Promise.resolve({data:[],error:null})};m.filter.mockResolvedValue({error:null});m.from.mockImplementation(()=>({select:()=>q,update:()=>({eq:m.filter})}));m.rpc.mockImplementation((_name,args)=>Promise.resolve({data:args?.p_token?{claimed:true}:{enabled:false},error:null}));
 expect(await runMatching()).toMatchObject({status:'ok',matches:0,accepted:0});expect(m.filter).toHaveBeenCalledExactlyOnceWith('active',true);
});
