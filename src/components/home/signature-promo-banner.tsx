"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { track } from "@/lib/analytics";
import { loadSiteContent } from "@/lib/data/site-content";

type SignaturePromo = {
  eyebrow?: string;
  title?: string;
  text?: string;
  label?: string;
  href?: string;
  image?: string;
  alt?: string;
};

const fallback: Required<SignaturePromo> = {
  eyebrow: "HOUSEPRO SIGNATURE",
  title: "Imóveis verdadeiramente únicos.",
  text: "Uma seleção reservada de propriedades excecionais.",
  label: "Descobrir Signature",
  href: "/signature",
  image: "/signature/editorial-coast-hero.webp",
  alt: "Imóvel de luxo HousePro Signature junto ao mar",
};

export function SignaturePromoBanner() {
  const [content, setContent] =
    React.useState<Required<SignaturePromo>>(fallback);

  React.useEffect(() => {
    loadSiteContent().then((data) => {
      if (data.signaturepromo)
        setContent({ ...fallback, ...data.signaturepromo });
    });
  }, []);

  const registerClick = () =>
    track("signature_hero_explore", { source: "homepage_banner" });

  return (
    <section className="mx-auto mt-16 max-w-7xl px-4 sm:mt-24 sm:px-6">
      <Link
        href={content.href}
        onClick={registerClick}
        aria-label={`${content.label}: ${content.title}`}
        className="group relative block min-h-[440px] overflow-hidden rounded-[22px] bg-[#0D3B66] sm:min-h-[390px] lg:min-h-[430px]"
      >
        <img
          src={content.image}
          alt={content.alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center transition duration-700 motion-safe:group-hover:scale-[1.015]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,59,102,.05)_4%,rgba(13,59,102,.30)_40%,rgba(7,39,70,.96)_100%)] sm:bg-[linear-gradient(90deg,rgba(7,39,70,.93)_0%,rgba(13,59,102,.78)_43%,rgba(13,59,102,.16)_82%)]" />
        <div className="relative flex min-h-[440px] max-w-2xl flex-col justify-end px-6 py-8 text-white sm:min-h-[390px] sm:justify-center sm:px-10 sm:py-10 lg:min-h-[430px] lg:px-14">
          <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[.2em] text-[#d8c08b] sm:text-xs">
            {content.eyebrow}
            <span aria-hidden="true" className="h-px w-10 bg-[#d8c08b]" />
          </p>
          <h2 className="mt-4 max-w-xl font-display text-[34px] font-semibold leading-[1.02] tracking-[-.025em] sm:text-5xl lg:text-[54px]">
            {content.title}
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-6 text-white/90 sm:text-lg">
            {content.text}
          </p>
          <span className="mt-6 inline-flex min-h-12 w-fit items-center gap-4 rounded-xl bg-white px-5 text-sm font-bold text-[#0D3B66] shadow-sm transition group-hover:bg-[#f5f7fa] sm:px-6">
            {content.label}
            <ArrowRight className="size-5" />
          </span>
        </div>
      </Link>
    </section>
  );
}
