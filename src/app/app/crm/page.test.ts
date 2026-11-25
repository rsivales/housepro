import {describe,it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),deals:vi.fn()}));
vi.mock('@/lib/supabase/auth',()=>({getSession:m.session}));
vi.mock('@/lib/db/deals',()=>({listDeals:m.deals}));
vi.mock('@/lib/db/repo',()=>({listLeadsByAgent:async()=>[],listAgenciesReal:async()=>[],getPropertyById:async()=>undefined,listEmailLists:async()=>[]}));
vi.mock('@/lib/db/crm-lead-pipelines',()=>({crmLeadPipelines:async()=>[]}));
vi.mock('@/components/app/crm-tabs',()=>({CrmTabs:()=>null}));
import CrmPage from './page';
beforeEach(()=>{vi.clearAllMocks();m.deals.mockResolvedValue([]);});
describe('consultant CRM scope',()=>{
 it('keeps Super Admin personal navigation scoped to their participating deals',async()=>{m.session.mockResolvedValue({agent:{id:'self',roleKey:'superadmin',agencyId:'agency'}});await CrmPage({searchParams:Promise.resolve({})});expect(m.deals).toHaveBeenCalledWith('self',false);});
 it('does the same for an agency director using the consultant workspace',async()=>{m.session.mockResolvedValue({agent:{id:'director',roleKey:'diretor',agencyId:'agency'}});await CrmPage({searchParams:Promise.resolve({})});expect(m.deals).toHaveBeenCalledWith('director',false);});
});
