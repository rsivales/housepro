import {describe,it,expect,vi,afterEach} from "vitest";
import crypto from "node:crypto";
import {extractLeadEvents,validMetaId} from "./live-leads";
import {verifyWebhookSignature} from "./secrets";

afterEach(()=>{delete process.env.META_APP_SECRET;vi.restoreAllMocks()});
describe("Meta lead webhooks",()=>{
 it("accepts only numeric lead events for a page",()=>{
  expect(extractLeadEvents({object:"page",entry:[{id:"123",changes:[{field:"leadgen",value:{leadgen_id:"456",form_id:"789"}},{field:"feed",value:{leadgen_id:"999",form_id:"789"}}]}]})).toEqual([{leadgen_id:"456",form_id:"789",page_id:"123"}]);
  expect(extractLeadEvents({object:"instagram",entry:[{id:"123",changes:[{field:"leadgen",value:{leadgen_id:"456",form_id:"789"}}]}]})).toEqual([]);
  expect(validMetaId("not-a-meta-id")).toBe(false);
 });
 it("rejects unsigned and modified payloads",()=>{
  process.env.META_APP_SECRET="local-test-secret";const body='{"object":"page"}';const signature="sha256="+crypto.createHmac("sha256",process.env.META_APP_SECRET).update(body).digest("hex");
  expect(verifyWebhookSignature(body,signature)).toBe(true);expect(verifyWebhookSignature(body+" ",signature)).toBe(false);expect(verifyWebhookSignature(body,null)).toBe(false);
 });
});
