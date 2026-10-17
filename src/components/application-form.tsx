"use client";

import { useState, type FormEvent } from "react";

type ApplicationFormProps = {
  jobs: { id: string; title: string }[];
};

export function ApplicationForm({ jobs, enabled }: ApplicationFormProps & { enabled: boolean }) {
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("");

    const form = event.currentTarget;
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        body: new FormData(form),
      });
      const result = (await response.json()) as { message?: string };
      setStatus(result.message ?? "Non è stato possibile inviare la candidatura.");
      if (response.ok) {
        form.reset();
      }
    } catch (error) {
      console.error("Unable to submit job application:", error);
      setStatus("Connessione non disponibile. Controlla la rete e riprova.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {!enabled && (
        <p className="form-unavailable">
          Il canale candidature è in attivazione e non raccoglie ancora dati. Torna a trovarci più avanti.
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
        Formazione o percorso <span>*</span>
        <input maxLength={180} name="education" placeholder="Es. diploma in informatica" required />
      </label>
      {jobs.length > 0 && (
        <label>
          Posizione di interesse <span className="optional-label">(facoltativa)</span>
          <select className="form-select" name="jobPostingId">
            <option value="">Candidatura spontanea</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </label>
      )}
      <label>
        Una breve presentazione <span className="optional-label">(facoltativa)</span>
        <textarea maxLength={2500} name="message" rows={4} />
      </label>
      <label className="file-field">
        Il tuo CV <span>*</span>
        <input accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" name="resume" required type="file" />
        <small>PDF o DOCX, massimo 5 MB.</small>
      </label>
      <label className="consent-check">
        <input name="privacyConsent" required type="checkbox" value="on" />
        <span>
          Ho letto l’<a href="/privacy">informativa privacy</a> e acconsento al trattamento
          dei dati per valutare la mia candidatura. <b>*</b>
        </span>
      </label>
      <label aria-hidden="true" className="honeypot" tabIndex={-1}>
        Sito web <input autoComplete="off" name="website" tabIndex={-1} />
      </label>
      <button className="button button-dark" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Invio in corso…" : "Invia la candidatura ↗"}
      </button>
      </fieldset>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </form>
  );
}
