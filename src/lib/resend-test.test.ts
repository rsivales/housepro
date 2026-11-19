import {describe,it,beforeEach,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({credentials:vi.fn(),fetch:vi.fn()}));
vi.mock('./email-delivery',()=>({emailDeliveryCredentials:m.credentials}));
import {sendResendConfigurationTest} from './resend-test';
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('fetch',m.fetch);m.credentials.mockResolvedValue({enabled:true,apiKey:'re_private_key',sender:'notificacoes@housepro.pt',notifyEmail:'equipa@housepro.pt'});});
describe('Resend setup diagnostics',()=>{
 it('does not send without configured activation',async()=>{m.credentials.mockResolvedValue({enabled:false});expect((await sendResendConfigurationTest('me@example.invalid')).code).toBe('disabled');expect(m.fetch).not.toHaveBeenCalled();});
 it('sends only a test to the supplied administrator and reports acceptance separately from delivery',async()=>{m.fetch.mockResolvedValue({ok:true,json:async()=>({id:'resend-id'})});expect(await sendResendConfigurationTest('me@example.invalid')).toMatchObject({ok:true,id:'resend-id'});expect(JSON.parse(m.fetch.mock.calls[0][1].body).to).toEqual(['me@example.invalid']);});
 it('distinguishes rejected keys from unverified sender domains without leaking provider payloads',async()=>{m.fetch.mockResolvedValueOnce({ok:false,status:401,json:async()=>({message:'API key is invalid re_private_key'})}).mockResolvedValueOnce({ok:false,status:403,json:async()=>({name:'validation_error',message:'The housepro.pt domain is not verified. re_private_key'})});const key=await sendResendConfigurationTest('me@example.invalid'),domain=await sendResendConfigurationTest('me@example.invalid');expect(key.code).toBe('invalid_key');expect(domain.code).toBe('domain_not_verified');expect(JSON.stringify([key,domain])).not.toContain('re_private_key');});
 it('reports rate limiting rather than claiming an email was sent',async()=>{m.fetch.mockResolvedValue({ok:false,status:429,json:async()=>({})});expect(await sendResendConfigurationTest('me@example.invalid')).toMatchObject({ok:false,code:'rate_limit'});});
});
