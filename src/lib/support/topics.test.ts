import {expect,it} from 'vitest';
import {TOPICS} from './topics';
it('routes financial and confidential subjects directly to Brand scopes',()=>{expect(TOPICS.conduta.scope).toBe('confidencial');expect(TOPICS.comissoes.scope).toBe('marca');expect(TOPICS.fees.scope).toBe('marca');expect(TOPICS.tecnico_integracoes.scope).toBe('tecnico');expect(TOPICS.leads_sla.scope).toBe('agencia');});
