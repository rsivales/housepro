export const PERSONAL_PAYOUT_ROLES = ['producao','override','pensao'] as const;
export function personalPayoutVisible(p:{beneficiary_id:string|null;role:string;closure?:unknown;created_at:string},agentId:string,options:{month?:string;kind?:string}={}) {
 if(p.beneficiary_id!==agentId||!PERSONAL_PAYOUT_ROLES.includes(p.role as typeof PERSONAL_PAYOUT_ROLES[number]))return false;
 if(options.kind&&p.role!==options.kind)return false;
 if(options.month){const closure=(Array.isArray(p.closure)?p.closure[0]:p.closure) as {closed_at?:string}|null; if(!closure?.closed_at)return false;return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit'}).format(new Date(closure.closed_at))===options.month;}
 return true;
}
