import {describe,it,expect,beforeEach,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),create:vi.fn(),update:vi.fn()}));
vi.mock("@/lib/supabase/auth",()=>({getSession:m.session}));
vi.mock("@/lib/db/repo",()=>({createVisit:m.create,updateVisit:m.update}));
import {POST,PATCH} from "./route";
const id="11111111-1111-1111-1111-111111111111";
const request=(method:string,extra:Record<string,unknown>={})=>new Request("http://localhost/api/visits",{method,body:JSON.stringify({id,kind:"visita",at:"2026-11-03T14:00:00.000Z",durationMin:60,contactName:"Cliente",location:"Rua de Faro, 18",...extra})});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({agent:{id:"owner"}});m.create.mockResolvedValue({id,...{kind:"visita",at:"2026-11-03T14:00:00.000Z"}});m.update.mockResolvedValue({id});});
describe("agenda event writes",()=>{
 it("saves the location and exact time with the owner",async()=>{expect((await POST(request("POST"))).status).toBe(200);expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ownerId:"owner",location:"Rua de Faro, 18",at:"2026-11-03T14:00:00.000Z"}));});
 it("edits only under the authenticated owner and rejects a missing event",async()=>{expect((await PATCH(request("PATCH"))).status).toBe(200);expect(m.update).toHaveBeenCalledWith("owner",id,expect.objectContaining({location:"Rua de Faro, 18"}));m.update.mockResolvedValue(null);expect((await PATCH(request("PATCH"))).status).toBe(404);});
 it("rejects invalid dates, duration and unauthenticated writes",async()=>{expect((await POST(request("POST",{at:"2026-02-30T14:00:00.000Z"}))).status).toBe(422);expect((await PATCH(request("PATCH",{durationMin:0}))).status).toBe(422);m.session.mockResolvedValue(null);expect((await POST(request("POST"))).status).toBe(401);});
});
