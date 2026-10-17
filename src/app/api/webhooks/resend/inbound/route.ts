import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const maxWebhookBytes = 64 * 1024;
const maxMessageLength = 100000;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReceivedEmail = {
  id?: unknown;
  from?: unknown;
  to?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  message_id?: unknown;
  headers?: unknown;
};

function emailAddress(value: string) {
  const bracketed = value.match(/<([^<>]+)>/);
  const address = (bracketed?.[1] ?? value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : null;
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\s*br\s*\/?>|<\/(?:div|p|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'");
}

function normalizedHeader(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return null;
  }
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
  return typeof entry?.[1] === "string" ? entry[1].slice(0, 998) : null;
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxWebhookBytes) {
    return NextResponse.json({ message: "Webhook troppo grande." }, { status: 413 });
  }

  const rawPayload = await request.text();
  if (Buffer.byteLength(rawPayload, "utf8") > maxWebhookBytes) {
    return NextResponse.json({ message: "Webhook troppo grande." }, { status: 413 });
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Resend inbound webhook is not configured: RESEND_WEBHOOK_SECRET is missing.");
    return NextResponse.json({ message: "Webhook non configurato." }, { status: 503 });
  }
  const webhookHeaders = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };
  if (Object.values(webhookHeaders).some((value) => !value)) {
    return NextResponse.json({ message: "Firma webhook non valida." }, { status: 401 });
  }

  const webhook = new Webhook(webhookSecret);
  try {
    webhook.verify(rawPayload, webhookHeaders);
  } catch {
    console.warn("Rejected an invalid Resend inbound webhook signature.");
    return NextResponse.json({ message: "Firma webhook non valida." }, { status: 401 });
  }
  let event: { type?: unknown; data?: { email_id?: unknown } };
  try {
    event = JSON.parse(rawPayload) as typeof event;
  } catch (error) {
    console.error("Resend sent invalid JSON to the inbound webhook:", error);
    return NextResponse.json({ message: "Payload non valido." }, { status: 400 });
  }
  if (event.type !== "email.received" || typeof event.data?.email_id !== "string") {
    return NextResponse.json({ received: true });
  }

  const adminClient = createSupabaseAdminClient();
  const apiKey = process.env.RESEND_API_KEY;
  if (!adminClient || !apiKey) {
    console.error("Resend inbound webhook cannot access Supabase or Resend.");
    return NextResponse.json({ message: "Webhook non configurato." }, { status: 503 });
  }

  const emailId = event.data.email_id;
  const { data: duplicate, error: duplicateError } = await adminClient
    .from("contact_inquiry_replies")
    .select("id")
    .eq("provider_email_id", emailId)
    .maybeSingle();
  if (duplicateError) {
    console.error("Unable to check inbound email idempotency:", duplicateError.message);
    return NextResponse.json({ message: "Errore nel controllo dei duplicati." }, { status: 500 });
  }
  if (duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch(
      `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch (error) {
    console.error(
      "Unable to retrieve inbound email from Resend:",
      error instanceof Error ? error.message : "Unknown network error",
    );
    return NextResponse.json({ message: "Email non recuperabile dal provider." }, { status: 502 });
  }
  if (!providerResponse.ok) {
    console.error("Resend rejected inbound email retrieval:", providerResponse.status);
    return NextResponse.json({ message: "Email non recuperabile dal provider." }, { status: 502 });
  }

  let email: ReceivedEmail;
  try {
    email = await providerResponse.json() as ReceivedEmail;
  } catch (error) {
    console.error(
      "Resend returned invalid inbound email JSON:",
      error instanceof Error ? error.message : "Unknown response error",
    );
    return NextResponse.json({ message: "Risposta provider non valida." }, { status: 502 });
  }

  const replyDomain = (process.env.SUPPORT_EMAIL_REPLY_DOMAIN || "inbound.fa-it.it").trim().toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(replyDomain)) {
    console.error("SUPPORT_EMAIL_REPLY_DOMAIN has an invalid value.");
    return NextResponse.json({ message: "Dominio di risposta non valido." }, { status: 503 });
  }
  const recipients = Array.isArray(email.to)
    ? email.to.filter((recipient): recipient is string => typeof recipient === "string")
    : [];
  const tokenPattern = new RegExp(`^support\\+(${uuidPattern.source.slice(1, -1)})@${replyDomain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const replyToken = recipients
    .map((recipient) => recipient.trim().toLowerCase())
    .map((recipient) => recipient.match(tokenPattern)?.[1])
    .find((token): token is string => Boolean(token));
  if (!replyToken) {
    console.warn("Ignoring inbound email not addressed to a known support conversation.");
    return NextResponse.json({ received: true, ignored: true });
  }

  const { data: inquiry, error: inquiryError } = await adminClient
    .from("contact_inquiries")
    .select("id,email")
    .eq("reply_token", replyToken)
    .maybeSingle();
  if (inquiryError) {
    console.error("Unable to resolve inbound support conversation:", inquiryError.message);
    return NextResponse.json({ message: "Conversazione non verificabile." }, { status: 500 });
  }
  if (!inquiry) {
    console.warn("Ignoring inbound email for an unknown support conversation.");
    return NextResponse.json({ received: true, ignored: true });
  }

  const sender = typeof email.from === "string" ? emailAddress(email.from) : null;
  if (!sender || sender !== inquiry.email.trim().toLowerCase()) {
    console.warn("Ignoring inbound support email from an address different from the inquiry contact.");
    return NextResponse.json({ received: true, ignored: true });
  }

  const messageText = typeof email.text === "string" && email.text.trim()
    ? email.text.trim()
    : typeof email.html === "string" ? htmlToPlainText(email.html).trim() : "";
  if (!messageText) {
    console.error("Inbound support email has no readable text body.");
    return NextResponse.json({ message: "Il messaggio email è vuoto." }, { status: 422 });
  }

  const truncationNotice = "\n\n[Messaggio abbreviato: superati 100.000 caratteri.]";
  const body = messageText.length > maxMessageLength
    ? `${messageText.slice(0, maxMessageLength - truncationNotice.length)}${truncationNotice}`
    : messageText;
  const messageId = typeof email.message_id === "string" ? email.message_id.slice(0, 998) : null;
  const subject = typeof email.subject === "string" ? email.subject.slice(0, 500) : null;
  const { error: insertError } = await adminClient
    .from("contact_inquiry_replies")
    .insert({
      request_id: randomUUID(),
      inquiry_id: inquiry.id,
      sender_id: null,
      sender_email: sender,
      body,
      direction: "inbound",
      delivery_status: "received",
      provider_email_id: emailId,
      email_message_id: messageId,
      in_reply_to: normalizedHeader(email.headers, "in-reply-to"),
      email_subject: subject,
    });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("Unable to save inbound support email:", insertError.message);
    return NextResponse.json({ message: "Non è stato possibile salvare il messaggio." }, { status: 500 });
  }

  const { error: statusError } = await adminClient
    .from("contact_inquiries")
    .update({ status: "in_progress" })
    .eq("id", inquiry.id)
    .neq("status", "archived");
  if (statusError) {
    console.error("Inbound message saved but inquiry status could not be updated:", statusError.message);
  }

  return NextResponse.json({ received: true });
}
