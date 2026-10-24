import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {COMMISSION} from "./config";
import {computeLeg} from "./tiers";
describe("posted commission plan",()=>{
 it("keeps the database plan snapshot identical to the canonical configuration",()=>{
  const migration=readFileSync("supabase/migrations/20261024110145_atomic_deal_financial_closures.sql","utf8");
  const match=migration.match(/select '({[^\n]+})'::jsonb;/);
  expect(match).toBeTruthy();
  expect(JSON.parse(match![1])).toEqual(JSON.parse(JSON.stringify(COMMISSION)));
 });
 it("uses earlier completed turnover when the next deal closes",()=>{
  const first=computeLeg({legCommission:23000,priorFaturacao:0,priorAgencyTake:0,hasValidatedCompany:false});
  const second=computeLeg({legCommission:1500,priorFaturacao:first.newFaturacao,priorAgencyTake:first.newAgencyTake,hasValidatedCompany:false});
  expect(first.agentGross).toBe(10500);expect(first.pension).toBe(210);
  expect(second.agentGross).toBe(750);expect(second.pension).toBe(15);
 });
});
