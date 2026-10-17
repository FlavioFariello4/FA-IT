import type { Metadata } from "next";
import Link from "next/link";
import { AdminApplications } from "@/components/admin-applications";
import { requireStaffRole } from "@/lib/staff-access";

export const metadata: Metadata = {
  title: "Candidature ricevute",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const access = await requireStaffRole(["admin", "hr_manager"]);
  if (!access) {
    return <section className="section-wrap admin-page"><h1>Configura Supabase per consultare le candidature.</h1></section>;
  }

  const { data, error } = await access.supabase
    .from("job_applications")
    .select("id,full_name,email,education,message,status,resume_path,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load job applications:", error.message);
  }

  const applications = [];
  if (!error && data) {
    for (const application of data) {
      const { data: signedUrl, error: signedUrlError } = await access.supabase.storage
        .from("resumes")
        .createSignedUrl(application.resume_path, 120);
      if (signedUrlError) {
        console.error("Unable to create a private CV link:", signedUrlError.message);
        applications.push({ ...application, resumeUrl: null });
      } else {
        applications.push({ ...application, resumeUrl: signedUrl.signedUrl });
      }
    }
  }

  return (
    <section className="section-wrap admin-page">
      <p className="eyebrow"><Link href="/area-riservata">Area riservata</Link> · Dati personali</p>
      <h1>Le <span className="serif-accent">candidature.</span></h1>
      <p className="admin-intro">Segui ogni candidatura dalla prima lettura alla decisione. I link ai CV scadono dopo due minuti.</p>
      <div className="workflow-guide" aria-label="Fasi della selezione">
        <span>Nuova</span><b>→</b><span>In valutazione</span><b>→</b><span>Colloquio</span><b>→</b><span>Selezionata o scartata</span>
      </div>
      {error && <p role="alert">Non è stato possibile caricare le candidature. Riprova più tardi.</p>}
      {!error && <AdminApplications initialApplications={applications} />}
    </section>
  );
}
