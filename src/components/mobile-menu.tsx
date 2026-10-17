"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { siteConfig } from "@/lib/site-config";

const links = [
  { href: "/servizi", label: "Servizi", sublabel: "Cosa facciamo" },
  { href: "/portfolio", label: "Progetti", sublabel: "Lavori e idee" },
  { href: "/studio", label: "Studio", sublabel: "Chi siamo" },
  { href: "/lavora-con-noi", label: "Lavora con noi", sublabel: "Cresciamo insieme" },
  { href: "/contatti", label: "Contatti", sublabel: "Iniziamo a parlarne" },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
  }, [pathname]);

  return (
    <>
      <button
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Chiudi il menu" : "Apri il menu"}
        className={`mobile-menu-toggle${isOpen ? " is-open" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span />
        <span />
      </button>
      <dialog
        aria-label={`Menu di navigazione ${siteConfig.name}`}
        className="mobile-menu-dialog"
        id="mobile-navigation"
        onCancel={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setIsOpen(false);
          }
        }}
        onClose={() => setIsOpen(false)}
        ref={dialogRef}
      >
        <div className="mobile-menu-inner">
          <div className="mobile-menu-topline">
            <span className="mobile-menu-label">Esplora FA IT</span>
            <button
              aria-label="Chiudi il menu"
              className="mobile-menu-close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Chiudi <span aria-hidden="true">×</span>
            </button>
          </div>
          <nav aria-label="Navigazione mobile" className="mobile-menu-links">
            {links.map((link, index) => (
              <Link
                className="mobile-menu-link"
                href={link.href}
                key={link.href}
                onClick={() => setIsOpen(false)}
                style={{ "--menu-index": index } as CSSProperties}
                tabIndex={isOpen ? 0 : -1}
              >
                <span className="mobile-menu-number">0{index + 1}</span>
                <span className="mobile-menu-link-copy">
                  <span className="mobile-menu-link-title">{link.label}</span>
                  <span className="mobile-menu-link-subtitle">{link.sublabel}</span>
                </span>
                <span aria-hidden="true" className="mobile-menu-arrow">↗</span>
              </Link>
            ))}
          </nav>
          <p className="mobile-menu-footnote">Idee chiare. Digitale, fatto bene.</p>
        </div>
      </dialog>
    </>
  );
}
