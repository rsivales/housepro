import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.housepro.pt"),
  title: {
    default: "HousePro — Imobiliária | Comprar, arrendar e avaliar casas",
    template: "%s · HousePro",
  },
  description:
    "Encontre a sua próxima casa com a HousePro. Imóveis selecionados, agentes dedicados e uma avaliação gratuita à distância de um clique.",
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: "HousePro",
    title: "HousePro — Imobiliária",
    description:
      "Imóveis selecionados, agentes dedicados e avaliação gratuita.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
