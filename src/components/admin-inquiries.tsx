"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type InquiryStatus = "new" | "in_progress" | "replied" | "archived";
type ReplyStatus = "pending" | "sent" | "failed" | "received";
type InquiryReply = {
  id: string;
  inquiry_id: string;
  sender_email: string;
  body: string;
  direction: "inbound" | "outbound";
  delivery_status: ReplyStatus;
  created_at: string;
  sent_at: string | null;
  email_subject: string | null;
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
  const [openConversationId, setOpenConversationId] = useState<string | null>(null);
  const replyAttempts = useRef(new Map<string, { requestId: string; body: string }>());

  useEffect(() => {
    if (!openConversationId) {
      return;
    }
    let active = true;
    const refreshConversation = async () => {
      try {
        const response = await fetch(`/api/admin/inquiries/${openConversationId}/replies`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Conversation refresh failed (${response.status}).`);
        }
        const result = await response.json() as { replies?: InquiryReply[]; status?: InquiryStatus };
        const refreshedReplies = result.replies;
        if (!Array.isArray(refreshedReplies)) {
          throw new Error("Conversation refresh returned an invalid response.");
        }
        if (active) {
          setInquiries((current) => current.map((inquiry) => inquiry.id === openConversationId
            ? { ...inquiry, replies: refreshedReplies, status: result.status ?? inquiry.status }
            : inquiry));
        }
      } catch (error) {
        console.error("Unable to refresh support conversation:", error);
      }
    };
    void refreshConversation();
    const interval = window.setInterval(() => void refreshConversation(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [openConversationId]);

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

    let response: Response;
    try {
      response = await fetch(`/api/admin/inquiries/${inquiry.id}/replies`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ body, requestId }),
      });
    } catch (error) {
      console.error("Support reply request could not reach the server:", error);
      setStatusMessage("Il server non è raggiungibile: controlla la connessione e riprova. Se il problema continua, verifica il log del servizio su Render.");
      setBusyId(null);
      return;
    }

    let responseText: string;
    try {
      responseText = await response.text();
    } catch (error) {
      console.error("Unable to read support reply response:", error);
      setStatusMessage(`Connessione interrotta dopo la risposta del server (HTTP ${response.status}). Verifica la conversazione prima di riprovare.`);
      setBusyId(null);
      return;
    }

    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch (error) {
      console.error("Support reply endpoint returned invalid JSON:", {
        status: response.status,
        contentType: response.headers.get("content-type"),
        error: error instanceof Error ? error.message : "Unknown response parsing error",
      });
      setStatusMessage(`Il server ha restituito una risposta non valida (HTTP ${response.status}). Controlla il log del servizio su Render.`);
      setBusyId(null);
      return;
    }
    if (!responseBody || typeof responseBody !== "object" || Array.isArray(responseBody)) {
      console.error("Support reply endpoint returned an unexpected response shape.", {
        status: response.status,
        contentType: response.headers.get("content-type"),
      });
      setStatusMessage(`Il server ha restituito una risposta inattesa (HTTP ${response.status}). Controlla il log del servizio su Render.`);
      setBusyId(null);
      return;
    }
    const result = responseBody as {
      message?: string;
      reply?: InquiryReply;
      status?: string;
    };
    try {
      setStatusMessage(result.message
        ?? `Il server ha risposto senza dettagli (HTTP ${response.status}). Controlla i log del servizio su Render.`);
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
          replies: item.replies.some((reply) => reply.id === sentReply.id)
            ? item.replies
            : [...item.replies, sentReply],
        }
        : item));
      replyAttempts.current.delete(inquiry.id);
      form.reset();
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
                <details
                  className="inquiry-conversation"
                  onToggle={(event) => {
                    const isOpen = event.currentTarget.open;
                    setOpenConversationId((current) =>
                      isOpen ? inquiry.id : current === inquiry.id ? null : current,
                    );
                  }}
                >
                  <summary>
                    Conversazione · {inquiry.replies.length + 1} {inquiry.replies.length === 0 ? "messaggio" : "messaggi"}
                  </summary>
                  <div className="inquiry-reply-history" aria-label="Conversazione email">
                    <article className="inquiry-reply inquiry-reply-inbound">
                    <div>
                      <span>{inquiry.name} · {inquiry.email}</span>
                      <time dateTime={inquiry.created_at}>
                        {new Date(inquiry.created_at).toLocaleString("it-IT")}
                      </time>
                    </div>
                    <p>{inquiry.message}</p>
                    </article>
                    {inquiry.replies.map((reply) => (
                    <article
                      className={`inquiry-reply ${reply.direction === "inbound" ? "inquiry-reply-inbound" : "inquiry-reply-outbound"}`}
                      key={reply.id}
                    >
                      <div>
                        <span>
                          {reply.direction === "inbound"
                            ? reply.sender_email
                            : `FA IT Support${reply.sender_email ? ` · operatore ${reply.sender_email}` : ""}`}
                        </span>
                        <time dateTime={reply.created_at}>
                          {new Date(reply.created_at).toLocaleString("it-IT")}
                        </time>
                      </div>
                      <p>{reply.body}</p>
                      {reply.direction === "outbound" && reply.delivery_status !== "sent" && (
                        <span className="workflow-danger">
                          {reply.delivery_status === "pending" ? "Invio in corso" : "Invio non riuscito"}
                        </span>
                      )}
                    </article>
                    ))}
                  </div>
                  {canManage && (
                    <div className="inquiry-reply-composer">
                    <p>La risposta verrà inviata al cliente da support@fa-it.it.</p>
                    <form onSubmit={(event) => void sendReply(event, inquiry)}>
                      <label>
                        Messaggio
                        <textarea maxLength={10000} minLength={1} name="body" required rows={5} />
                      </label>
                      <button className="button button-dark" disabled={busyId === inquiry.id} type="submit">
                        {busyId === inquiry.id ? "Invio…" : "Invia risposta ↗"}
                      </button>
                    </form>
                    </div>
                  )}
                </details>
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
