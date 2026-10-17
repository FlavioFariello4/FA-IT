import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffRole } from "@/lib/staff-access";

export const metadata: Metadata = {
  title: "Richieste dei clienti",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const access = await requireStaffRole(["admin"]);
  if (!access) {
    return <section className="section-wrap admin-page"><h1>Configura Supabase per consultare le richieste.</h1></section>;
  }

  const { data, error } = await access.supabase
    .from("contact_inquiries")
    .select("id,name,email,company,message,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load contact inquiries:", error.message);
  }

  return (
    <section className="section-wrap admin-page">
      <p className="eyebrow"><Link href="/area-riservata">Area riservata</Link> · Richieste clienti</p>
      <h1>Messaggi <span className="serif-accent">ricevuti.</span></h1>
      {error && <p role="alert">Non è stato possibile caricare i messaggi. Riprova più tardi.</p>}
      {!error && data?.length === 0 && <p>Nessun messaggio ricevuto.</p>}
      <div className="admin-record-list">
        {(data ?? []).map((inquiry) => (
          <article className="admin-record admin-sensitive-record" key={inquiry.id}>
            <div>
              <span>{new Date(inquiry.created_at).toLocaleDateString("it-IT")}{inquiry.company ? ` · ${inquiry.company}` : ""}</span>
              <h2>{inquiry.name}</h2>
              <p><a href={`mailto:${inquiry.email}`}>{inquiry.email}</a></p>
              <p>{inquiry.message}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
