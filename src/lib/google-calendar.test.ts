import {describe,it,expect,vi} from "vitest";
vi.mock("server-only",()=>({}));
import {googleEvent} from "./google-calendar";
describe("Google event export",()=>{
 it("uses a stable valid event ID and carries location, duration and notes",()=>{const event=googleEvent({id:"11111111-1111-1111-1111-111111111111",kind:"visita",at:"2026-11-03T14:00:00.000Z",durationMin:45,contactName:"Ana",location:"Faro",propertyRef:"HP1101",note:"Ligar antes"});expect(event).toMatchObject({summary:"Visita · Ana",start:{dateTime:"2026-11-03T14:00:00.000Z"},end:{dateTime:"2026-11-03T14:45:00.000Z"},location:"Faro",description:"Imóvel: HP1101\n\nLigar antes"});expect(event.id).toMatch(/^[a-v0-9]{5,1024}$/);});
});
