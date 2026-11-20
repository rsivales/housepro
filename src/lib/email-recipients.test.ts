import {describe,it,expect,vi,beforeEach} from "vitest";
vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({email:"agent@example.com",active:true,slug:"housepro",legal:"",authEmail:"auth@example.com"}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==="profiles"?{email:state.email,active:state.active,agency_id:"agency"}:{legal_email:state.legal,slug:state.slug}})})})}),auth:{admin:{getUserById:async()=>({data:{user:{email:state.authEmail}}})}}})}));
import {agentRecipients} from "./email-recipients";
beforeEach(()=>Object.assign(state,{email:"agent@example.com",active:true,slug:"housepro",legal:"",authEmail:"auth@example.com"}));
describe("Operational email recipients",()=>{
 it("addresses the consultant and copies agency fallback",async()=>expect(await agentRecipients("id","general@example.com")).toEqual({to:["agent@example.com"],cc:["general@example.com"]}));
 it("uses agency's configured email and avoids duplicate To/CC",async()=>{state.legal="agency@example.com";expect((await agentRecipients("id","general@example.com")).cc).toEqual(["agency@example.com"]);state.legal=state.email;expect((await agentRecipients("id")).cc).toEqual([]);});
 it("never copies HousePro general to another agency",async()=>{state.slug="other";expect((await agentRecipients("id","general@example.com")).cc).toEqual([]);});
 it("uses actual auth email if profile is missing, never a guessed address",async()=>{state.email="";expect((await agentRecipients("id")).to).toEqual(["auth@example.com"]);state.authEmail="";expect((await agentRecipients("id")).to).toEqual([]);});
 it("does not send to an inactive profile",async()=>{state.active=false;expect((await agentRecipients("id","general@example.com")).to).toEqual([]);});
});
