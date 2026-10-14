import { describe, expect, it } from "vitest";
import { safeAuthNext, verifiedProfessionalDestination } from "./navigation";
describe("verified professional navigation", () => {
  it("keeps the login form stable for a stale browser session", () => {
    expect(verifiedProfessionalDestination(false, { professional:true,destination:"/app" })).toBeNull();
    expect(verifiedProfessionalDestination(true, { session:{user:{id:"cached"}} })).toBeNull();
    expect(verifiedProfessionalDestination(true, { professional:false })).toBeNull();
    expect(verifiedProfessionalDestination(true, { professional:true,destination:"/app" })).toBe("/app");
  });
  it("allows local recovery and professional targets only", () => {
    expect(safeAuthNext("/entrar/nova-password")).toBe("/entrar/nova-password");
    expect(safeAuthNext("/app/imoveis?scope=mine")).toBe("/app/imoveis?scope=mine");
    for(const target of ["https://external.test","//external.test","/\\external.test","/app/../../externo"]) expect(safeAuthNext(target)).toBe("/app");
  });
});
