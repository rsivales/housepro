import {describe,it,expect,beforeEach,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),allowed:vi.fn(),client:vi.fn()}));
vi.mock("@/lib/supabase/auth",()=>({getSession:m.session}));
vi.mock("@/lib/db/agency-finance",()=>({authorizedAgency:m.allowed}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:m.client}));
import {POST} from "./route";
const agencyId="11111111-1111-1111-1111-111111111111";
const request=(extra:Record<string,unknown>={})=>new Request("http://localhost/api/agencies/cash",{method:"POST",body:JSON.stringify({agencyId,kind:"expense",category:"software",description:"Serviço de software",amount:10,date:"2026-10-24",requestId:"22222222-2222-2222-2222-222222222222",...extra})});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({agent:{id:"broker",roleKey:"agente"},demo:false});m.allowed.mockResolvedValue({id:agencyId});m.client.mockReturnValue({});});
describe("broker cash write boundary",()=>{
 it("blocks signed-out and supervision writes",async()=>{m.session.mockResolvedValue(null);expect((await POST(request())).status).toBe(401);m.session.mockResolvedValue({viewingAs:true,agent:{roleKey:"superadmin"}});expect((await POST(request())).status).toBe(401);expect(m.client).not.toHaveBeenCalled();});
 it("rejects a forged agency before accessing cash rows",async()=>{m.allowed.mockRejectedValue(new Error("forbidden"));expect((await POST(request())).status).toBe(403);expect(m.client).not.toHaveBeenCalled();});
 it("does not accept negative or fractional-cent accounting entries",async()=>{expect((await POST(request({amount:-1}))).status).toBe(422);expect((await POST(request({amount:1.001}))).status).toBe(422);});
 it("validates category ownership and real calendar dates",async()=>{expect((await POST(request({category:"constructor"}))).status).toBe(422);expect((await POST(request({category:"commission"}))).status).toBe(422);expect((await POST(request({date:"2026-02-30"}))).status).toBe(422);});
});
