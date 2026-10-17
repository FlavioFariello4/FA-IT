import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import type { ReactNode } from "react";

const links = [
  { href: "/servizi", label: "Servizi" },
  { href: "/portfolio", label: "Progetti" },
  { href: "/studio", label: "Studio" },
  { href: "/lavora-con-noi", label: "Lavora con noi" },
];

export function DesktopNavigation() {
  return (
    <nav aria-label="Navigazione principale" className="desktop-nav">
      {links.map((link) => (
        <Link href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader({ children }: { children: ReactNode }) {
  return (
    <header className="site-header">
      <Link aria-label={`${siteConfig.name}, homepage`} className="wordmark" href="/">
        <span className="wordmark-symbol" aria-hidden="true">
          FA
        </span>
        <span className="wordmark-name">{siteConfig.wordmark}</span>
      </Link>
      <Link className="header-contact" href="/contatti">
        Parliamone <span aria-hidden="true">↗</span>
      </Link>
      {children}
    </header>
  );
}
