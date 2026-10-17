import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contatti",
  description:
    "Hai un progetto digitale in mente? Contatta FA IT e raccontaci cosa vorresti realizzare.",
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const formsEnabled =
    process.env.PUBLIC_FORMS_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="inner-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Contatti · siamo tutt’orecchi</p>
        <h1>La tua idea<br /><span className="serif-accent">parte da qui.</span></h1>
        <p className="inner-lede">
          Una domanda, un progetto o semplicemente un’intuizione? Scrivici qualche riga.
          Ti risponderemo per capire insieme se possiamo aiutarti.
        </p>
      </section>
      <section className="section-wrap form-section">
        <div className="form-aside">
          <p className="eyebrow">Una conversazione, non un preventivo automatico</p>
          <h2>Parliamone<br /><em>con calma.</em></h2>
          <p>
            Più contesto ci dai, meglio possiamo orientare la risposta. Non serve avere
            già tutto chiaro.
          </p>
          <p className="form-note">Risponderemo all’indirizzo email che ci indicherai.</p>
        </div>
        <ContactForm enabled={formsEnabled} />
      </section>
    </div>
  );
}
