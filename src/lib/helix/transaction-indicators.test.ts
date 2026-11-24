import { describe, expect, it } from "vitest";
import { transactionSecurity, leadTemperature, remainingTime, deadlineUrgency, notificationKey } from "./transaction-indicators";

describe("Helix indicators", () => {
  it("does not call an unverified CPCV safe", () => {
    expect(transactionSecurity("cpcv", false)).toBe("em_confirmacao");
    expect(transactionSecurity("cpcv", true)).toBe("elevada");
    expect(transactionSecurity("reserva", true)).toBe("compromisso");
  });
  it("uses hot-to-cold inactivity", () => {
    expect(leadTemperature(2)).toBe("muito_quente");
    expect(leadTemperature(96)).toBe("quente");
    expect(leadTemperature(400)).toBe("frio");
    expect(() => leadTemperature(-1)).toThrow();
  });
  it("counts down in days and hours and detects expiry", () => {
    const now = new Date("2026-11-23T12:00:00Z");
    expect(remainingTime("2026-11-25T15:00:00Z", now)).toMatchObject({days: 2, remainderHours: 3, expired: false});
    expect(remainingTime("2026-11-22T12:00:00Z", now)?.expired).toBe(true);
  });
  it("escalates pending validations independently of deal security", () => {
    const now = new Date("2026-11-23T12:00:00Z");
    expect(deadlineUrgency("2026-11-30T12:00:00Z", 1, 2, false, now)).toBe("urgente");
    expect(deadlineUrgency("2026-11-24T12:00:00Z", 1, 2, false, now)).toBe("critico");
    expect(deadlineUrgency("2026-11-24T12:00:00Z", 0, 0, false, now)).toBe("normal");
    expect(deadlineUrgency("2026-11-22T12:00:00Z", 1, 1, true, now)).toBe("concluido");
  });
  it("deduplicates by deadline version and recipient", () => {
    expect(notificationKey("d","cpcv","v1",7,"email","u")).not.toBe(notificationKey("d","cpcv","v2",7,"email","u"));
  });
});
