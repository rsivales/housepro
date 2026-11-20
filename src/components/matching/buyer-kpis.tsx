import type { Contact } from "@/lib/data/contacts";
import { buyerTemperature } from "@/lib/matching/profile";
export function BuyerKpis({contacts}:{contacts:Contact[]}) {
 const buyers=contacts.filter(c=>["comprador","investidor"].includes(c.type)&&c.buyerProfile?.active!==false);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Lisbon"}).format(new Date());
 const items=[ ["Compra até 3 meses",buyers.filter(c=>buyerTemperature(c.buyerProfile)==="quente").length], ["Compra em 4–6 meses",buyers.filter(c=>buyerTemperature(c.buyerProfile)==="morno").length], ["Mais de 6 meses",buyers.filter(c=>buyerTemperature(c.buyerProfile)==="frio").length], ["Por qualificar",buyers.filter(c=>buyerTemperature(c.buyerProfile)==="por_qualificar").length], ["Crédito por resolver",buyers.filter(c=>["em_analise","por_iniciar"].includes(c.buyerProfile?.financing??"")).length], ["Dependem de venda",buyers.filter(c=>c.buyerProfile?.dependsOnSale).length], ["Casa para vender / permuta",buyers.filter(c=>c.buyerProfile?.hasHomeToSell||c.buyerProfile?.hasHomeToExchange).length], ["Seguimento em atraso",buyers.filter(c=>c.buyerProfile?.nextContactAt&&c.buyerProfile.nextContactAt<today).length] ];
 return <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map(([label,n])=><div key={label} className="rounded-2xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{n}</p></div>)}</div>;
}
