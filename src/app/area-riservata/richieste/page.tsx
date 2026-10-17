import type { Metadata } from "next";
import Link from "next/link";
import { AdminInquiries } from "@/components/admin-inquiries";
import { requireStaffRole } from "@/lib/staff-access";

export const metadata: Metadata = {
  title: "Richieste dei clienti",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const access = await requireStaffRole(["admin", "support"]);
  if (!access) {
    return <section className="section-wrap admin-page"><h1>Configura Supabase per consultare le richieste.</h1></section>;
  }

  const { data, error } = await access.supabase
    .from("contact_inquiries")
    .select("id,name,email,company,message,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load contact inquiries:", error.message);
  }

  return (
    <section className="section-wrap admin-page">
      <p className="eyebrow"><Link href="/area-riservata">Area riservata</Link> · Richieste clienti</p>
      <h1>Richieste <span className="serif-accent">clienti.</span></h1>
      <p className="admin-intro">
        {access.roles.includes("admin")
          ? "Tieni traccia dei messaggi, segna quelli a cui hai risposto e archivia il resto."
          : "Consulta i messaggi inviati dai clienti. Il ruolo Supporto consente la sola lettura."}
      </p>
      {error && <p role="alert">Non è stato possibile caricare i messaggi. Riprova più tardi.</p>}
      {!error && <AdminInquiries canUpdateStatus={access.roles.includes("admin")} initialInquiries={data ?? []} />}
    </section>
  );
}
