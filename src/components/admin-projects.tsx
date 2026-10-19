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
  images: ProjectImage[];
};

type ProjectImage = {
  id: string;
  object_path: string;
  alt_text: string;
  display_order: number;
  signedUrl: string | null;
};

const imageBucket = "portfolio-project-images";
const maxImagesPerProject = 12;
const maxImageBytes = 10 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function imageValidationError(files: File[], currentCount: number) {
  if (currentCount + files.length > maxImagesPerProject) {
    return `puoi caricare al massimo ${maxImagesPerProject} foto per progetto.`;
  }
  const invalidFile = files.find((file) =>
    !allowedImageTypes.has(file.type) || file.size > maxImageBytes,
  );
  return invalidFile
    ? `“${invalidFile.name}” non è supportato. Usa JPG, PNG, WebP o AVIF fino a 10 MB.`
    : null;
}

export function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refreshProjects(successMessage = "") {
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
      setLoading(false);
      return;
    }

    const projectRows = data ?? [];
    const { data: imageRows, error: imageError } = projectRows.length > 0
      ? await supabase
        .from("portfolio_project_images")
        .select("id,project_id,object_path,alt_text,display_order")
        .in("project_id", projectRows.map((project) => project.id))
        .order("display_order", { ascending: true })
      : { data: [], error: null };
    if (imageError) {
      console.error("Unable to load portfolio project images:", imageError.message);
      setStatus("Progetti caricati, ma non è stato possibile leggere le foto. Verifica di aver applicato la migration per le immagini portfolio.");
      setProjects(projectRows.map((project) => ({ ...project, images: [] })));
      setLoading(false);
      return;
    }

    const imagePaths = (imageRows ?? []).map((image) => image.object_path);
    const { data: signedImages, error: signedImagesError } = imagePaths.length > 0
      ? await supabase.storage.from(imageBucket).createSignedUrls(imagePaths, 3600)
      : { data: [], error: null };
    if (signedImagesError) {
      console.error("Unable to create preview URLs for portfolio images:", signedImagesError.message);
    }
    const signedUrlByPath = new Map(
      (signedImages ?? []).flatMap((image) => image.path && image.signedUrl
        ? [[image.path, image.signedUrl] as const]
        : []),
    );
    const imagesByProject = new Map<string, ProjectImage[]>();
    for (const image of imageRows ?? []) {
      const items = imagesByProject.get(image.project_id) ?? [];
      items.push({
        id: image.id,
        object_path: image.object_path,
        alt_text: image.alt_text,
        display_order: image.display_order,
        signedUrl: signedUrlByPath.get(image.object_path) ?? null,
      });
      imagesByProject.set(image.project_id, items);
    }
    setProjects(projectRows.map((project) => ({
      ...project,
      images: imagesByProject.get(project.id) ?? [],
    })));
    setStatus(signedImagesError
      ? "Progetti caricati, ma non è stato possibile generare l’anteprima delle foto."
      : successMessage);
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(() => refreshProjects());
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
    const selectedImages = formData.getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);
    const validationError = imageValidationError(selectedImages, 0);
    if (validationError) {
      setStatus(validationError);
      return;
    }
    const { data: project, error } = await supabase.from("portfolio_projects").insert({
      title: String(formData.get("title") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      project_url: String(formData.get("projectUrl") ?? "").trim(),
      published: formData.get("published") === "on",
    }).select("id,title").single();

    if (error || !project) {
      console.error("Unable to create portfolio project:", error?.message ?? "Missing inserted project.");
      setStatus("Il progetto non è stato salvato. Verifica i dati e i permessi.");
      return;
    }
    const imageError = await uploadProjectImages(
      supabase,
      project.id,
      project.title,
      selectedImages,
      0,
    );
    form.reset();
    await refreshProjects(imageError
      ? `Progetto salvato, ma ${imageError}`
      : "Progetto salvato.");
  }

  async function updateProject(event: FormEvent<HTMLFormElement>, project: Project) {
    event.preventDefault();
    const form = event.currentTarget;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di modificare i progetti.");
      return;
    }
    const formData = new FormData(form);
    const selectedImages = formData.getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);
    const validationError = imageValidationError(selectedImages, project.images.length);
    if (validationError) {
      setStatus(validationError);
      return;
    }
    const { error } = await supabase
      .from("portfolio_projects")
      .update({
        title: String(formData.get("title") ?? "").trim(),
        slug: String(formData.get("slug") ?? "").trim(),
        category: String(formData.get("category") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        project_url: String(formData.get("projectUrl") ?? "").trim(),
      })
      .eq("id", project.id);
    if (error) {
      console.error("Unable to update portfolio project:", error.message);
      setStatus("Modifiche non salvate. Verifica i campi e che lo slug non sia già utilizzato.");
      return;
    }
    const imageError = await uploadProjectImages(
      supabase,
      project.id,
      String(formData.get("title") ?? "").trim(),
      selectedImages,
      project.images.length,
    );
    setEditingId(null);
    await refreshProjects(imageError
      ? `Dettagli aggiornati, ma ${imageError}`
      : "Progetto aggiornato.");
  }

  async function uploadProjectImages(
    supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
    projectId: string,
    projectTitle: string,
    files: File[],
    currentCount: number,
  ) {
    if (files.length === 0) {
      return null;
    }
    const validationError = imageValidationError(files, currentCount);
    if (validationError) {
      return validationError;
    }

    const uploadedImages: { object_path: string; alt_text: string; display_order: number }[] = [];
    for (const [index, file] of files.entries()) {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const objectPath = `${projectId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(imageBucket).upload(objectPath, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) {
        console.error("Unable to upload portfolio project image:", error.message);
        if (uploadedImages.length > 0) {
          const { error: cleanupError } = await supabase.storage
            .from(imageBucket)
            .remove(uploadedImages.map((image) => image.object_path));
          if (cleanupError) {
            console.error("Unable to clean up partially uploaded portfolio images:", cleanupError.message);
          }
        }
        return `la foto “${file.name}” non è stata caricata. Verifica la migration e i permessi Storage.`;
      }
      uploadedImages.push({
        object_path: objectPath,
        alt_text: projectTitle,
        display_order: currentCount + index,
      });
    }

    const { error: rowError } = await supabase
      .from("portfolio_project_images")
      .insert(uploadedImages.map((image) => ({ ...image, project_id: projectId })));
    if (rowError) {
      console.error("Unable to save portfolio project image metadata:", rowError.message);
      const { error: cleanupError } = await supabase.storage
        .from(imageBucket)
        .remove(uploadedImages.map((image) => image.object_path));
      if (cleanupError) {
        console.error("Unable to clean up portfolio images after metadata failure:", cleanupError.message);
      }
      return "i file foto sono stati caricati, ma i relativi dati non sono stati salvati.";
    }
    return null;
  }

  async function deleteProjectImage(project: Project, image: ProjectImage) {
    if (!window.confirm(`Rimuovere questa foto da “${project.title}”?`)) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di rimuovere le foto.");
      return;
    }
    const { error: rowError } = await supabase
      .from("portfolio_project_images")
      .delete()
      .eq("id", image.id);
    if (rowError) {
      console.error("Unable to remove portfolio project image record:", rowError.message);
      setStatus("Non è stato possibile rimuovere la foto. Verifica i permessi e riprova.");
      return;
    }
    const { error: storageError } = await supabase.storage.from(imageBucket).remove([image.object_path]);
    if (storageError) {
      console.error("Image removed from portfolio but storage cleanup failed:", storageError.message);
      setStatus("La foto è stata rimossa dal progetto, ma il file non è stato eliminato dallo Storage.");
      await refreshProjects();
      return;
    }
    await refreshProjects("Foto rimossa.");
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
    await refreshProjects(project.published ? "Progetto nascosto dal sito." : "Progetto pubblicato sul sito.");
  }

  async function deleteProject(id: string) {
    const project = projects.find((item) => item.id === id);
    if (!project || !window.confirm(`Eliminare definitivamente il progetto “${project.title}”?`)) {
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("Configura Supabase prima di modificare i progetti.");
      return;
    }

    const { data: images, error: imagesError } = await supabase
      .from("portfolio_project_images")
      .select("object_path")
      .eq("project_id", id);
    if (imagesError) {
      console.error("Unable to load project images before deleting the project:", imagesError.message);
      setStatus("Non è stato possibile preparare l’eliminazione del progetto.");
      return;
    }
    const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
    if (error) {
      console.error("Unable to delete portfolio project:", error.message);
      setStatus("Non è stato possibile eliminare il progetto.");
      return;
    }
    const imagePaths = (images ?? []).map((image) => image.object_path);
    const { error: storageError } = imagePaths.length > 0
      ? await supabase.storage.from(imageBucket).remove(imagePaths)
      : { error: null };
    if (storageError) {
      console.error("Project deleted but its image files could not be removed:", storageError.message);
      await refreshProjects("Progetto eliminato, ma alcuni file foto sono rimasti nello Storage.");
      return;
    }
    await refreshProjects("Progetto eliminato.");
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
        <label>
          Foto progetto (fino a {maxImagesPerProject}, JPG/PNG/WebP/AVIF, massimo 10 MB ciascuna)
          <input accept="image/jpeg,image/png,image/webp,image/avif" multiple name="images" type="file" />
        </label>
        <label className="consent-check"><input name="published" type="checkbox" /><span>Pubblica subito</span></label>
        <button className="button button-dark" type="submit">Salva progetto ↗</button>
      </form>
      <div className="admin-record-list">
        <h2>Portfolio · {projects.length}</h2>
        <p className="admin-list-help">Modifica i dettagli, pubblica il progetto o lascialo come bozza.</p>
        {loading && <p>Caricamento…</p>}
        {!loading && projects.length === 0 && <p>Nessun progetto inserito.</p>}
        {projects.map((project) => (
          <article className="admin-record project-admin-record" key={project.id}>
            {editingId === project.id ? (
              <form className="project-edit-form" onSubmit={(event) => void updateProject(event, project)}>
                <label>Titolo<input defaultValue={project.title} maxLength={140} name="title" required /></label>
                <label>Slug URL<input defaultValue={project.slug} maxLength={140} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" required /></label>
                <label>Categoria<input defaultValue={project.category} maxLength={80} name="category" required /></label>
                <label>Descrizione<textarea defaultValue={project.description} maxLength={3000} minLength={10} name="description" required rows={4} /></label>
                <label>Link al progetto<input defaultValue={project.project_url} name="projectUrl" pattern="https://.+" required type="url" /></label>
                {project.images.length > 0 && (
                  <fieldset className="project-image-editor">
                    <legend>Foto caricate · {project.images.length}/{maxImagesPerProject}</legend>
                    <div className="project-image-editor-grid">
                      {project.images.map((image) => (
                        <div className="project-image-editor-item" key={image.id}>
                          {image.signedUrl && <img alt={image.alt_text || project.title} src={image.signedUrl} />}
                          <button
                            className="text-button workflow-danger"
                            onClick={() => void deleteProjectImage(project, image)}
                            type="button"
                          >
                            Rimuovi foto
                          </button>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}
                <label>
                  Aggiungi altre foto
                  <input accept="image/jpeg,image/png,image/webp,image/avif" multiple name="images" type="file" />
                </label>
                <div className="admin-record-actions">
                  <button className="button button-dark" type="submit">Salva modifiche</button>
                  <button className="text-button" onClick={() => setEditingId(null)} type="button">Annulla</button>
                </div>
              </form>
            ) : (
              <>
                <div className="workflow-card-main">
                  <span className={`workflow-badge${project.published ? " is-success" : ""}`}>
                    {project.published ? "Visibile sul sito" : "Bozza · non visibile"}
                  </span>
                  <h3>{project.title}</h3>
                  <p>{project.category} · /{project.slug}</p>
                  <p>{project.description}</p>
                  <p>{project.images.length} {project.images.length === 1 ? "foto" : "foto"}</p>
                </div>
                <div className="admin-record-actions project-actions">
                  <button className="text-button" onClick={() => setEditingId(project.id)} type="button">Modifica</button>
                  <button className="text-button" onClick={() => void setPublished(project)} type="button">
                    {project.published ? "Nascondi" : "Pubblica"}
                  </button>
                  <button className="text-button workflow-danger" onClick={() => void deleteProject(project.id)} type="button">Elimina</button>
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
