import { NextResponse } from "next/server";
import { getStaffApiContext } from "@/lib/backend/staff-api";
import { readJsonObject } from "@/lib/backend/http";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxReplyLength = 10000;
const supportEmail = "support@fa-it.it";
const defaultReplyDomain = "inbound.fa-it.it";

function getReplyDomain() {
  const domain = (process.env.SUPPORT_EMAIL_REPLY_DOMAIN || defaultReplyDomain).trim().toLowerCase();
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
    ? domain
    : null;
}

async function markDeliveryFailed(
  adminClient: AdminClient,
  replyId: string,
) {
  const { error } = await adminClient
    .from("contact_inquiry_replies")
    .update({ delivery_status: "failed" })
    .eq("id", replyId);
  if (error) {
    console.error("Unable to mark support reply as failed:", error.message);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getStaffApiContext(request, ["support"]);
  if ("response" in result) {
    return result.response;
  }

  const { id } = await params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ message: "Richiesta non valida." }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxReplyLength + 2048) {
    return NextResponse.json({ message: "La risposta è troppo lunga." }, { status: 413 });
  }
  const payload = await readJsonObject(request);
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  if (
    !body ||
    body.length > maxReplyLength ||
    typeof payload?.requestId !== "string" ||
    !uuidPattern.test(payload.requestId)
  ) {
    return NextResponse.json(
      { message: `La risposta deve contenere da 1 a ${maxReplyLength} caratteri e avere un identificativo valido.` },
      { status: 400 },
    );
  }
  const requestId = payload.requestId;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_EMAIL_FROM?.trim() || `FA IT Support <${supportEmail}>`;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Invio email non configurato: aggiungi RESEND_API_KEY nell’ambiente del servizio." },
      { status: 503 },
    );
  }
  const senderAddress = from.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (/[\r\n]/.test(from) || senderAddress.toLowerCase() !== supportEmail) {
    console.error("SUPPORT_EMAIL_FROM must use the verified support@fa-it.it sender.");
    return NextResponse.json(
      { message: "Il mittente email deve essere configurato con support@fa-it.it." },
      { status: 503 },
    );
  }

  const { data: inquiry, error: inquiryError } = await result.context.adminClient
    .from("contact_inquiries")
    .select("id,name,email,assigned_to,reply_token")
    .eq("id", id)
    .maybeSingle();
  if (inquiryError) {
    console.error("Unable to load inquiry for reply:", inquiryError.message);
    return NextResponse.json({ message: "Non è stato possibile caricare la richiesta." }, { status: 500 });
  }
  if (!inquiry) {
    return NextResponse.json({ message: "Richiesta non trovata." }, { status: 404 });
  }

  const isAdmin = result.context.roles.includes("admin");
  if (!isAdmin && inquiry.assigned_to !== result.context.userId) {
    return NextResponse.json(
      { message: "Può rispondere solo la persona assegnata alla richiesta." },
      { status: 403 },
    );
  }

  const replyDomain = getReplyDomain();
  if (!replyDomain) {
    console.error("SUPPORT_EMAIL_REPLY_DOMAIN has an invalid value.");
    return NextResponse.json(
      { message: "Il dominio per ricevere le risposte non è configurato correttamente." },
      { status: 503 },
    );
  }

  const { data: latestInbound, error: threadError } = await result.context.adminClient
    .from("contact_inquiry_replies")
    .select("email_message_id,email_subject")
    .eq("inquiry_id", inquiry.id)
    .eq("direction", "inbound")
    .not("email_message_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (threadError) {
    console.error("Unable to load support email thread headers:", threadError.message);
    return NextResponse.json({ message: "Non è stato possibile preparare la conversazione." }, { status: 500 });
  }

  const previousSubject = latestInbound?.email_subject?.trim();
  const subject = previousSubject
    ? (/^re:\s*/i.test(previousSubject) ? previousSubject : `Re: ${previousSubject}`)
    : "Re: la tua richiesta a FA IT";
  const emailHeaders: Record<string, string> = {};
  if (latestInbound?.email_message_id) {
    emailHeaders["In-Reply-To"] = latestInbound.email_message_id;
  }

  const { data: existingReply, error: existingReplyError } = await result.context.adminClient
    .from("contact_inquiry_replies")
    .select("id,inquiry_id,sender_email,body,direction,delivery_status,created_at,sent_at,email_subject")
    .eq("request_id", requestId)
    .eq("direction", "outbound")
    .maybeSingle();
  if (existingReplyError) {
    console.error("Unable to check support reply idempotency:", existingReplyError.message);
    return NextResponse.json({ message: "Non è stato possibile verificare l’invio precedente." }, { status: 500 });
  }
  if (existingReply && existingReply.inquiry_id !== inquiry.id) {
    return NextResponse.json({ message: "Identificativo risposta non valido." }, { status: 409 });
  }
  if (existingReply && existingReply.body !== body) {
    return NextResponse.json(
      { message: "Per riprovare una risposta già preparata, usa lo stesso testo." },
      { status: 409 },
    );
  }
  if (existingReply?.delivery_status === "sent") {
    const { error: statusError } = await result.context.adminClient
      .from("contact_inquiries")
      .update({ status: "replied" })
      .eq("id", inquiry.id);
    if (statusError) {
      console.error("Previously sent reply found but inquiry status could not be updated:", statusError.message);
    }
    return NextResponse.json({
      message: statusError
        ? "Questa risposta risulta già inviata; non è stato possibile aggiornare lo stato."
        : "Questa risposta risulta già inviata.",
      reply: existingReply,
      status: statusError ? "sent_status_update_failed" : "sent",
    });
  }

  const replyQuery = existingReply
    ? result.context.adminClient
      .from("contact_inquiry_replies")
      .update({ delivery_status: "pending", email_subject: subject })
      .eq("id", existingReply.id)
    : result.context.adminClient
      .from("contact_inquiry_replies")
      .insert({
        request_id: requestId,
        inquiry_id: inquiry.id,
        sender_id: result.context.userId,
        sender_email: result.context.userEmail,
        body,
        direction: "outbound",
        delivery_status: "pending",
        email_subject: subject,
      });
  const { data: reply, error: replyError } = await replyQuery
    .select("id,inquiry_id,sender_email,body,direction,delivery_status,created_at,sent_at,email_subject")
    .single();
  if (replyError) {
    console.error("Unable to save support reply:", replyError.message);
    return NextResponse.json({ message: "Non è stato possibile preparare la risposta." }, { status: 500 });
  }

  /*
   * Reusing the reply id keeps the provider idempotency key stable if the
   * client retries after a timeout or an interrupted response.
   */
  const replyId = reply.id;

  let emailResponse: Response;
  try {
    emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `support-reply/${replyId}`,
      },
      body: JSON.stringify({
        from,
        to: [inquiry.email],
        reply_to: `support+${inquiry.reply_token}@${replyDomain}`,
        subject,
        headers: emailHeaders,
        text: `${body}\n\n—\nFA IT Support\n${supportEmail}`,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error(
      "Unable to send support reply through Resend:",
      error instanceof Error ? error.message : "Unknown network error",
    );
    await markDeliveryFailed(result.context.adminClient, replyId);
    return NextResponse.json(
      { message: "Invio email non riuscito. La bozza è conservata; controlla la configurazione e riprova." },
      { status: 502 },
    );
  }

  let responseBody: { id?: unknown; message?: unknown } | null;
  try {
    responseBody = await emailResponse.json() as { id?: unknown; message?: unknown };
  } catch (error) {
    console.error(
      "Resend returned an unreadable response:",
      error instanceof Error ? error.message : "Unknown provider response error",
    );
    await markDeliveryFailed(result.context.adminClient, replyId);
    return NextResponse.json(
      { message: "Non è stato possibile verificare l’esito dell’invio. Riprova usando lo stesso testo." },
      { status: 502 },
    );
  }
  if (!emailResponse.ok || typeof responseBody?.id !== "string") {
    console.error("Resend rejected support reply:", {
      status: emailResponse.status,
      message: typeof responseBody?.message === "string" ? responseBody.message : "Invalid provider response",
    });
    await markDeliveryFailed(result.context.adminClient, replyId);
    return NextResponse.json(
      {
        message: "Il provider email non ha accettato la risposta. Controlla la configurazione e riprova.",
        status: "provider_rejected",
      },
      { status: 502 },
    );
  }

  const sentAt = new Date().toISOString();
  const { data: sentReply, error: updateReplyError } = await result.context.adminClient
    .from("contact_inquiry_replies")
    .update({
      delivery_status: "sent",
      provider_message_id: responseBody.id,
      sent_at: sentAt,
    })
    .eq("id", replyId)
    .select("id,inquiry_id,sender_email,body,direction,delivery_status,created_at,sent_at,email_subject")
    .single();
  if (updateReplyError) {
    console.error("Email sent but reply history could not be updated:", updateReplyError.message);
    return NextResponse.json(
      { message: "Email inviata, ma non è stato possibile aggiornare lo storico. Contatta l’amministratore prima di riprovare." },
      { status: 500 },
    );
  }

  const { error: statusError } = await result.context.adminClient
    .from("contact_inquiries")
    .update({ status: "replied" })
    .eq("id", inquiry.id);
  if (statusError) {
    console.error("Support reply sent but inquiry status could not be updated:", statusError.message);
  }

  return NextResponse.json({
    message: statusError
      ? "Risposta inviata; non è stato possibile aggiornare lo stato della richiesta."
      : "Risposta inviata.",
    reply: sentReply,
    status: statusError ? "sent_status_update_failed" : "sent",
  }, { status: 201 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getStaffApiContext(request, ["support"], { allowMissingOrigin: true });
  if ("response" in result) {
    return result.response;
  }

  const { id } = await params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ message: "Richiesta non valida." }, { status: 400 });
  }

  const { data: inquiry, error: inquiryError } = await result.context.adminClient
    .from("contact_inquiries")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (inquiryError) {
    console.error("Unable to verify inquiry before loading its conversation:", inquiryError.message);
    return NextResponse.json({ message: "Non è stato possibile caricare la conversazione." }, { status: 500 });
  }
  if (!inquiry) {
    return NextResponse.json({ message: "Richiesta non trovata." }, { status: 404 });
  }

  const replies: Array<{
    id: string;
    inquiry_id: string;
    sender_email: string;
    body: string;
    direction: "inbound" | "outbound";
    delivery_status: "pending" | "sent" | "failed" | "received";
    created_at: string;
    sent_at: string | null;
    email_subject: string | null;
  }> = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await result.context.adminClient
      .from("contact_inquiry_replies")
      .select("id,inquiry_id,sender_email,body,direction,delivery_status,created_at,sent_at,email_subject")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true })
      .range(offset, offset + 999);
    if (error) {
      console.error("Unable to refresh support conversation:", error.message);
      return NextResponse.json({ message: "Non è stato possibile aggiornare la conversazione." }, { status: 500 });
    }
    replies.push(...(data ?? []));
    if ((data ?? []).length < 1000) {
      break;
    }
  }

  return NextResponse.json({ replies, status: inquiry.status });
}
