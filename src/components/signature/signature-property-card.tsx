import Link from "next/link";
import { Expand } from "lucide-react";
import { CompletionLabel } from "@/components/property/completion-label";
import { PropertyBadges } from "@/components/property/property-badges";
import { isCompleted } from "@/lib/data/completion";
import { publicPriceLabel } from "@/lib/format";
import { signatureImageSources, signaturePropertyHref } from "@/lib/signature/media";
import type { Property } from "@/lib/data/types";
import { SignatureImage } from "./signature-image";

export function SignaturePropertyCard({ property, referrer, featured = false }: { property: Property; referrer?: string; featured?: boolean }) {
  const completed = isCompleted(property.status);
  const images = signatureImageSources(property);
  const price = property.signaturePriceVisible === false ? "Preço sob consulta" : publicPriceLabel(property);

  return (
    <Link
      href={signaturePropertyHref(property, referrer)}
      className={`group block min-w-0 text-[#171512] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#92764a] ${featured ? "md:col-span-2" : ""}`}
    >
      <div className={`relative aspect-[4/3] overflow-hidden bg-[#172231] ${featured ? "md:aspect-[2/1]" : "md:aspect-[3/2]"}`}>
        <SignatureImage
          sources={images}
          alt=""
          sizes={featured ? "(min-width: 1500px) 1420px, 100vw" : "(min-width: 768px) 50vw, 100vw"}
          priority={featured}
          className={`object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.025] ${completed ? "grayscale" : ""}`}
        />
        <PropertyBadges acceptsExchange={property.acceptsExchange} status={property.status} className="absolute left-4 top-4" />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2 border-b border-[#8e7d62]/35 px-4 pb-5 pt-4 sm:px-0">
        <div className="min-w-0">
          <p className="text-sm text-[#786445]">{property.municipality}</p>
          <h3 className={`mt-1 max-w-3xl font-serif text-[1.375rem] leading-tight [overflow-wrap:anywhere] ${featured ? "sm:text-4xl" : "sm:text-2xl"}`}>
            {property.signatureEditorialTitle?.trim() || property.title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {completed ? <CompletionLabel property={property} /> : <span className="font-medium">{price}</span>}
          <span className="inline-flex items-center gap-2 text-[#695331] group-hover:underline group-focus-visible:underline">
            {images.length > 0 ? <><Expand className="size-4" aria-hidden="true" />Ver fotografias</> : "Ver detalhes"}
          </span>
        </div>
      </div>
    </Link>
  );
}
