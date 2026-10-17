"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

type Consent = "accepted" | "rejected" | null;

const storageKey = "fariello-cookie-consent";

function getConsentSnapshot(): Consent {
  const saved = window.localStorage.getItem(storageKey);
  return saved === "accepted" || saved === "rejected" ? saved : null;
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("fariello-cookie-consent", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("fariello-cookie-consent", callback);
  };
}

export function CookieConsent() {
  const consent = useSyncExternalStore(subscribeToConsent, getConsentSnapshot, () => null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    function handleOpenPreferences() {
      window.localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event("fariello-cookie-consent"));
      setPreferencesOpen(true);
    }

    window.addEventListener("fariello-open-cookie-preferences", handleOpenPreferences);
    return () => window.removeEventListener("fariello-open-cookie-preferences", handleOpenPreferences);
  }, []);

  function saveConsent(value: Exclude<Consent, null>) {
    window.localStorage.setItem(storageKey, value);
    window.dispatchEvent(new Event("fariello-cookie-consent"));
    setPreferencesOpen(false);
  }

  return (
    <>
      {consent === null && (
        <section
          aria-describedby="cookie-description"
          aria-labelledby="cookie-title"
          className="cookie-panel"
          role="dialog"
        >
          <div className="cookie-copy">
            <p className="eyebrow">La tua privacy, prima di tutto</p>
            <h2 id="cookie-title">Un piccolo sì, solo quando vuoi.</h2>
            <p id="cookie-description">
              Usiamo solo strumenti necessari al funzionamento. Eventuali cookie di analisi o
              marketing verranno attivati solo con il tuo consenso.
              {" "}
              <Link href="/privacy">Leggi l’informativa</Link>.
            </p>
            {preferencesOpen && (
              <p className="cookie-essential">
                Sempre attivi: memoria della tua scelta. Facoltativi: analytics e marketing
                (attualmente non installati).
              </p>
            )}
          </div>
          <div className="cookie-actions">
            <button className="button button-dark" onClick={() => saveConsent("accepted")} type="button">
              Accetta tutti
            </button>
            <button className="button button-light" onClick={() => saveConsent("rejected")} type="button">
              Rifiuta facoltativi
            </button>
            {!preferencesOpen && (
              <button className="text-button" onClick={() => setPreferencesOpen(true)} type="button">
                Personalizza
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
