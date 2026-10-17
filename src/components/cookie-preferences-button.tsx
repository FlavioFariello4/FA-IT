"use client";

export function CookiePreferencesButton() {
  return (
    <button
      className="cookie-preferences-button"
      onClick={() => window.dispatchEvent(new Event("fariello-open-cookie-preferences"))}
      type="button"
    >
      Preferenze cookie
    </button>
  );
}
