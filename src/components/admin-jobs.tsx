"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Job = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  location: string;
  employment_type: string;
  published: boolean;
};

export function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refreshJobs(successMessage = "") {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase per gestire le offerte.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("job_postings")
      .select("id,title,slug,summary,location,employment_type,published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to load job postings:", error.message);
      setStatus("Non è stato possibile caricare le offerte.");
    } else {
      setJobs(data ?? []);
      setStatus(successMessage);
    }
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => refreshJobs());
  }, []);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di salvare le offerte.");
      return;
    }
    const formData = new FormData(form);
    const { error } = await supabase.from("job_postings").insert({
      title: String(formData.get("title") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim(),
      location: String(formData.get("location") ?? "").trim(),
      employment_type: String(formData.get("employmentType") ?? "").trim(),
      published: formData.get("published") === "on",
    });

    if (error) {
      console.error("Unable to create job posting:", error.message);
      setStatus("L’offerta non è stata salvata. Verifica i dati e i permessi.");
      return;
    }
    form.reset();
    await refreshJobs("Offerta salvata.");
  }

  async function updateJob(job: Job, changes: Partial<Pick<Job, "published">>) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di modificare le offerte.");
      return;
    }
    const { error } = await supabase.from("job_postings").update(changes).eq("id", job.id);
    if (error) {
      console.error("Unable to update job posting:", error.message);
      setStatus("Non è stato possibile aggiornare l’offerta.");
      return;
    }
    await refreshJobs("Stato di pubblicazione aggiornato.");
  }

  async function saveJob(event: FormEvent<HTMLFormElement>, job: Job) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di modificare le offerte.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const { error } = await supabase
      .from("job_postings")
      .update({
        title: String(formData.get("title") ?? "").trim(),
        slug: String(formData.get("slug") ?? "").trim(),
        summary: String(formData.get("summary") ?? "").trim(),
        location: String(formData.get("location") ?? "").trim(),
        employment_type: String(formData.get("employmentType") ?? "").trim(),
      })
      .eq("id", job.id);
    if (error) {
      console.error("Unable to edit job posting:", error.message);
      setStatus("Modifiche non salvate. Verifica i campi e che lo slug non sia già utilizzato.");
      return;
    }
    setEditingId(null);
    await refreshJobs("Offerta aggiornata.");
  }

  async function deleteJob(id: string) {
    const job = jobs.find((item) => item.id === id);
    if (!job || !window.confirm(`Eliminare definitivamente l’offerta “${job.title}”?`)) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di modificare le offerte.");
      return;
    }
    const { error } = await supabase.from("job_postings").delete().eq("id", id);
    if (error) {
      console.error("Unable to delete job posting:", error.message);
      setStatus("Non è stato possibile eliminare l’offerta.");
      return;
    }
    await refreshJobs("Offerta eliminata.");
  }

  return (
    <div className="admin-content">
      <form className="contact-form admin-form" onSubmit={createJob}>
        <h2>Nuova offerta</h2>
        <label>Titolo<input maxLength={140} name="title" required /></label>
        <label>Slug URL<input maxLength={140} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="junior-web-developer" required /></label>
        <label>Descrizione breve<textarea maxLength={500} minLength={10} name="summary" required rows={3} /></label>
        <div className="form-grid">
          <label>Sede<input maxLength={120} name="location" placeholder="Remoto / Italia" required /></label>
          <label>Tipo<input maxLength={100} name="employmentType" placeholder="Collaborazione / Stage…" required /></label>
        </div>
        <label className="consent-check"><input name="published" type="checkbox" /><span>Pubblica subito</span></label>
        <button className="button button-dark" type="submit">Salva offerta ↗</button>
      </form>
      <div className="admin-record-list">
        <h2>Offerte · {jobs.length}</h2>
        <p className="admin-list-help">Gestisci le posizioni: le offerte pubblicate sono visibili nella pagina Lavora con noi.</p>
        {loading && <p>Caricamento…</p>}
        {!loading && jobs.length === 0 && <p>Nessuna offerta inserita.</p>}
        {jobs.map((job) => (
          <article className="admin-record project-admin-record" key={job.id}>
            {editingId === job.id ? (
              <form className="project-edit-form" onSubmit={(event) => void saveJob(event, job)}>
                <label>Titolo<input defaultValue={job.title} maxLength={140} name="title" required /></label>
                <label>Slug URL<input defaultValue={job.slug} maxLength={140} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
                <label>Descrizione breve<textarea defaultValue={job.summary} maxLength={500} minLength={10} name="summary" required rows={3} /></label>
                <div className="form-grid">
                  <label>Sede<input defaultValue={job.location} maxLength={120} name="location" required /></label>
                  <label>Tipo<input defaultValue={job.employment_type} maxLength={100} name="employmentType" required /></label>
                </div>
                <div className="admin-record-actions">
                  <button className="button button-dark" type="submit">Salva modifiche</button>
                  <button className="text-button" onClick={() => setEditingId(null)} type="button">Annulla</button>
                </div>
              </form>
            ) : (
              <>
                <div className="workflow-card-main">
                  <span className={`workflow-badge${job.published ? " is-success" : ""}`}>
                    {job.published ? "Pubblicata" : "Bozza · non visibile"}
                  </span>
                  <h3>{job.title}</h3>
                  <p>{job.location} · {job.employment_type}</p>
                  <p>{job.summary}</p>
                </div>
                <div className="admin-record-actions project-actions">
                  <button className="text-button" onClick={() => setEditingId(job.id)} type="button">Modifica</button>
                  <button className="text-button" onClick={() => void updateJob(job, { published: !job.published })} type="button">
                    {job.published ? "Nascondi" : "Pubblica"}
                  </button>
                  <button className="text-button workflow-danger" onClick={() => void deleteJob(job.id)} type="button">Elimina</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </div>
  );
}
