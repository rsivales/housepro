import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({create:vi.fn(),email:vi.fn(),notify:vi.fn()}));
vi.mock("@/lib/db/repo",()=>({createLead:mocks.create,getAgentPublicById:vi.fn().mockResolvedValue(undefined)}));
vi.mock("@/lib/notify",()=>({notifyGeneric:mocks.email,notifyLead:mocks.notify}));
vi.mock("@/lib/supabase/env",()=>({isSupabaseConfigured:()=>false}));
import { POST } from "./route";
const submission={valorAquisicao:"180000",anoAquisicao:"2016",valorVenda:"320000",anoVenda:"2026",quota:"100",aquisicao:"compra",imt:"8000",residencia:"residente",name:"Maria",email:"maria@example.invalid",consent:true,ref:"8f2d59dd-aedf-45ff-a8ef-04809208f1a0"};
const request=(data:unknown,ip:string)=>new Request("https://housepro.pt/api/mais-valias",{method:"POST",headers:{"content-type":"application/json","x-real-ip":ip},body:JSON.stringify(data)});
beforeEach(()=>{vi.clearAllMocks();mocks.email.mockResolvedValue([]);mocks.notify.mockResolvedValue([]);mocks.create.mockImplementation(async input=>({...input,id:"saved-id",status:"novo",createdAt:new Date().toISOString()}));});
describe("capital gains intake recovery",()=>{
 it("returns 503 and does not email when persistence fails",async()=>{
  mocks.create.mockRejectedValueOnce(new Error("database unavailable"));
  const res=await POST(request(submission,"failure"));
  expect(res.status).toBe(503);expect(mocks.email).not.toHaveBeenCalled();expect(mocks.notify).not.toHaveBeenCalled();
 });
 it("saves a complete report and the real consultant reference before emailing",async()=>{
  const order:string[]=[];
  mocks.create.mockImplementationOnce(async input=>{order.push("save");return {...input,id:"saved-id",status:"novo",createdAt:new Date().toISOString()};});
  mocks.email.mockImplementationOnce(async()=>{order.push("email");return [];});
  const res=await POST(request({...submission,email:"saved@example.invalid"},"success"));
  expect(res.status).toBe(200);expect(await res.json()).toMatchObject({id:"saved-id",emailStatus:"pendente"});
  expect(order).toEqual(["save","email"]);
  const saved=mocks.create.mock.calls[0][0];
  expect(saved.ownerId).toBe(submission.ref);expect(saved.message).toContain("Base potencialmente sujeita a tributação");expect(saved.message).toContain("Valor de venda");
 });
});
