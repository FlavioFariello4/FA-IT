import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";
import { IntroLoader } from "@/components/intro-loader";
import { MotionEnhancements } from "@/components/motion-enhancements";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, DesktopNavigation } from "@/components/site-header";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Idee digitali, fatte bene`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    "Progettiamo e sviluppiamo siti web, e-commerce e applicazioni digitali su misura. Un team indipendente, curioso e concreto.",
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Idee digitali, fatte bene`,
    description:
      "Siti web, e-commerce e applicazioni digitali progettati per crescere insieme al tuo business.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Idee digitali, fatte bene`,
    description:
      "Siti web, e-commerce e applicazioni digitali progettati per crescere insieme al tuo business.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f4ef",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
        <a className="skip-link" href="#contenuto">
          Salta al contenuto
        </a>
        <SiteHeader>
          <DesktopNavigation />
          <MobileMenu />
        </SiteHeader>
        <main id="contenuto">{children}</main>
        <SiteFooter />
        <CookieConsent />
        <IntroLoader />
        <MotionEnhancements />
      </body>
    </html>
  );
}
