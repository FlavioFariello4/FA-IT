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

  async function refreshJobs() {
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
      setStatus("");
    }
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(refreshJobs);
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
    setStatus("Offerta salvata.");
    await refreshJobs();
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
    await refreshJobs();
  }

  async function deleteJob(id: string) {
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
    await refreshJobs();
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
        <h2>Offerte salvate</h2>
        {loading && <p>Caricamento…</p>}
        {!loading && jobs.length === 0 && <p>Nessuna offerta inserita.</p>}
        {jobs.map((job) => (
          <article className="admin-record" key={job.id}>
            <div><span>{job.location} · {job.published ? "Pubblicata" : "Bozza"}</span><h3>{job.title}</h3><p>{job.employment_type}</p></div>
            <div className="admin-record-actions">
              <button className="text-button" onClick={() => void updateJob(job, { published: !job.published })} type="button">
                {job.published ? "Nascondi" : "Pubblica"}
              </button>
              <button className="text-button" onClick={() => void deleteJob(job.id)} type="button">Elimina</button>
            </div>
          </article>
        ))}
      </div>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </div>
  );
}
