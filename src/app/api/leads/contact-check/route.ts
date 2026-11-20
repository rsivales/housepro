import {NextResponse} from 'next/server';
import {getSession} from '@/lib/supabase/auth';
import {listLeadsByAgent} from '@/lib/db/repo';
import {firstActionNeeded} from '@/lib/leads/followup';
/** Read-only diagnosis. Browser-supplied clocks cannot reassign leads or create penalties. */
export async function POST(){const s=await getSession();if(!s||s.viewingAs)return NextResponse.json({error:'Sessão inválida.'},{status:403});if(s.demo)return NextResponse.json({ok:true,outcomes:[]});const leads=await listLeadsByAgent(s.agent.id);const outcomes=leads.filter(l=>firstActionNeeded(l)&&Date.now()-Date.parse(l.createdAt)>=48*3600000).map(l=>({leadId:l.id,name:l.name,outcome:'attention'}));return NextResponse.json({ok:true,outcomes,policy:'read_only_review'});}
