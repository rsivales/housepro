import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {COMMISSION} from "./config";
import {computeLeg} from "./tiers";
describe("posted commission plan",()=>{
 it("keeps the database plan snapshot identical to the canonical configuration",()=>{
  const migration=readFileSync("supabase/migrations/20261024110145_atomic_deal_financial_closures.sql","utf8");
  const match=migration.match(/select '({[^\n]+})'::jsonb;/);
  expect(match).toBeTruthy();
  const {brokerPensionPct,...historic}=COMMISSION;
  expect(brokerPensionPct).toBe(2);
  expect(JSON.parse(match![1])).toEqual(JSON.parse(JSON.stringify(historic)));
  const current=readFileSync("supabase/migrations/20261024112517_agency_broker_management_and_pension.sql","utf8").match(/select '({[^\n]+})'::jsonb;/);
  expect(current).toBeTruthy();
  expect(JSON.parse(current![1])).toEqual(JSON.parse(JSON.stringify(COMMISSION)));
 });
 it("uses earlier completed turnover when the next deal closes",()=>{
  const first=computeLeg({legCommission:23000,priorFaturacao:0,priorAgencyTake:0,hasValidatedCompany:false});
  const second=computeLeg({legCommission:1500,priorFaturacao:first.newFaturacao,priorAgencyTake:first.newAgencyTake,hasValidatedCompany:false});
  expect(first.agentGross).toBe(10500);expect(first.pension).toBe(210);
  expect(second.agentGross).toBe(750);expect(second.pension).toBe(15);
 });
});

describe("broker deduction",()=>{
 it("deducts the broker's 2% from the agency side separately from the agent",()=>{
  const leg=computeLeg({legCommission:1000,priorFaturacao:0,priorAgencyTake:0,hasValidatedCompany:false});
  expect(leg.agencyGross).toBe(600);expect(leg.royaltiesAgency).toBe(18);expect(leg.brokerPension).toBe(12);expect(leg.pension).toBe(8);
 });
});
