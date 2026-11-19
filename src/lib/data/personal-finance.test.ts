import {describe,it,expect} from 'vitest';
import {personalPayoutVisible} from './personal-finance';
const p={beneficiary_id:'self',role:'producao',created_at:'2026-11-01T12:00:00Z',closure:{closed_at:'2026-11-05T12:00:00Z'}};
describe('personal workspace finance scope',()=>{
 it('never includes other agents, Brand royalties or broker pension in a personal page',()=>{expect(personalPayoutVisible(p,'self')).toBe(true);expect(personalPayoutVisible({...p,beneficiary_id:'other'},'self')).toBe(false);for(const role of ['royalties','pensao_broker'])expect(personalPayoutVisible({...p,role},'self')).toBe(false);});
 it('drills down the personal net KPI by real closure month and production role',()=>{expect(personalPayoutVisible(p,'self',{month:'2026-11',kind:'producao'})).toBe(true);expect(personalPayoutVisible({...p,role:'override'},'self',{month:'2026-11',kind:'producao'})).toBe(false);expect(personalPayoutVisible({...p,closure:{closed_at:'2026-10-30T12:00:00Z'}},'self',{month:'2026-11'})).toBe(false);expect(personalPayoutVisible({...p,closure:null},'self',{month:'2026-11'})).toBe(false);});
 it('uses Lisbon at the summer month boundary',()=>{expect(personalPayoutVisible({...p,closure:{closed_at:'2026-05-31T23:30:00Z'}},'self',{month:'2026-06'})).toBe(true);});
});
