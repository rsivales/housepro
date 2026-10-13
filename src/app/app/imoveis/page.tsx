import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { PropertyPortfolio } from '@/components/portfolio/property-portfolio';
export const metadata={title:'Portefólio de imóveis · Helix'};
export default async function Page({searchParams}:{searchParams:Promise<{scope?:string}>}){if(!await getSession())redirect('/entrar');const params=await searchParams;return <PropertyPortfolio initialScope={params.scope==='agency'?'agency':'mine'}/>;}
