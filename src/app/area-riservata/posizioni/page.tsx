import type { Metadata } from "next";
import Link from "next/link";
import { AdminJobs } from "@/components/admin-jobs";
import { requireStaffRole } from "@/lib/staff-access";

export const metadata: Metadata = {
  title: "Gestione offerte di lavoro",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManageJobsPage() {
  const access = await requireStaffRole(["admin", "hr_manager"]);
  if (!access) {
    return <section className="section-wrap admin-page"><h1>Configura Supabase per gestire le offerte.</h1></section>;
  }

  return (
    <section className="section-wrap admin-page">
      <p className="eyebrow"><Link href="/area-riservata">Area riservata</Link> · Selezione</p>
      <h1>Gestione <span className="serif-accent">offerte.</span></h1>
      <p className="admin-intro">Le offerte pubblicate compariranno nella pagina “Lavora con noi”.</p>
      <AdminJobs />
    </section>
  );
}
