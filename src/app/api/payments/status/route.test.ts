import {describe,it,expect,beforeEach,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),read:vi.fn(),write:vi.fn(),update:vi.fn()}));
vi.mock("@/lib/supabase/auth",()=>({getSession:m.session}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:m.read})}),update:(patch:unknown)=>{m.update(patch);return {eq:()=>({eq:()=>({select:()=>({maybeSingle:m.write})})})};}})})}));
import {POST} from "./route";
const id="11111111-1111-1111-1111-111111111111";
const request=(status="processado")=>new Request("http://localhost/api/payments/status",{method:"POST",body:JSON.stringify({id,status})});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({agent:{id:"director",roleKey:"diretor",agencyId:"agency"},demo:false});m.read.mockResolvedValue({data:{id,agency_id:"agency",role:"pensao",status:"pendente"},error:null});m.write.mockResolvedValue({data:{id},error:null});});
describe("recorded financial payment states",()=>{
 it("rejects supervision mutations",async()=>{m.session.mockResolvedValue({agent:{roleKey:"superadmin"},viewingAs:true});expect((await POST(request())).status).toBe(401);expect(m.read).not.toHaveBeenCalled();});
 it("rejects another agency's entries",async()=>{m.read.mockResolvedValue({data:{id,agency_id:"other",role:"pensao",status:"pendente"}});expect((await POST(request())).status).toBe(403);expect(m.update).not.toHaveBeenCalled();});
 it("reserves royalty confirmation for Brand",async()=>{m.read.mockResolvedValue({data:{id,agency_id:"agency",role:"royalties",status:"pendente"}});expect((await POST(request())).status).toBe(403);expect(m.update).not.toHaveBeenCalled();});
 it("cannot skip directly from pending to paid",async()=>{expect((await POST(request("pago"))).status).toBe(409);expect(m.update).not.toHaveBeenCalled();});
 it("writes only the payment status and confirmation timestamp",async()=>{expect((await POST(request())).status).toBe(200);expect(m.update).toHaveBeenCalledWith({status:"processado",paid_at:null});});
 it("does not report success after a concurrent change",async()=>{m.write.mockResolvedValue({data:null,error:null});expect((await POST(request())).status).toBe(409);});
});
