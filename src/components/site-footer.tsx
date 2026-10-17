import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link aria-label={`${siteConfig.name}, homepage`} className="wordmark footer-mark" href="/">
          <span className="wordmark-symbol" aria-hidden="true">
            FA
          </span>
          <span className="wordmark-name">{siteConfig.wordmark}</span>
        </Link>
        <p>Il prossimo progetto<br />inizia con una conversazione.</p>
        <Link className="footer-cta" href="/contatti">
          Raccontaci la tua idea <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} {siteConfig.name} · Un progetto in costruzione.</span>
        <nav aria-label="Informazioni legali">
          <Link href="/privacy">Privacy e cookie</Link>
          <Link href="/lavora-con-noi">Lavora con noi</Link>
          <CookiePreferencesButton />
        </nav>
      </div>
    </footer>
  );
}
