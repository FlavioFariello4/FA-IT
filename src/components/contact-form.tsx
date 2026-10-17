"use client";

import { useState, type FormEvent } from "react";

export function ContactForm({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    const form = event.currentTarget;
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: new FormData(form),
      });
      const result = (await response.json()) as { message?: string };
      setStatus(result.message ?? "Non è stato possibile inviare la richiesta.");
      if (response.ok) {
        form.reset();
      }
    } catch (error) {
      console.error("Unable to submit contact inquiry:", error);
      setStatus("Connessione non disponibile. Controlla la rete e riprova.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {!enabled && (
        <p className="form-unavailable">
          Il modulo è in attivazione e non raccoglie ancora dati. Contattaci di nuovo più avanti.
        </p>
      )}
      <fieldset className="form-fields" disabled={!enabled}>
      <div className="form-grid">
        <label>
          Nome e cognome <span>*</span>
          <input autoComplete="name" maxLength={120} name="name" required />
        </label>
        <label>
          Email <span>*</span>
          <input autoComplete="email" maxLength={254} name="email" required type="email" />
        </label>
      </div>
      <label>
        Azienda <span className="optional-label">(facoltativo)</span>
        <input autoComplete="organization" maxLength={160} name="company" />
      </label>
      <label>
        Raccontaci il progetto <span>*</span>
        <textarea maxLength={5000} minLength={10} name="message" required rows={5} />
      </label>
      <label className="consent-check">
        <input name="privacyConsent" required type="checkbox" value="on" />
        <span>
          Ho letto l’<a href="/privacy">informativa privacy</a> e acconsento al trattamento
          dei dati per ricevere risposta alla mia richiesta. <b>*</b>
        </span>
      </label>
      <label aria-hidden="true" className="honeypot" tabIndex={-1}>
        Sito web <input autoComplete="off" name="website" tabIndex={-1} />
      </label>
      <button className="button button-dark" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Invio in corso…" : "Invia il messaggio ↗"}
      </button>
      </fieldset>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </form>
  );
}
