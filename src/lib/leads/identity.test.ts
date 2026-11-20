import {describe,it,expect} from "vitest";
import {operationalLead,requestIdentity} from "./identity";
describe("Operational lead identity",()=>{
 it("excludes anonymous click placeholders even with a name",()=>{expect(operationalLead({contact:"(contacto via WhatsApp)"})).toBe(false);expect(operationalLead({contact:"(contacto via Chamada)"})).toBe(false);});
 it("retains existing usable email-only and telephone requests",()=>{expect(operationalLead({contact:"hello@example.com"})).toBe(true);expect(operationalLead({contact:"+351 912 345 678"})).toBe(true);});
 it("rejects short phones and explicit interaction-only records",()=>{expect(operationalLead({contact:"1234567"})).toBe(false);expect(operationalLead({contact:"912345678",interaction_only:true})).toBe(false);});
 it("requires all three identity fields on new requests",()=>{expect(requestIdentity("Maria","912345678",null)).toBeNull();expect(requestIdentity("","912345678","m@example.com")).toBeNull();expect(requestIdentity("Maria","abc912345678","m@example.com")).toBeNull();expect(requestIdentity("Maria","912345678","invalid")).toBeNull();expect(requestIdentity(" Maria ","+351 912 345 678"," M@example.COM ")).toEqual({name:"Maria",phone:"+351912345678",email:"m@example.com"});});
});
