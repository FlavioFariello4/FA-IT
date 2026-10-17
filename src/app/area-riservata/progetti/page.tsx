import type { Metadata } from "next";
import Link from "next/link";
import { AdminProjects } from "@/components/admin-projects";
import { requireStaffRole } from "@/lib/staff-access";

export const metadata: Metadata = {
  title: "Gestione portfolio",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManageProjectsPage() {
  const access = await requireStaffRole(["admin", "portfolio_editor"]);
  if (!access) {
    return <section className="section-wrap admin-page"><h1>Configura Supabase per gestire il portfolio.</h1></section>;
  }

  return (
    <section className="section-wrap admin-page">
      <p className="eyebrow"><Link href="/area-riservata">Area riservata</Link> · Portfolio</p>
      <h1>Gestione <span className="serif-accent">progetti.</span></h1>
      <p className="admin-intro">Aggiungi un progetto. Puoi pubblicarlo subito o lasciarlo in bozza.</p>
      <AdminProjects />
    </section>
  );
}
