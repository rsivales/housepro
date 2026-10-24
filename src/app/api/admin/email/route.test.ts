import {describe,it,expect,beforeEach,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),rpc:vi.fn(),notify:vi.fn()}));
vi.mock("@/lib/supabase/auth",()=>({getSession:m.session}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc:m.rpc})}));
vi.mock("@/lib/notify",()=>({notifyGeneric:m.notify}));
import {GET,PUT,POST} from "./route";
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({agent:{id:"brand",roleKey:"superadmin",email:"brand@example.invalid"},demo:false});m.rpc.mockResolvedValue({data:{sender:"email@example.invalid",enabled:true,keyConfigured:true,apiKey:"do-not-expose"},error:null});});
describe("administration email settings",()=>{
 it("does not expose credentials through the settings GET",async()=>{
  const r=await GET();expect(r.status).toBe(200);expect(await r.text()).not.toContain("do-not-expose");
 });
 it("blocks agency directors from network settings",async()=>{
  m.session.mockResolvedValue({agent:{roleKey:"diretor"},demo:false});
  expect((await GET()).status).toBe(403);expect(m.rpc).not.toHaveBeenCalled();
 });
 it("blocks writes and sends in supervision mode",async()=>{
  m.session.mockResolvedValue({agent:{roleKey:"superadmin",email:"brand@example.invalid"},viewingAs:true});
  expect((await PUT(new Request("http://localhost",{method:"PUT",body:"{}"}))).status).toBe(403);
  expect((await POST()).status).toBe(403);expect(m.rpc).not.toHaveBeenCalled();expect(m.notify).not.toHaveBeenCalled();
 });
 it("sends tests only to the authenticated administrator",async()=>{
  m.notify.mockResolvedValue(["email"]);expect((await POST()).status).toBe(200);
  expect(m.notify.mock.calls[0][0].to).toEqual(["brand@example.invalid"]);
 });
});
