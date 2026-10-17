import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Studio e società trasparente",
  description:
    "Scopri chi è FA IT, il progetto indipendente e il percorso di crescita dello studio digitale.",
};

export default function StudioPage() {
  return (
    <div className="inner-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Lo studio · in costruzione, con intenzione</p>
        <h1>Un progetto<br />digitale, <span className="serif-accent">umano.</span></h1>
        <p className="inner-lede">
          FA IT nasce dalla voglia di costruire strumenti digitali utili,
          insieme alle persone che li useranno.
        </p>
      </section>
      <section className="studio-story">
        <div className="section-wrap studio-story-grid">
          <p className="eyebrow">Da dove partiamo</p>
          <div>
            <h2>Prima le persone.<br /><span className="serif-accent">Poi la tecnologia.</span></h2>
            <p>
              Siamo un progetto early-stage fondato da Flavio Fariello. Stiamo costruendo
              il team e definendo la struttura societaria: oggi FA IT è un progetto
              in fase di avvio, non una società costituita. Lo diremo con chiarezza anche
              quando evolverà.
            </p>
            <p>
              Ci interessa fare un buon lavoro, imparare in fretta e creare relazioni
              basate su aspettative chiare. Lavoriamo con cura, condividiamo le decisioni
              e teniamo il dialogo aperto durante tutto il percorso.
            </p>
          </div>
          <figure className="studio-image">
            <div className="studio-image-frame">
              <Image
                alt="Persone che collaborano a un progetto davanti ai propri portatili"
                fill
                sizes="(max-width: 720px) 100vw, (max-width: 950px) 45vw, 28vw"
                src="/images/team-collaboration.jpg"
              />
            </div>
            <figcaption>Le idee migliori crescono nel confronto.</figcaption>
          </figure>
        </div>
      </section>
      <section className="section-wrap values-grid">
        {[
          ["01", "Curiosità", "Imparare è parte del lavoro. Le domande giuste fanno nascere soluzioni migliori."],
          ["02", "Chiarezza", "Parliamo senza tecnicismi inutili: obiettivi, tempi e prossimi passi devono essere comprensibili."],
          ["03", "Responsabilità", "Progettiamo pensando a chi userà il prodotto, alla sua accessibilità e alla sua manutenzione."],
        ].map(([n, title, text]) => (
          <article className="value-card" key={n}>
            <span>{n}</span><h3>{title}</h3><p>{text}</p>
          </article>
        ))}
      </section>
      <section className="simple-cta section-wrap">
        <p className="eyebrow">Persone prima dei titoli</p>
        <h2>Hai voglia di<br /><span className="serif-accent">imparare facendo?</span></h2>
        <Link className="button button-dark" href="/lavora-con-noi">Scopri come collaborare ↗</Link>
      </section>
    </div>
  );
}
