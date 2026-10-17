import type { Metadata } from "next";
import { ApplicationForm } from "@/components/application-form";
import { createSupabasePublicClient } from "@/lib/supabase-public";

export const metadata: Metadata = {
  title: "Lavora con noi",
  description:
    "Entra nel progetto FA IT: cerchiamo persone curiose, all’inizio del loro percorso e con voglia di imparare.",
};

export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const formsEnabled =
    process.env.PUBLIC_FORMS_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = createSupabasePublicClient();
  let jobs: { id: string; title: string; summary: string; location: string; employment_type: string }[] = [];
  let jobsError = false;

  if (supabase) {
    const { data, error } = await supabase
      .from("job_postings")
      .select("id,title,summary,location,employment_type")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Unable to load public job postings:", error.message);
      jobsError = true;
    } else {
      jobs = data ?? [];
    }
  }

  return (
    <div className="inner-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Persone · prima del curriculum</p>
        <h1>La voglia di<br /><span className="serif-accent">imparare conta.</span></h1>
        <p className="inner-lede">
          Vogliamo costruire un team in cui crescere facendo. Se sei neo-diplomato,
          neo-laureato o stai iniziando nel digitale, ci interessa conoscerti.
        </p>
      </section>
      <section className="section-wrap careers-note">
        <div className="careers-mark" aria-hidden="true">✳</div>
        <div>
          <p className="eyebrow">Una cosa importante, detta chiaramente</p>
          <h2>Un progetto in avvio.</h2>
          <p>
            FA IT è oggi un progetto early-stage e non è ancora una società costituita.
            Non stiamo promettendo assunzioni immediate: stiamo conoscendo persone interessate
            a collaborare e a crescere insieme, con modalità e condizioni da definire in modo
            trasparente quando il progetto sarà pronto.
          </p>
          <p>
            Le posizioni effettivamente aperte saranno pubblicate qui sotto. Una candidatura
            spontanea non costituisce una proposta di lavoro né una promessa di assunzione.
          </p>
        </div>
      </section>
      <section className="section-wrap open-roles">
        <p className="eyebrow">Posizioni aperte</p>
        <h2>Opportunità <span className="serif-accent">concrete.</span></h2>
        {jobsError && <p className="data-error" role="alert">Le posizioni non sono temporaneamente disponibili. Riprova più tardi.</p>}
        {!jobsError && jobs.length === 0 && <p>Non ci sono posizioni aperte al momento. Puoi inviare una candidatura spontanea qui sotto.</p>}
        {jobs.map((job) => (
          <article className="open-role" key={job.id}>
            <div><h3>{job.title}</h3><p>{job.summary}</p></div>
            <span>{job.location} · {job.employment_type}</span>
          </article>
        ))}
      </section>
      <section className="section-wrap form-section application-section">
        <div className="form-aside">
          <p className="eyebrow">Candidatura spontanea</p>
          <h2>Raccontaci<br /><em>chi sei.</em></h2>
          <p>
            Scegliamo la curiosità e la voglia di imparare. Non è necessario avere anni
            di esperienza per farsi avanti.
          </p>
        </div>
        <ApplicationForm enabled={formsEnabled} jobs={jobs} />
      </section>
    </div>
  );
}
