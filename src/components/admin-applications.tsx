"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ApplicationStatus = "received" | "reviewing" | "interview" | "rejected" | "hired";
type Application = {
  id: string;
  full_name: string;
  email: string;
  education: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  resumeUrl: string | null;
};

const statuses: { value: ApplicationStatus; label: string }[] = [
  { value: "received", label: "Nuova" },
  { value: "reviewing", label: "In valutazione" },
  { value: "interview", label: "Colloquio" },
  { value: "rejected", label: "Scartata" },
  { value: "hired", label: "Selezionata" },
];

export function AdminApplications({ initialApplications }: { initialApplications: Application[] }) {
  const [applications, setApplications] = useState(initialApplications);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  async function updateStatus(application: Application, value: ApplicationStatus) {
    setBusyId(application.id);
    setStatusMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatusMessage("La connessione al database non è configurata.");
      setBusyId(null);
      return;
    }
    const { error } = await supabase
      .from("job_applications")
      .update({ status: value })
      .eq("id", application.id);
    if (error) {
      console.error("Unable to update application status:", error.message);
      setStatusMessage("Lo stato non è stato aggiornato. Controlla i permessi e riprova.");
    } else {
      setApplications((current) =>
        current.map((item) => item.id === application.id ? { ...item, status: value } : item),
      );
      setStatusMessage(`Stato aggiornato: ${statuses.find((item) => item.value === value)?.label}.`);
    }
    setBusyId(null);
  }

  async function deleteApplication(application: Application) {
    if (!window.confirm(`Eliminare la candidatura di ${application.full_name} e il relativo CV? Questa azione è definitiva.`)) {
      return;
    }
    setBusyId(application.id);
    setStatusMessage("");
    const response = await fetch(`/api/admin/applications/${application.id}`, { method: "DELETE" });
    const result = await response.json() as { message?: string };
    if (!response.ok) {
      setStatusMessage(result.message ?? "Non è stato possibile eliminare la candidatura.");
    } else {
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setStatusMessage(result.message ?? "Candidatura eliminata.");
    }
    setBusyId(null);
  }

  return (
    <>
      <div className="workflow-list">
        {applications.map((application) => (
          <article className="workflow-card" key={application.id}>
            <div className="workflow-card-main">
              <div className="workflow-card-heading">
                <div>
                  <p className="workflow-meta">
                    Ricevuta il {new Date(application.created_at).toLocaleDateString("it-IT")}
                  </p>
                  <h2>{application.full_name}</h2>
                </div>
                <label className="workflow-status">
                  <span>Fase selezione</span>
                  <select
                    aria-label={`Fase della candidatura di ${application.full_name}`}
                    disabled={busyId === application.id}
                    onChange={(event) => void updateStatus(application, event.target.value as ApplicationStatus)}
                    value={application.status}
                  >
                    {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </label>
              </div>
              <p><a href={`mailto:${application.email}`}>{application.email}</a> · {application.education}</p>
              {application.message && <p className="workflow-message">{application.message}</p>}
              <div className="workflow-actions">
                {application.resumeUrl
                  ? <a className="button button-dark" href={application.resumeUrl} rel="noreferrer" target="_blank">Apri CV ↗</a>
                  : <span className="workflow-muted">CV non disponibile</span>}
                <button
                  className="text-button workflow-danger"
                  disabled={busyId === application.id}
                  onClick={() => void deleteApplication(application)}
                  type="button"
                >
                  Elimina candidatura e CV
                </button>
              </div>
            </div>
          </article>
        ))}
        {applications.length === 0 && <p className="workflow-empty">Ancora nessuna candidatura ricevuta.</p>}
      </div>
      <p aria-live="polite" className="form-status workflow-status-message" role="status">{statusMessage}</p>
    </>
  );
}
