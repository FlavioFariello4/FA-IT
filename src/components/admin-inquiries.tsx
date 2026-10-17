"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type InquiryStatus = "new" | "in_progress" | "replied" | "archived";
type ReplyStatus = "pending" | "sent" | "failed";
type InquiryReply = {
  id: string;
  inquiry_id: string;
  sender_email: string;
  body: string;
  delivery_status: ReplyStatus;
  created_at: string;
  sent_at: string | null;
};
type Inquiry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: InquiryStatus;
  assigned_to: string | null;
  assignedEmail: string | null;
  created_at: string;
  replies: InquiryReply[];
};
type AssignmentFilter = "all" | "mine" | "unassigned";

const statuses: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "Da leggere" },
  { value: "in_progress", label: "Da ricontattare" },
  { value: "replied", label: "Risposto" },
  { value: "archived", label: "Archiviato" },
];

export function AdminInquiries({
  initialInquiries,
  currentUserId,
  isAdmin,
}: {
  initialInquiries: Inquiry[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const replyAttempts = useRef(new Map<string, { requestId: string; body: string }>());

  const visibleInquiries = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("it");
    return inquiries.filter((inquiry) => {
      if (statusFilter !== "all" && inquiry.status !== statusFilter) {
        return false;
      }
      if (assignmentFilter === "mine" && inquiry.assigned_to !== currentUserId) {
        return false;
      }
      if (assignmentFilter === "unassigned" && inquiry.assigned_to !== null) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return [
        inquiry.name,
        inquiry.email,
        inquiry.company ?? "",
        inquiry.message,
        ...inquiry.replies.map((reply) => reply.body),
      ].some((value) => value.toLocaleLowerCase("it").includes(normalizedSearch));
    });
  }, [assignmentFilter, currentUserId, inquiries, search, statusFilter]);

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
      setStatusMessage("Lo stato non è stato aggiornato. Verifica i permessi e riprova.");
    } else {
      setInquiries((current) =>
        current.map((item) => item.id === inquiry.id ? { ...item, status: value } : item),
      );
      setStatusMessage(`Richiesta aggiornata: ${statuses.find((item) => item.value === value)?.label}.`);
    }
    setBusyId(null);
  }

  async function sendReply(event: FormEvent<HTMLFormElement>, inquiry: Inquiry) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = formData.get("body");
    const body = typeof value === "string" ? value.trim() : "";
    if (!body) {
      setStatusMessage("Scrivi il testo della risposta prima di inviare.");
      return;
    }
    const previousAttempt = replyAttempts.current.get(inquiry.id);
    const requestId = previousAttempt?.body === body
      ? previousAttempt.requestId
      : window.crypto.randomUUID();
    replyAttempts.current.set(inquiry.id, { requestId, body });
    setBusyId(inquiry.id);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/admin/inquiries/${inquiry.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, requestId }),
      });
      const result = await response.json() as {
        message?: string;
        reply?: InquiryReply;
        status?: string;
      };
      setStatusMessage(result.message ?? "Non è stato possibile inviare la risposta.");
      if (result.status === "provider_rejected") {
        replyAttempts.current.delete(inquiry.id);
      }
      if (!response.ok) {
        return;
      }
      if (!result.reply) {
        console.error("Support reply endpoint returned success without a reply record.");
        setStatusMessage("La risposta è stata inviata, ma non è stato possibile aggiornare la conversazione.");
        return;
      }
      const sentReply = result.reply;
      setInquiries((current) => current.map((item) => item.id === inquiry.id
        ? {
          ...item,
          status: result.status === "sent" ? "replied" : item.status,
          replies: [...item.replies, sentReply],
        }
        : item));
      replyAttempts.current.delete(inquiry.id);
      form.reset();
    } catch (error) {
      console.error("Unable to send support reply:", error instanceof Error ? error.message : "Unknown error");
      setStatusMessage("Errore di rete durante l’invio. Controlla la connessione e riprova.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="inquiry-toolbar">
        <p>{visibleInquiries.length} di {inquiries.length} {inquiries.length === 1 ? "richiesta" : "richieste"}</p>
        <label className="inquiry-search">
          <span>Cerca richieste</span>
          <input
            autoComplete="off"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Email, nome o testo del messaggio"
            type="search"
            value={search}
          />
        </label>
        <label className="workflow-status">
          <span>Assegnazione</span>
          <select
            aria-label="Filtra per assegnazione"
            onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
            value={assignmentFilter}
          >
            <option value="all">Tutte le richieste</option>
            <option value="mine">Assegnate a me</option>
            <option value="unassigned">Non assegnate</option>
          </select>
        </label>
        <label className="workflow-status">
          <span>Stato</span>
          <select
            aria-label="Filtra richieste per stato"
            onChange={(event) => setStatusFilter(event.target.value as InquiryStatus | "all")}
            value={statusFilter}
          >
            <option value="all">Tutti gli stati</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
      </div>
      <div className="workflow-list">
        {visibleInquiries.map((inquiry) => {
          const canManage = isAdmin || inquiry.assigned_to === currentUserId;
          const statusLabel = statuses.find((status) => status.value === inquiry.status)?.label ?? inquiry.status;
          return (
            <article className="workflow-card" key={inquiry.id}>
              <div className="workflow-card-main">
                <div className="workflow-card-heading">
                  <div>
                    <p className="workflow-meta">
                      {new Date(inquiry.created_at).toLocaleDateString("it-IT")}
                      {inquiry.company ? ` · ${inquiry.company}` : ""}
                    </p>
                    <h2>{inquiry.name}</h2>
                    <p><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a></p>
                    <p className="inquiry-assignee">
                      Assegnata a:{" "}
                      <strong>
                        {inquiry.assignedEmail
                          ?? (inquiry.assigned_to ? "account support" : "Non assegnata")}
                      </strong>
                      {inquiry.assigned_to === currentUserId && " · tu"}
                    </p>
                  </div>
                  {canManage ? (
                    <label className="workflow-status">
                      <span>Stato richiesta</span>
                      <select
                        aria-label={`Stato richiesta di ${inquiry.name}`}
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
                      <span className="workflow-badge">{statusLabel}</span>
                    </div>
                  )}
                </div>
                <p className="workflow-message">{inquiry.message}</p>
                {inquiry.replies.length > 0 && (
                  <div className="inquiry-reply-history" aria-label="Storico risposte">
                    <h3>Conversazione</h3>
                    {inquiry.replies.map((reply) => (
                      <article className="inquiry-reply" key={reply.id}>
                        <div>
                          <span>{reply.sender_email || "FA IT Support"}</span>
                          <time dateTime={reply.created_at}>
                            {new Date(reply.created_at).toLocaleString("it-IT")}
                          </time>
                        </div>
                        <p>{reply.body}</p>
                        {reply.delivery_status !== "sent" && (
                          <span className="workflow-danger">
                            {reply.delivery_status === "pending" ? "Invio in corso" : "Invio non riuscito"}
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                {canManage && (
                  <details className="inquiry-reply-composer">
                    <summary>Rispondi dal backend · support@fa-it.it</summary>
                    <form onSubmit={(event) => void sendReply(event, inquiry)}>
                      <label>
                        Messaggio
                        <textarea maxLength={10000} minLength={1} name="body" required rows={5} />
                      </label>
                      <button className="button button-dark" disabled={busyId === inquiry.id} type="submit">
                        {busyId === inquiry.id ? "Invio…" : "Invia risposta ↗"}
                      </button>
                    </form>
                  </details>
                )}
              </div>
            </article>
          );
        })}
        {visibleInquiries.length === 0 && (
          <p className="workflow-empty">
            {inquiries.length === 0
              ? "Ancora nessuna richiesta ricevuta."
              : "Nessuna richiesta corrisponde ai filtri e alla ricerca."}
          </p>
        )}
      </div>
      <p aria-live="polite" className="form-status workflow-status-message" role="status">{statusMessage}</p>
    </>
  );
}
