import {describe,it,expect} from "vitest";
import {isNetworkFinanceAdmin,canManagePayout,formatMoney} from "./finance-access";
import type {Agent} from "./types";
const agent={id:"agent",agencyId:"agency",roleKey:"agente",role:"agente"} as Agent;
describe("financial role and agency boundaries",()=>{
 it("reserves network royalties and email configuration for Brand management",()=>{
  expect(isNetworkFinanceAdmin({...agent,roleKey:"superadmin"})).toBe(true);
  expect(isNetworkFinanceAdmin({...agent,roleKey:"admin"})).toBe(true);
  expect(isNetworkFinanceAdmin({...agent,roleKey:"diretor"})).toBe(false);
  expect(isNetworkFinanceAdmin(agent)).toBe(false);
 });
 it("limits agency payment management and royalty confirmation",()=>{
  const director={...agent,roleKey:"diretor"} as Agent;
  expect(canManagePayout(director,{agency_id:"agency",role:"pensao"})).toBe(true);
  expect(canManagePayout(director,{agency_id:"other",role:"pensao"})).toBe(false);
  expect(canManagePayout(director,{agency_id:"agency",role:"royalties"})).toBe(false);
  expect(canManagePayout(agent,{agency_id:"agency",role:"pensao"})).toBe(false);
 });
 it("shows accounting cents",()=>expect(formatMoney(207.5)).toContain("207,50"));
});
