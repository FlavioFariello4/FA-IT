"use client";

import { usePathname } from "next/navigation";
import { MobileMenu } from "@/components/mobile-menu";
import { SiteFooter } from "@/components/site-footer";
import { DesktopNavigation, SiteHeader } from "@/components/site-header";

export function SiteChrome() {
  const pathname = usePathname();
  if (pathname.startsWith("/area-riservata")) {
    return null;
  }

  return (
    <>
      <SiteHeader>
        <DesktopNavigation />
        <MobileMenu />
      </SiteHeader>
      <SiteFooter />
    </>
  );
}
