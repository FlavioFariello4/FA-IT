"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type InquiryStatus = "new" | "in_progress" | "replied" | "archived";
type Inquiry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: InquiryStatus;
  created_at: string;
};

const statuses: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "Da leggere" },
  { value: "in_progress", label: "Da ricontattare" },
  { value: "replied", label: "Risposto" },
  { value: "archived", label: "Archiviato" },
];

export function AdminInquiries({
  initialInquiries,
  canUpdateStatus,
}: {
  initialInquiries: Inquiry[];
  canUpdateStatus: boolean;
}) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [filter, setFilter] = useState<InquiryStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const visibleInquiries = filter === "all"
    ? inquiries
    : inquiries.filter((inquiry) => inquiry.status === filter);

  async function updateStatus(inquiry: Inquiry, value: InquiryStatus) {
    setBusyId(inquiry.id);
    setStatusMessage("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatusMessage("La connessione al database non è configurata.");
      setBusyId(null);
      return;
    }
    const { error } = await supabase
      .from("contact_inquiries")
      .update({ status: value })
      .eq("id", inquiry.id);
    if (error) {
      console.error("Unable to update contact inquiry status:", error.message);
      setStatusMessage("Lo stato non è stato aggiornato. Controlla i permessi e riprova.");
    } else {
      setInquiries((current) =>
        current.map((item) => item.id === inquiry.id ? { ...item, status: value } : item),
      );
      setStatusMessage(`Richiesta aggiornata: ${statuses.find((item) => item.value === value)?.label}.`);
    }
    setBusyId(null);
  }

  return (
    <>
      <div className="workflow-toolbar">
        <p>{inquiries.length} {inquiries.length === 1 ? "richiesta" : "richieste"} in archivio</p>
        <label className="workflow-status">
          <span>Mostra</span>
          <select
            aria-label="Filtra richieste per stato"
            onChange={(event) => setFilter(event.target.value as InquiryStatus | "all")}
            value={filter}
          >
            <option value="all">Tutte</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
      </div>
      <div className="workflow-list">
        {visibleInquiries.map((inquiry) => (
          <article className="workflow-card" key={inquiry.id}>
            <div className="workflow-card-main">
              <div className="workflow-card-heading">
                <div>
                  <p className="workflow-meta">
                    {new Date(inquiry.created_at).toLocaleDateString("it-IT")}
                    {inquiry.company ? ` · ${inquiry.company}` : ""}
                  </p>
                  <h2>{inquiry.name}</h2>
                  <p>{inquiry.email}</p>
                </div>
                {canUpdateStatus ? (
                  <label className="workflow-status">
                    <span>Stato richiesta</span>
                    <select
                      aria-label={`Stato della richiesta di ${inquiry.name}`}
                      disabled={busyId === inquiry.id}
                      onChange={(event) => void updateStatus(inquiry, event.target.value as InquiryStatus)}
                      value={inquiry.status}
                    >
                      {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </label>
                ) : (
                  <div className="workflow-status">
                    <span>Stato richiesta</span>
                    <span className="workflow-badge">{statuses.find((status) => status.value === inquiry.status)?.label}</span>
                  </div>
                )}
              </div>
              <p className="workflow-message">{inquiry.message}</p>
              {canUpdateStatus && (
                <div className="workflow-actions">
                  <a className="button button-dark" href={`mailto:${inquiry.email}?subject=${encodeURIComponent("Re: la tua richiesta a FA IT")}`}>
                    Rispondi via email ↗
                  </a>
                  {inquiry.status !== "replied" && (
                    <button
                      className="text-button"
                      disabled={busyId === inquiry.id}
                      onClick={() => void updateStatus(inquiry, "replied")}
                      type="button"
                    >
                      Segna come risposto
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
        {visibleInquiries.length === 0 && (
          <p className="workflow-empty">
            {inquiries.length === 0 ? "Ancora nessuna richiesta ricevuta." : "Nessuna richiesta con questo stato."}
          </p>
        )}
      </div>
      <p aria-live="polite" className="form-status workflow-status-message" role="status">{statusMessage}</p>
    </>
  );
}
