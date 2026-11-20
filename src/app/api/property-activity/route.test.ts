import { beforeEach,expect,it,vi } from "vitest";
import { GET,POST } from "./route";

const mocks=vi.hoisted(()=>({session:vi.fn(),allowed:vi.fn(),admin:vi.fn(),hasRole:vi.fn()}));
vi.mock("@/lib/supabase/auth",()=>({getSession:mocks.session}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:mocks.admin,hasServiceRole:mocks.hasRole}));
vi.mock("@/lib/portfolio/server",()=>({mayEditProperty:mocks.allowed,UUID:/^[a-f0-9-]{36}$/i}));
vi.mock("@/lib/db/crm-lead-pipelines",()=>({crmLeadPipelines:vi.fn()}));
vi.mock("@/lib/matching/server",()=>({runMatching:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();mocks.hasRole.mockReturnValue(true);});

it.each([null,{demo:true,agent:{}},{viewingAs:true,agent:{}}])("rejects historical documents in unavailable or impersonated sessions %#",async session=>{
 mocks.session.mockResolvedValue(session);
 const url="http://localhost/api/property-activity?propertyId=11111111-1111-4111-8111-111111111111";
 expect((await GET(new Request(url))).status).toBe(403);
 const form=new FormData();form.set("propertyId","11111111-1111-4111-8111-111111111111");
 expect((await POST(new Request(url,{method:"POST",body:form}))).status).toBe(403);
 expect(mocks.admin).not.toHaveBeenCalled();
});

it("rejects a consultant without edit access before querying private history",async()=>{
 mocks.session.mockResolvedValue({agent:{id:"agent"}});mocks.allowed.mockResolvedValue(false);
 const result=await GET(new Request("http://localhost/api/property-activity?propertyId=11111111-1111-4111-8111-111111111111"));
 expect(result.status).toBe(403);
 expect(mocks.admin).not.toHaveBeenCalled();
});
