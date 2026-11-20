import { expect,it,vi } from "vitest";
const m=vi.hoisted(()=>({rpc:vi.fn(),credentials:vi.fn()}));
vi.mock("server-only",()=>({}));vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc:m.rpc}),hasServiceRole:()=>true}));vi.mock("@/lib/email-delivery",()=>({emailDeliveryCredentials:m.credentials}));
import { deliverMatches } from "./server";
it("never reads recipients or sends while live match delivery is disabled",async()=>{m.rpc.mockResolvedValue({data:{enabled:false}});const from=vi.fn();const fetch=vi.fn();vi.stubGlobal("fetch",fetch);expect(await deliverMatches({from} as never)).toEqual({accepted:0,pending:true});expect(from).not.toHaveBeenCalled();expect(m.credentials).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();});
