import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT, nextReportDate, prepareOwnerMessage, renderOwnerReport, validateSettings, type ReportData } from "./model";
const data:ReportData={
 propertyId:"p",reference:"HP-1",title:'Casa <script>alert(1)</script>',ownerName:"Ana & João",
 agentName:"Manuela",agentEmail:"agent@example.test",agentPhoto:"https://example.test/photo.png",
 from:"2026-10-01T00:00:00Z",until:"2026-11-01T00:00:00Z",
 blocks:[{key:"visits",title:"Visitas",lines:["3 visitas"]},{key:"proposals",title:"Propostas",lines:["1 proposta"]}],
};
describe("owner report",()=>{
 it("escapes owner and property data and restricts the selected sections",()=>{
  const report=renderOwnerReport(data,{...DEFAULT_REPORT,sections:["visits"]});
  expect(report.html).not.toContain("<script>");
  expect(report.html).toContain("&lt;script&gt;");
  expect(report.text).toContain("3 visitas");
  expect(report.text).not.toContain("1 proposta");
  expect(report.html).toContain("mailto:agent@example.test");
 });
 it("rotates through all three layouts and includes the agent photo only in the profile template",()=>{
  const reports=[0,1,2,3].map(i=>renderOwnerReport(data,DEFAULT_REPORT,i));
  expect(new Set(reports.slice(0,3).map(r=>r.html)).size).toBe(3);
  expect(reports[0].html).not.toContain(data.agentPhoto);
  expect(reports[2].html).toContain(data.agentPhoto);
  expect(reports[3].html).toBe(reports[0].html);
 });
 it("keeps a selected layout when rotation is disabled",()=>{
  const settings={...DEFAULT_REPORT,rotate:false,template:2};
  expect(renderOwnerReport(data,settings,1).html).toContain(data.agentPhoto);
 });
 it("rejects bad sections and frequencies",()=>{
  expect(()=>validateSettings({...DEFAULT_REPORT,sections:["commission"]})).toThrow();
  expect(()=>validateSettings({...DEFAULT_REPORT,frequency:"daily"})).toThrow();
  expect(()=>validateSettings({...DEFAULT_REPORT,day:31})).toThrow();
 });
 it("keeps monthly dates valid across short months and year changes",()=>{
  expect(nextReportDate("monthly",28,new Date("2026-12-29T10:00:00Z")).toISOString()).toBe("2027-01-28T10:00:00.000Z");
  expect(nextReportDate("monthly",28,new Date("2027-02-01T10:00:00Z")).toISOString()).toBe("2027-02-28T10:00:00.000Z");
  expect(nextReportDate("weekly",1,new Date("2026-12-29T10:00:00Z")).toISOString()).toBe("2027-01-05T10:00:00.000Z");
 });
});


it("keeps all internal copies hidden and sends owner replies to the property consultant",()=>{
 const mail=prepareOwnerMessage(data,DEFAULT_REPORT,0,"HousePro <reports@housepro.pt>","owner@example.test",["agent@example.test","manager@example.test","OWNER@example.test"]);
 expect(mail.to).toEqual(["owner@example.test"]);
 expect(mail.bcc).toEqual(["agent@example.test","manager@example.test"]);
 expect(mail.reply_to).toBe("agent@example.test");
 expect(mail.html).not.toContain("manager@example.test");
 expect(mail.text).not.toContain("manager@example.test");
 expect(mail.from).toBe("Manuela · HousePro <reports@housepro.pt>");
 expect(prepareOwnerMessage(data,{...DEFAULT_REPORT,format:"text"},0,"reports@housepro.pt","owner@example.test",[]).html).toBeUndefined();
});
