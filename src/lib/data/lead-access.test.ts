import { describe, it, expect } from "vitest";
import { canReadLead } from "./lead-access";
import type { Agent } from "./types";
const agent = { id: "agent-1", agencyId: "agency-1", roleKey: "agente" } as Agent;
describe("private lead access", () => {
 it("allows the owner and assigned consultant", () => {
  expect(canReadLead(agent,{owner_id:agent.id})).toBe(true);
  expect(canReadLead(agent,{assigned_agent_id:agent.id})).toBe(true);
 });
 it("allows explicit co-owners",()=>expect(canReadLead(agent,{co_owner_ids:[agent.id]})).toBe(true));
 it("does not allow another consultant in the same agency",()=>expect(canReadLead(agent,{owner_id:"other",agency_id:agent.agencyId})).toBe(false));
 it("limits staff access to their agency",()=>{
  const staff={...agent,roleKey:"superadmin"} as Agent;
  expect(canReadLead(staff,{agency_id:agent.agencyId})).toBe(true);
  expect(canReadLead(staff,{agency_id:"other-agency"})).toBe(false);
  expect(canReadLead(staff,{agency_id:null})).toBe(false);
 });
});
