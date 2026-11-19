import {beforeEach,describe,it,expect,vi} from "vitest";
const m=vi.hoisted(()=>({rpc:vi.fn(),rows:[] as {closed_at:string;snapshot:unknown}[]}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:()=>({rpc:m.rpc,from:()=>{const q={select:()=>q,eq:()=>q,gte:()=>q,lt:()=>Promise.resolve({data:m.rows,error:null})};return q;}})}));
import {personalMonthNet,commissionCycles} from './commission-cycles';
beforeEach(()=>{m.rows=[];m.rpc.mockReset();});
describe('financial cycle reads',()=>{
 it('returns only personal net in the Lisbon calendar month including its first summer hour',async()=>{const snapshot={financials:{producers:[{id:'me',agentNet:100},{id:'other',agentNet:900}]}};m.rows=[{closed_at:'2026-05-31T23:30:00Z',snapshot},{closed_at:'2026-06-30T22:30:00Z',snapshot},{closed_at:'2026-06-30T23:30:00Z',snapshot}];expect(await personalMonthNet('me','agency',new Date('2026-06-15'))).toBe(200);});
 it('fails visibly when annual counters cannot be obtained instead of inventing zero commission',async()=>{m.rpc.mockResolvedValue({data:null,error:{message:'unavailable'}});await expect(commissionCycles(['me'])).rejects.toThrow('ciclos');});
});
