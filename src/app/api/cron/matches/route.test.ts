import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({configured:vi.fn(),config:vi.fn(),equal:vi.fn(),run:vi.fn()}));vi.mock("@/lib/supabase/admin",()=>({hasServiceRole:m.configured}));vi.mock("@/lib/matching/server",()=>({workerConfig:m.config,tokensEqual:m.equal,runMatching:m.run}));
import { POST } from "./route";
beforeEach(()=>{vi.clearAllMocks();m.configured.mockReturnValue(true);});
it("requires scheduler credentials before matching or email",async()=>{expect((await POST(new Request("https://housepro.pt/api/cron/matches",{method:"POST"}))).status).toBe(401);expect(m.config).not.toHaveBeenCalled();expect(m.run).not.toHaveBeenCalled();});
it("rejects invalid token and respects disabled scheduling",async()=>{m.config.mockResolvedValue({secret:"stored",enabled:false});m.equal.mockReturnValue(false);const req=()=>new Request("https://housepro.pt/api/cron/matches",{method:"POST",headers:{authorization:"Bearer wrong"}});expect((await POST(req())).status).toBe(401);m.equal.mockReturnValue(true);expect(await (await POST(req())).json()).toEqual({status:"disabled"});expect(m.run).not.toHaveBeenCalled();});
