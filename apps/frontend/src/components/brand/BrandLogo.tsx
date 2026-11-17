import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  href?: string;
};

export function BrandLogo({
  compact = false,
  inverse = false,
  href = "/",
}: BrandLogoProps) {
  const logoSrc = compact
    ? "/logos/logo-symbol.webp"
    : inverse
      ? "/logos/logo-horizontal-light-preview.webp"
      : "/logos/logo-horizontal.webp";

  return (
    <Link
      className={`brand-logo ${compact ? "is-compact" : ""} ${inverse ? "is-inverse" : ""}`}
      href={href}
      aria-label="Compras Abertas — início"
    >
      <Image
        src={logoSrc}
        width={compact ? 48 : 154}
        height={compact ? 48 : 77}
        sizes={compact ? "48px" : "154px"}
        alt="Compras Abertas"
        priority
      />
    </Link>
  );
}