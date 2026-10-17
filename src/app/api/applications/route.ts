import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseMultipartForm } from "@/lib/limited-form-data";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const maxFileSize = 5 * 1024 * 1024;
const maxRequestBytes = 6 * 1024 * 1024;
const allowedTypes = new Map([
  ["application/pdf", ".pdf"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
]);

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
    return NextResponse.json({ message: "Il file supera il limite di 5 MB." }, { status: 413 });
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
  const education = readText(formData, "education", 180);
  const message = readText(formData, "message", 2500);
  const jobPostingId = readText(formData, "jobPostingId", 36);
  const privacyConsent = formData.get("privacyConsent") === "on";
  const resume = formData.get("resume");

  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !education ||
    !privacyConsent ||
    (jobPostingId !== "" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(jobPostingId)) ||
    !(resume instanceof File) ||
    resume.size === 0 ||
    resume.size > maxFileSize ||
    !allowedTypes.has(resume.type) ||
    !resume.name.toLowerCase().endsWith(allowedTypes.get(resume.type) ?? ".invalid")
  ) {
    return NextResponse.json(
      { message: "Verifica i dati, il consenso e che il CV sia PDF o DOCX (max 5 MB)." },
      { status: 400 },
    );
  }

  const fileBytes = new Uint8Array(await resume.arrayBuffer());
  const isPdf = resume.type === "application/pdf";
  const validSignature = isPdf
    ? new TextDecoder().decode(fileBytes.slice(0, 5)) === "%PDF-"
    : fileBytes[0] === 0x50 &&
      fileBytes[1] === 0x4b &&
      fileBytes[2] === 0x03 &&
      fileBytes[3] === 0x04;

  if (!validSignature) {
    return NextResponse.json(
      { message: "Il file non sembra corrispondere al formato selezionato." },
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

  if (jobPostingId) {
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("id")
      .eq("id", jobPostingId)
      .eq("published", true)
      .maybeSingle();
    if (jobError) {
      console.error("Unable to verify selected job posting:", jobError.message);
      return NextResponse.json(
        { message: "Non è stato possibile verificare la posizione selezionata." },
        { status: 500 },
      );
    }
    if (!job) {
      return NextResponse.json(
        { message: "La posizione selezionata non è più disponibile." },
        { status: 400 },
      );
    }
  }

  const objectPath = `${randomUUID()}/${randomUUID()}${allowedTypes.get(resume.type)}`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(objectPath, fileBytes, { contentType: resume.type, upsert: false });

  if (uploadError) {
    console.error("Unable to store job application CV:", uploadError.message);
    return NextResponse.json(
      { message: "Non è stato possibile caricare il CV. Riprova più tardi." },
      { status: 500 },
    );
  }

  const { error: insertError } = await supabase.from("job_applications").insert({
    full_name: name,
    job_posting_id: jobPostingId || null,
    email,
    education,
    message: message || null,
    privacy_consent: privacyConsent,
    resume_path: objectPath,
  });

  if (insertError) {
    const { error: cleanupError } = await supabase.storage.from("resumes").remove([objectPath]);
    if (cleanupError) {
      console.error("Unable to remove orphaned job application CV:", cleanupError.message);
    }
    console.error("Unable to save job application:", insertError.message);
    return NextResponse.json(
      { message: "Non è stato possibile inviare la candidatura. Riprova più tardi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Candidatura inviata. Grazie per esserti presentato!" });
}
