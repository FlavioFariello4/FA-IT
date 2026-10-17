"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Project = {
  id: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  project_url: string;
  published: boolean;
};

export function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function refreshProjects() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase per gestire i progetti.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("portfolio_projects")
      .select("id,title,slug,category,description,project_url,published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to load portfolio projects:", error.message);
      setStatus("Non è stato possibile caricare i progetti.");
    } else {
      setProjects(data ?? []);
      setStatus("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(refreshProjects);
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di salvare i progetti.");
      return;
    }

    const formData = new FormData(form);
    const { error } = await supabase.from("portfolio_projects").insert({
      title: String(formData.get("title") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      project_url: String(formData.get("projectUrl") ?? "").trim(),
      published: formData.get("published") === "on",
    });

    if (error) {
      console.error("Unable to create portfolio project:", error.message);
      setStatus("Il progetto non è stato salvato. Verifica i dati e i permessi.");
      return;
    }
    form.reset();
    setStatus("Progetto salvato.");
    await refreshProjects();
  }

  async function setPublished(project: Project) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di modificare i progetti.");
      return;
    }

    const { error } = await supabase
      .from("portfolio_projects")
      .update({ published: !project.published })
      .eq("id", project.id);

    if (error) {
      console.error("Unable to update portfolio project:", error.message);
      setStatus("Non è stato possibile aggiornare la pubblicazione.");
      return;
    }
    await refreshProjects();
  }

  async function deleteProject(id: string) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di modificare i progetti.");
      return;
    }

    const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
    if (error) {
      console.error("Unable to delete portfolio project:", error.message);
      setStatus("Non è stato possibile eliminare il progetto.");
      return;
    }
    await refreshProjects();
  }

  return (
    <div className="admin-content">
      <form className="contact-form admin-form" onSubmit={createProject}>
        <h2>Nuovo progetto</h2>
        <label>Titolo<input maxLength={140} name="title" required /></label>
        <label>Slug URL<input maxLength={140} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="nome-progetto" required /></label>
        <label>Categoria<input maxLength={80} name="category" placeholder="E-commerce, web app…" required /></label>
        <label>Descrizione<textarea maxLength={3000} minLength={10} name="description" required rows={4} /></label>
        <label>Link al progetto (HTTPS)<input name="projectUrl" pattern="https://.+" required type="url" /></label>
        <label className="consent-check"><input name="published" type="checkbox" /><span>Pubblica subito</span></label>
        <button className="button button-dark" type="submit">Salva progetto ↗</button>
      </form>
      <div className="admin-record-list">
        <h2>Progetti salvati</h2>
        {loading && <p>Caricamento…</p>}
        {!loading && projects.length === 0 && <p>Nessun progetto inserito.</p>}
        {projects.map((project) => (
          <article className="admin-record" key={project.id}>
            <div><span>{project.category} · {project.published ? "Pubblicato" : "Bozza"}</span><h3>{project.title}</h3><p>{project.slug}</p></div>
            <div className="admin-record-actions">
              <button className="text-button" onClick={() => void setPublished(project)} type="button">
                {project.published ? "Nascondi" : "Pubblica"}
              </button>
              <button className="text-button" onClick={() => void deleteProject(project.id)} type="button">Elimina</button>
            </div>
          </article>
        ))}
      </div>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </div>
  );
}
