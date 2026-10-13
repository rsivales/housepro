import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { PropertyPortfolio } from '@/components/portfolio/property-portfolio';
export const metadata={title:'Gestão de imóveis · Helix'};
export default function Page(){return <><SiteHeader/><div className="px-4 pt-5 sm:px-7"><Link href="/admin" className="text-sm text-muted-foreground hover:underline">← Painel de gestão</Link></div><PropertyPortfolio initialScope="agency"/></>;}
