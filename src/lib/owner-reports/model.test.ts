import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT, nextReportDate, nextQuarterlyDate, prepareOwnerMessage, renderOwnerReport, validateSettings, type ReportData } from "./model";
const data:ReportData={
 propertyId:"p",reference:"HP-1",title:'Casa <script>alert(1)</script>',ownerName:"Ana & João",
 agentName:"Manuela",agentEmail:"agent@example.test",agentPhoto:"https://example.test/photo.png",activityCount:4,
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
 it("rotates through all three branded layouts while showing the agent photo in every version",()=>{
  const reports=[0,1,2,3].map(i=>renderOwnerReport(data,DEFAULT_REPORT,i));
  expect(new Set(reports.slice(0,3).map(r=>r.html)).size).toBe(3);
  for(const report of reports){expect(report.html).toContain(data.agentPhoto);expect(report.html).toContain("/brand/housepro-designer-red.png");expect(report.html).toContain("/brand/housepro-designer-mark.png");}
  expect(renderOwnerReport({...data,signature:true},DEFAULT_REPORT).html).toContain("/brand/housepro-designer-black.png");
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
  expect(nextReportDate(30,1,new Date("2026-12-29T10:00:00Z")).toISOString()).toBe("2027-01-28T10:00:00.000Z");
  expect(nextReportDate(45,1,new Date("2027-02-01T10:00:00Z")).toISOString()).toBe("2027-03-18T10:00:00.000Z");
  expect(nextReportDate(15,1,new Date("2026-12-29T10:00:00Z")).toISOString()).toBe("2027-01-13T10:00:00.000Z");
  expect(nextReportDate(60,1,new Date("2026-12-29T10:00:00Z")).toISOString()).toBe("2027-02-27T10:00:00.000Z");
  expect(nextQuarterlyDate(new Date("2026-11-20T10:00:00Z")).toISOString()).toBe("2027-02-20T10:00:00.000Z");
 });
 it("keeps legacy settings readable and validates the chosen treatment and additional recipient",()=>{
  expect(validateSettings({...DEFAULT_REPORT,frequency:"monthly"}).frequency).toBe(30);
  expect(renderOwnerReport(data,{...DEFAULT_REPORT,salutation:"Sra."}).text).toContain("Exma. Sra. Ana & João,");
  expect(()=>validateSettings({...DEFAULT_REPORT,salutation:"Outro",otherSalutation:"<script>"})).toThrow();
  expect(()=>validateSettings({...DEFAULT_REPORT,additionalEmail:"invalid"})).toThrow();
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
 expect(prepareOwnerMessage(data,{...DEFAULT_REPORT,additionalEmail:"family@example.test"},0,"reports@housepro.pt","owner@example.test",["agent@example.test"]).cc).toEqual(["family@example.test"]);
 expect(prepareOwnerMessage(data,{...DEFAULT_REPORT,format:"text"},0,"reports@housepro.pt","owner@example.test",[]).html).toBeUndefined();
});
