import { describe, it, expect } from "vitest";
import { buildPropertyReference, consultantCode, parsePropertyReference } from "./codes";
describe("HousePro property references", () => {
  it("identifies agency, city and each consultant", () => {
    expect(buildPropertyReference(1,1,1)).toBe("HP1101-01");
    expect(buildPropertyReference(1,2,1)).toBe("HP1102-01");
    expect(consultantCode(1,1)).toBe("HP1101");
  });
  it("retains the complete historical sequence beyond 99 and 999", () => {
    expect(buildPropertyReference(1,1,406)).toBe("HP1101-406");
    expect(buildPropertyReference(1,1,1000)).toBe("HP1101-1000");
  });
  it("supports explicit city codes and multi-digit agency codes", () => {
    const reference=buildPropertyReference(12,3,7,2);
    expect(reference).toBe("HP12203-07");
    expect(parsePropertyReference(reference)).toEqual({agency:12,city:2,agent:3,seq:7,reference});
  });
  it("reads existing portal references without shortening their sequence", () => {
    expect(parsePropertyReference("HP1101-405")).toEqual({agency:1,city:1,agent:1,seq:405,reference:"HP1101-405"});
  });
  it("rejects missing or ambiguous code configuration", () => {
    expect(()=>consultantCode(0,1)).toThrow();
    expect(()=>consultantCode(1,102)).toThrow();
    expect(parsePropertyReference("HP4053")).toBeNull();
    expect(parsePropertyReference("HP-1050")).toBeNull();
  });
});
