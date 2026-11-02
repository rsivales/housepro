import {describe,it,expect,beforeEach,vi} from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),client:vi.fn(),access:vi.fn(),request:vi.fn(),event:vi.fn(),calendars:vi.fn(),config:vi.fn()}));
vi.mock("@/lib/supabase/auth",()=>({getSession:m.session}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:m.client}));
vi.mock("@/lib/google-calendar",()=>({googleAccess:m.access,googleRequest:m.request,googleEvent:m.event,writableCalendars:m.calendars,googleConfig:m.config}));
import {POST,PATCH} from "./route";
const id="11111111-1111-1111-1111-111111111111";
const req=(method:string,body:unknown)=>new Request("http://localhost/api/calendar/google",{method,body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();m.session.mockResolvedValue({agent:{id:"owner"},demo:false});m.access.mockResolvedValue({accessToken:"token",calendarId:"mine"});m.event.mockReturnValue({id:"hel111",summary:"Visita"});m.request.mockResolvedValue({ok:true,status:200});m.calendars.mockResolvedValue([{id:"mine",summary:"A minha agenda"}]);});
describe("per-agent Google Calendar boundary",()=>{
 it("rejects another agent's visit before any Google call",async()=>{const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:null,error:null})};m.client.mockReturnValue({from:()=>q});expect((await POST(req("POST",{visitId:id}))).status).toBe(404);expect(q.eq).toHaveBeenCalledWith("owner_id","owner");expect(m.access).not.toHaveBeenCalled();});
 it("does not permit selecting a calendar the agent does not own",async()=>{expect((await PATCH(req("PATCH",{calendarId:"foreign"}))).status).toBe(403);expect(m.client).not.toHaveBeenCalled();});
 it("blocks Google writes in demonstration mode",async()=>{m.session.mockResolvedValue({agent:{id:"owner"},demo:true});expect((await POST(req("POST",{visitId:id}))).status).toBe(401);});
});
