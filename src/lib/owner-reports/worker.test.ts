import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),context:vi.fn(),recipients:vi.fn(),fetch:vi.fn(),updates:[] as {table:string;value:Record<string,unknown>}[]}));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/supabase/admin",()=>({createAdminClient:()=>({rpc:m.rpc,from:m.from})}));
vi.mock("@/lib/email-delivery",()=>({emailDeliveryCredentials:async()=>({enabled:true,apiKey:"test",sender:"HousePro <reports@housepro.pt>"})}));
vi.mock("./data",()=>({reportContext:m.context,reportRecipients:m.recipients,validEmail:(v:unknown)=>typeof v==="string"&&v.includes("@"),buildReportData:vi.fn()}));
import { runOwnerReports } from "./worker";
const payload={
 from:"Consultor <reports@housepro.pt>",to:["owner@example.test"],bcc:["agent@example.test","leader@example.test"],
 reply_to:"agent@example.test",subject:"Relatório",text:"Atividade",html:"<p>Atividade</p>",
 ownerEmail:"owner@example.test",agentEmail:"agent@example.test",managers:["agent@example.test","leader@example.test"],
};
const job={id:"job-1",property_id:"property-1",agent_id:"agent-1",revision:"rev-1",kind:"owner",period_start:"2026-10-01T00:00:00Z",period_end:"2026-11-01T00:00:00Z",payload,attempts:0,first_attempt_at:null};
beforeEach(()=>{
 vi.resetAllMocks();m.updates.length=0;vi.stubGlobal("fetch",m.fetch);
 m.rpc.mockResolvedValue({data:{claimed:true},error:null});
 m.context.mockResolvedValue({property:{agent_id:"agent-1",owner_email:payload.ownerEmail,status:"disponivel"},agent:{id:"agent-1",email:payload.agentEmail,agency_id:"agency-1"}});
 m.recipients.mockResolvedValue({bcc:payload.managers,broker:null});
 m.fetch.mockResolvedValue({ok:true,json:async()=>({id:"resend-1"})});
 m.from.mockImplementation((table:string)=>{
   let update=false;
   const chain:Record<string,unknown>={};
   for(const name of ["select","eq","lte","or","order","limit","maybeSingle"])chain[name]=()=>chain;
   chain.update=(value:Record<string,unknown>)=>{update=true;m.updates.push({table,value});return chain;};
   chain.then=(resolve:(v:unknown)=>unknown)=>{
     const data=update?null:table==="owner_report_settings"?{revision:"rev-1",settings:{enabled:true},period_from:"2026-11-01T00:00:00Z"}:[job];
     // The due-settings list is distinguished from the individual job's current configuration.
     return Promise.resolve({data,error:null}).then(resolve);
   };
   let list=false;
   chain.lte=()=>{list=true;return chain;};
   const then=chain.then as (resolve:(v:unknown)=>unknown)=>unknown;
   chain.then=(resolve:(v:unknown)=>unknown)=>list?Promise.resolve({data:[],error:null}).then(resolve):then(resolve);
   return chain;
 });
});
it("retries with an identical payload and idempotency key, retaining private BCC",async()=>{
 await runOwnerReports();await runOwnerReports();
 expect(m.fetch).toHaveBeenCalledTimes(2);
 const first=m.fetch.mock.calls[0][1],second=m.fetch.mock.calls[1][1];
 expect(first.body).toBe(second.body);
 expect(first.headers["Idempotency-Key"]).toBe("housepro-owner-report/job-1");
 expect(second.headers["Idempotency-Key"]).toBe(first.headers["Idempotency-Key"]);
 const mail=JSON.parse(first.body);
 expect(mail.to).toEqual(["owner@example.test"]);
 expect(mail.bcc).toEqual(payload.bcc);
 expect(mail.reply_to).toBe(payload.agentEmail);
 expect(mail).not.toHaveProperty("managers");
 expect(mail).not.toHaveProperty("ownerEmail");
});
it("cancels an obsolete recipient and preserves the period for regeneration",async()=>{
 m.context.mockResolvedValue({property:{agent_id:"agent-1",owner_email:"new@example.test",status:"disponivel"},agent:{id:"agent-1",email:payload.agentEmail,agency_id:"agency-1"}});
 await runOwnerReports();
 expect(m.fetch).not.toHaveBeenCalled();
 expect(m.updates).toContainEqual({table:"owner_report_outbox",value:{state:"cancelled"}});
 expect(m.updates.find(v=>v.table==="owner_report_settings")?.value.period_from).toBe(job.period_start.replace("00Z","00.000Z"));
});
