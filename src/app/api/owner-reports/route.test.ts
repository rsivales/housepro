import { beforeEach, expect, it, vi } from "vitest";
import { GET, POST, PUT } from "./route";
const mocks=vi.hoisted(()=>({session:vi.fn(),admin:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/auth",()=>({getSession:mocks.session}));
vi.mock("@/lib/supabase/admin",()=>({hasServiceRole:()=>true,createAdminClient:mocks.admin}));
vi.mock("@/lib/portfolio/server",()=>({UUID:/^[0-9a-f-]{36}$/i}));
beforeEach(()=>{vi.resetAllMocks();});
it.each([null,{demo:true,agent:{}},{viewingAs:true,agent:{}}])("blocks unavailable or impersonated sessions %#",async session=>{
 mocks.session.mockResolvedValue(session);
 const request=()=>new Request("http://localhost/api/owner-reports",{method:"POST",body:"{}"});
 expect((await GET()).status).toBe(401);
 expect((await POST(request())).status).toBe(401);
 expect((await PUT(request())).status).toBe(401);
 expect(mocks.admin).not.toHaveBeenCalled();
});
