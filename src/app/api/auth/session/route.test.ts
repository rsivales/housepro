import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({ getUser:vi.fn(),maybeSingle:vi.fn() }));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({auth:{getUser:mocks.getUser},from:()=>({select:()=>({eq:()=>({maybeSingle:mocks.maybeSingle})})})})}));
import { GET } from "./route";
beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:"real-user"}},error:null});mocks.maybeSingle.mockResolvedValue({data:{id:"real-user",active:true},error:null});});
describe("server verification before redirecting login",()=>{
  it("does not trust a missing or invalid auth session",async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:{message:"expired"}});
    const r=await GET();expect(r.status).toBe(401);expect((await r.json()).professional).toBe(false);expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
  it("keeps buyer accounts out of the professional redirect",async()=>{mocks.maybeSingle.mockResolvedValue({data:null,error:null});expect((await GET()).status).toBe(403);});
  it("rejects inactive consultants",async()=>{mocks.maybeSingle.mockResolvedValue({data:{id:"real-user",active:false},error:null});expect((await GET()).status).toBe(403);});
  it("returns a verified professional destination without caching auth state",async()=>{const r=await GET();expect(r.status).toBe(200);expect(await r.json()).toEqual({professional:true,destination:"/app"});expect(r.headers.get("cache-control")).toContain("no-store");});
  it("does not redirect during a profile service failure",async()=>{mocks.maybeSingle.mockResolvedValue({data:null,error:{message:"unavailable"}});expect((await GET()).status).toBe(503);});
});
