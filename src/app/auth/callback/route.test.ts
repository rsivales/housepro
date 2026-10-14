import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({exchange:vi.fn(),verify:vi.fn(),getUser:vi.fn(),single:vi.fn(),client:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.client}));
vi.mock("@/lib/supabase/admin",()=>({hasServiceRole:()=>false,createAdminClient:vi.fn()}));
vi.mock("@/lib/auth/superadmin",()=>({isSuperadminEmail:()=>false}));
import { GET } from "./route";
beforeEach(()=>{vi.clearAllMocks();mocks.exchange.mockResolvedValue({error:null});mocks.verify.mockResolvedValue({error:null});mocks.getUser.mockResolvedValue({data:{user:{id:"user",email:"professional@example.test"}}});mocks.single.mockResolvedValue({data:{id:"user"}});mocks.client.mockResolvedValue({auth:{exchangeCodeForSession:mocks.exchange,verifyOtp:mocks.verify,getUser:mocks.getUser},from:()=>({select:()=>({eq:()=>({single:mocks.single})})})});});
describe("email access callback",()=>{
  it("hands fragment-only email links to a browser cookie completion page",async()=>{const r=await GET(new Request("https://housepro.pt/auth/callback?next=/entrar/nova-password"));expect(r.headers.get("location")).toBe("https://housepro.pt/auth/complete?next=%2Fentrar%2Fnova-password");expect(mocks.client).not.toHaveBeenCalled();expect(r.headers.get("cache-control")).toContain("no-store");});
  it("routes recovery tokens to password setup instead of a login loop",async()=>{const r=await GET(new Request("https://housepro.pt/auth/callback?token_hash=test&type=recovery"));expect(r.headers.get("location")).toBe("https://housepro.pt/entrar/nova-password#");expect(mocks.verify).toHaveBeenCalledWith({token_hash:"test",type:"recovery"});});
  it("routes a verified PKCE professional session to Helix",async()=>{const r=await GET(new Request("https://housepro.pt/auth/callback?code=test"));expect(r.headers.get("location")).toBe("https://housepro.pt/app#");});
  it("clears a failed link fragment and returns one stable login error",async()=>{mocks.exchange.mockResolvedValue({error:{message:"invalid"}});const r=await GET(new Request("https://housepro.pt/auth/callback?code=test"));expect(r.headers.get("location")).toBe("https://housepro.pt/entrar?erro=link#");});
});
