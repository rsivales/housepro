import {expect,it} from 'vitest';
import {firstActionNeeded,followupDue,validateFollowup} from './followup';
import type {Lead} from '@/lib/data/leads';
const l={id:'l',contact:'912345678',status:'novo'} as Lead;
it('does not count anonymous click events or actioned leads as first action pending',()=>{expect(firstActionNeeded(l)).toBe(true);expect(firstActionNeeded({...l,contact:'clique no WhatsApp'})).toBe(false);expect(firstActionNeeded({...l,contactedAt:new Date().toISOString()})).toBe(false);expect(firstActionNeeded({...l,lastFollowupAt:new Date().toISOString()})).toBe(false);});
it('separates future client follow-up from overdue follow-up',()=>{expect(followupDue({...l,followupState:'aguarda_cliente',nextFollowupAt:'2099-01-01'})).toBe(false);expect(followupDue({...l,nextFollowupAt:'2020-01-01'})).toBe(true);expect(followupDue({...l,followupState:'encerrado',nextFollowupAt:'2020-01-01'})).toBe(false);});
it('requires a meaningful action note and future deadline, except closure',()=>{const b={requestId:'00000000-0000-4000-a000-000000000001',action:'tentativa',note:'Liguei, mas não atendeu.',nextAt:new Date(Date.now()+86400000).toISOString()};expect(validateFollowup(b).action).toBe('tentativa');expect(()=>validateFollowup({...b,nextAt:'2020-01-01'})).toThrow();expect(()=>validateFollowup({...b,note:''})).toThrow();expect(validateFollowup({...b,action:'encerrado',nextAt:null}).nextAt).toBeNull();});

it('a manually reassigned lead starts a new action cycle without erasing historical first contact',()=>{expect(firstActionNeeded({...l,status:'contactado',contactedAt:'2020-01-01',followupState:'por_contactar'})).toBe(true);expect(firstActionNeeded({...l,followupState:'contactado',lastFollowupAt:'2020-01-01'})).toBe(false);});
