import { NextResponse } from "next/server";
import { parseMultipartForm } from "@/lib/limited-form-data";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
const maxRequestBytes = 20 * 1024;

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin) {
    return NextResponse.json({ message: "Richiesta non valida." }, { status: 403 });
  }
  if (process.env.PUBLIC_FORMS_ENABLED !== "true") {
    return NextResponse.json(
      { message: "Il modulo non è ancora attivo. Riprova più avanti." },
      { status: 503 },
    );
  }

  const parsedForm = await parseMultipartForm(request, maxRequestBytes);
  if ("tooLarge" in parsedForm) {
    return NextResponse.json({ message: "Il messaggio è troppo grande." }, { status: 413 });
  }
  if ("invalidContentType" in parsedForm) {
    return NextResponse.json({ message: "Formato della richiesta non valido." }, { status: 415 });
  }
  const formData = parsedForm.formData;
  if (readText(formData, "website", 200)) {
    return NextResponse.json({ message: "Controlla i campi e riprova." }, { status: 400 });
  }

  const name = readText(formData, "name", 120);
  const email = readText(formData, "email", 254);
  const company = readText(formData, "company", 160);
  const message = readText(formData, "message", 5000);
  const privacyConsent = formData.get("privacyConsent") === "on";

  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    message.length < 10 ||
    !privacyConsent
  ) {
    return NextResponse.json(
      { message: "Verifica nome, email, messaggio e consenso privacy." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Il modulo non è ancora attivo. Riprova più avanti." },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("contact_inquiries").insert({
    name,
    email,
    company: company || null,
    message,
    privacy_consent: privacyConsent,
  });

  if (error) {
    console.error("Unable to save contact inquiry:", error.message);
    return NextResponse.json(
      { message: "Non è stato possibile inviare la richiesta. Riprova più tardi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Messaggio inviato. Grazie per averci scritto!" });
}
