import { NextResponse } from "next/server";
import { getStaffApiContext } from "@/lib/backend/staff-api";

export const runtime = "nodejs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getStaffApiContext(request, ["hr_manager"]);
  if ("response" in result) {
    return result.response;
  }

  const { id } = await params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ message: "Candidatura non valida." }, { status: 400 });
  }

  const { data: application, error: lookupError } = await result.context.adminClient
    .from("job_applications")
    .select("id,resume_path")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) {
    console.error("Unable to find application for deletion:", lookupError.message);
    return NextResponse.json({ message: "Non è stato possibile caricare la candidatura." }, { status: 500 });
  }
  if (!application) {
    return NextResponse.json({ message: "Candidatura non trovata." }, { status: 404 });
  }

  const { error: fileError } = await result.context.adminClient.storage
    .from("resumes")
    .remove([application.resume_path]);
  if (fileError) {
    console.error("Unable to delete application CV:", fileError.message);
    return NextResponse.json(
      { message: "Candidatura non eliminata: non è stato possibile rimuovere il CV." },
      { status: 500 },
    );
  }

  const { error: deleteError } = await result.context.adminClient
    .from("job_applications")
    .delete()
    .eq("id", id);
  if (deleteError) {
    console.error("CV removed but application record could not be deleted:", deleteError.message);
    return NextResponse.json(
      { message: "Il CV è stato rimosso, ma la scheda non è stata eliminata. Riprova o contatta l’amministratore." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Candidatura e CV eliminati." });
}
