import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Area riservata",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="inner-page">
        <section className="inner-hero section-wrap">
          <p className="eyebrow">Area riservata · configurazione necessaria</p>
          <h1>Un passo<br /><span className="serif-accent">prima del lancio.</span></h1>
          <p className="inner-lede">
            Configura Supabase e applica la migrazione del database per attivare accessi,
            ruoli e contenuti protetti.
          </p>
        </section>
      </div>
    );
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Unable to verify admin session:", userError.message);
    redirect("/accesso");
  }
  if (!user) {
    redirect("/accesso");
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (roleError) {
    console.error("Unable to load staff permissions:", roleError.message);
    return (
      <section className="section-wrap admin-page">
        <p className="eyebrow">Area riservata</p>
        <h1>Permessi non disponibili</h1>
        <p>Non è stato possibile verificare i tuoi permessi. Riprova o contatta l’amministratore.</p>
        <SignOutButton />
      </section>
    );
  }

  const roles = new Set((roleRows ?? []).map((row) => row.role));
  if (roles.size === 0) {
    return (
      <section className="section-wrap admin-page">
        <p className="eyebrow">Area riservata · account senza ruolo</p>
        <h1>Accesso non autorizzato.</h1>
        <p>Il tuo account è valido, ma non ha ancora un ruolo assegnato. Chiedi all’amministratore.</p>
        <SignOutButton />
      </section>
    );
  }

  const canManagePortfolio = roles.has("admin") || roles.has("portfolio_editor");
  const canManageHr = roles.has("admin") || roles.has("hr_manager");
  const isAdmin = roles.has("admin");

  return (
    <section className="section-wrap admin-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">Dashboard · FA IT</p>
          <h1>Ciao, <span className="serif-accent">{user.email?.split("@")[0] ?? "team"}.</span></h1>
          <p className="inner-lede">Cosa vuoi gestire oggi?</p>
        </div>
        <SignOutButton />
      </div>
      <div aria-label="Aree di gestione" className="admin-card-grid">
        {canManagePortfolio && (
          <Link className="admin-card" href="/area-riservata/progetti">
            <span className="admin-card-icon" aria-hidden="true">01</span>
            <div className="admin-card-copy"><span>PORTFOLIO</span><h2>Progetti</h2><p>Pubblica e modifica i tuoi lavori.</p></div>
            <b aria-hidden="true">↗</b>
          </Link>
        )}
        {canManageHr && (
          <>
            <Link className="admin-card" href="/area-riservata/posizioni">
              <span className="admin-card-icon" aria-hidden="true">02</span>
              <div className="admin-card-copy"><span>TEAM</span><h2>Offerte</h2><p>Annunci e posizioni aperte.</p></div>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link className="admin-card" href="/area-riservata/candidature">
              <span className="admin-card-icon" aria-hidden="true">03</span>
              <div className="admin-card-copy"><span>TEAM</span><h2>Candidature</h2><p>Valuta CV e aggiorna le fasi.</p></div>
              <b aria-hidden="true">↗</b>
            </Link>
          </>
        )}
        {isAdmin && (
          <>
            <Link className="admin-card" href="/area-riservata/richieste">
              <span className="admin-card-icon" aria-hidden="true">04</span>
              <div className="admin-card-copy"><span>CLIENTI</span><h2>Richieste</h2><p>Messaggi e follow-up.</p></div>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link className="admin-card" href="/area-riservata/utenti">
              <span className="admin-card-icon" aria-hidden="true">05</span>
              <div className="admin-card-copy"><span>IMPOSTAZIONI</span><h2>Team e accessi</h2><p>Inviti e permessi.</p></div>
              <b aria-hidden="true">↗</b>
            </Link>
          </>
        )}
      </div>
      <div className="admin-role-note"><span>Il tuo accesso</span>{Array.from(roles).map((role) => <b key={role}>{role.replace("_", " ")}</b>)}</div>
    </section>
  );
}
