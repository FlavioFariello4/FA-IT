"use client";

import { usePathname } from "next/navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";
import { DesktopNavigation, SiteHeader } from "@/components/site-header";

type SiteChromeProps = {
  position: "header" | "footer";
};

export function SiteChrome({ position }: SiteChromeProps) {
  const pathname = usePathname();
  if (pathname.startsWith("/area-riservata")) {
    return null;
  }

  if (position === "header") {
    return (
      <SiteHeader>
        <DesktopNavigation />
        <MobileMenu />
      </SiteHeader>
    );
  }

  return <SiteFooter />;
}
