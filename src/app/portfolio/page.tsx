import type { Metadata } from "next";
import Link from "next/link";
import { createSupabasePublicClient } from "@/lib/supabase-public";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Progetti digitali firmati FA IT: lavori, processi e soluzioni costruite insieme ai clienti.",
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const supabase = createSupabasePublicClient();
  let projects: {
    id: string;
    title: string;
    category: string;
    description: string;
    project_url: string;
  }[] = [];
  let loadError = false;

  if (supabase) {
    const { data, error } = await supabase
      .from("portfolio_projects")
      .select("id,title,category,description,project_url")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Unable to load public portfolio projects:", error.message);
      loadError = true;
    } else {
      projects = data ?? [];
    }
  }

  return (
    <div className="inner-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Portfolio · lavori fatti con cura</p>
        <h1>Ogni progetto<br />ha una <span className="serif-accent">storia.</span></h1>
        <p className="inner-lede">
          Qui racconteremo le sfide, le scelte e i risultati dei progetti realizzati
          insieme alle persone che ci hanno dato fiducia.
        </p>
      </section>
      {projects.length > 0 && (
        <section className="section-wrap live-project-grid" aria-label="Progetti pubblicati">
          {projects.map((project, index) => (
            <article className="live-project-card" key={project.id}>
              <a className={`project-art project-art-${index % 4}`} href={project.project_url} rel="noreferrer" target="_blank">
                <span>{project.category}</span><strong>{project.title}</strong><b aria-hidden="true">↗</b>
              </a>
              <p>{project.description}</p>
              <a className="text-link" href={project.project_url} rel="noreferrer" target="_blank">
                Visita il progetto <span>↗</span>
              </a>
            </article>
          ))}
        </section>
      )}
      {loadError && (
        <p className="section-wrap data-error" role="alert">
          Il portfolio non è temporaneamente disponibile. Riprova più tardi.
        </p>
      )}
      {!loadError && projects.length === 0 && <section className="section-wrap portfolio-empty">
        <span aria-hidden="true">✳</span>
        <p className="eyebrow">La prima storia è in arrivo</p>
        <h2>Stiamo preparando<br />qualcosa di <em>nostro.</em></h2>
        <p>
          Preferiamo mostrarti lavori veri, non esempi inventati. Torna a trovarci
          presto oppure raccontaci cosa vorresti costruire.
        </p>
        <Link className="button button-dark" href="/contatti">Parliamo del tuo progetto ↗</Link>
      </section>}
    </div>
  );
}
