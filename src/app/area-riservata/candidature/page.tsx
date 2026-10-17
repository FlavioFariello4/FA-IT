import type { Metadata } from "next";
import Link from "next/link";
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
    .select("id,full_name,email,education,message,resume_path,created_at")
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
      <p className="admin-intro">Accesso limitato al team HR. I link ai CV scadono dopo due minuti.</p>
      {error && <p role="alert">Non è stato possibile caricare le candidature. Riprova più tardi.</p>}
      {!error && applications.length === 0 && <p>Nessuna candidatura ricevuta.</p>}
      <div className="admin-record-list">
        {applications.map((application) => (
          <article className="admin-record admin-sensitive-record" key={application.id}>
            <div>
              <span>{new Date(application.created_at).toLocaleDateString("it-IT")}</span>
              <h2>{application.full_name}</h2>
              <p><a href={`mailto:${application.email}`}>{application.email}</a> · {application.education}</p>
              {application.message && <p>{application.message}</p>}
            </div>
            {application.resumeUrl ? (
              <a className="text-link" href={application.resumeUrl} rel="noreferrer" target="_blank">Apri CV ↗</a>
            ) : (
              <span>CV non disponibile</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
