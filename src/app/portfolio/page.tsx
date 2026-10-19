import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
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
    images: { id: string; alt_text: string; signedUrl: string }[];
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
      const projectRows = data ?? [];
      const { data: imageRows, error: imagesError } = projectRows.length > 0
        ? await supabase
          .from("portfolio_project_images")
          .select("id,project_id,object_path,alt_text,display_order")
          .in("project_id", projectRows.map((project) => project.id))
          .order("display_order", { ascending: true })
        : { data: [], error: null };
      if (imagesError) {
        console.error("Unable to load public portfolio project images:", imagesError.message);
        loadError = true;
        projects = projectRows.map((project) => ({ ...project, images: [] }));
      } else {
        const imageList = imageRows ?? [];
        const adminClient = imageList.length > 0 ? createSupabaseAdminClient() : null;
        let signedUrlByPath = new Map<string, string>();
        if (imageList.length > 0 && !adminClient) {
          console.error("Portfolio image previews require the server-side Supabase service role.");
          loadError = true;
        } else if (adminClient) {
          const { data: signedImages, error: signingError } = await adminClient.storage
            .from("portfolio-project-images")
            .createSignedUrls(imageList.map((image) => image.object_path), 3600);
          if (signingError) {
            console.error("Unable to sign public portfolio project images:", signingError.message);
            loadError = true;
          } else {
            signedUrlByPath = new Map(
              (signedImages ?? []).flatMap((image) => image.path && image.signedUrl
                ? [[image.path, image.signedUrl] as const]
                : []),
            );
          }
        }
        const imagesByProject = new Map<string, { id: string; alt_text: string; signedUrl: string }[]>();
        for (const image of imageList) {
          const signedUrl = signedUrlByPath.get(image.object_path);
          if (!signedUrl) {
            continue;
          }
          const images = imagesByProject.get(image.project_id) ?? [];
          images.push({
            id: image.id,
            alt_text: image.alt_text,
            signedUrl,
          });
          imagesByProject.set(image.project_id, images);
        }
        projects = projectRows.map((project) => ({
          ...project,
          images: imagesByProject.get(project.id) ?? [],
        }));
      }
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
              <a
                className={`project-art project-art-${index % 4}${project.images.length > 0 ? " has-project-image" : ""}`}
                href={project.project_url}
                rel="noreferrer"
                target="_blank"
              >
                {project.images[0] && (
                  <Image
                    alt={project.images[0].alt_text || project.title}
                    className="project-art-image"
                    height={700}
                    src={project.images[0].signedUrl}
                    unoptimized
                    width={1000}
                  />
                )}
                <span>{project.category}</span><strong>{project.title}</strong><b aria-hidden="true">↗</b>
              </a>
              {project.images.length > 1 && (
                <div className="project-gallery" aria-label={`Altre foto di ${project.title}`}>
                  {project.images.slice(1).map((image, imageIndex) => (
                    <Image
                      alt={image.alt_text || `${project.title}, foto ${imageIndex + 2}`}
                      className="project-gallery-image"
                      height={240}
                      key={image.id}
                      src={image.signedUrl}
                      unoptimized
                      width={360}
                    />
                  ))}
                </div>
              )}
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
