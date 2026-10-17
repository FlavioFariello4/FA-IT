import type { Metadata } from "next";
import Link from "next/link";
import { AdminUsers } from "@/components/admin-users";
import { requireStaffRole } from "@/lib/staff-access";

export const metadata: Metadata = {
  title: "Gestione accessi e permessi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ManageUsersPage() {
  const access = await requireStaffRole(["admin"]);
  if (!access) {
    return <section className="section-wrap admin-page"><h1>Configura Supabase per gestire gli accessi.</h1></section>;
  }

  return (
    <section className="section-wrap admin-page">
      <p className="eyebrow"><Link href="/area-riservata">Area riservata</Link> · Solo amministratore</p>
      <h1>Persone e <span className="serif-accent">permessi.</span></h1>
      <p className="admin-intro">
        Gli inviti richiedono l’email di Supabase configurata. Le autorizzazioni vengono verificate anche dal database.
      </p>
      <AdminUsers />
    </section>
  );
}
