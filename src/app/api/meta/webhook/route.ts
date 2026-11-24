import {NextResponse} from "next/server";
import {getVerifyToken,verifyWebhookSignature,getAppSecret} from "@/lib/meta/secrets";
import {extractLeadEvents,queueMetaReceipt,processMetaReceipt} from "@/lib/meta/live-leads";

export async function GET(request:Request){
 const q=new URL(request.url).searchParams;
 if(q.get("hub.mode")==="subscribe"&&getVerifyToken()&&q.get("hub.verify_token")===getVerifyToken()&&q.get("hub.challenge"))return new Response(q.get("hub.challenge"),{status:200});
 return NextResponse.json({error:"verification_failed"},{status:403});
}

export async function POST(request:Request){
 if(!getAppSecret())return NextResponse.json({error:"integration_not_configured"},{status:503});
 const raw=await request.text();
 if(!verifyWebhookSignature(raw,request.headers.get("x-hub-signature-256")))return NextResponse.json({error:"invalid_signature"},{status:401});
 let payload:unknown;
 try{payload=JSON.parse(raw)}catch{return NextResponse.json({error:"invalid_json"},{status:400})}
 const events=extractLeadEvents(payload);
 try{
  // Acknowledge only durable receipts. A failed Graph request can be retried from Helix.
  for(const event of events)await queueMetaReceipt(event);
 }catch{return NextResponse.json({error:"storage_unavailable"},{status:503})}
 let processed=0;
 for(const event of events){try{if((await processMetaReceipt(event.leadgen_id)).status==="processed")processed++}catch{/* Receipt remains pending. */}}
 return NextResponse.json({ok:true,received:events.length,processed,pending:events.length-processed});
}
