import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Servizi digitali",
  description:
    "Siti web, e-commerce, applicazioni web, desktop e mobile: scopri i servizi digitali di FA IT.",
};

const services = [
  {
    n: "01",
    title: "Siti web",
    text: "Siti vetrina e landing page veloci, responsive e facili da aggiornare. Architettura dei contenuti, design e sviluppo pensati per i tuoi obiettivi.",
    tags: ["Siti vetrina", "Landing page", "SEO tecnico"],
  },
  {
    n: "02",
    title: "E-commerce",
    text: "Negozi online con catalogo, pagamenti e un pannello semplice per inserire prodotti e gestire il lavoro quotidiano.",
    tags: ["Catalogo prodotti", "Pagamenti", "Back office"],
  },
  {
    n: "03",
    title: "Web application",
    text: "Strumenti cloud per automatizzare processi, collaborare e lavorare con i dati in modo più efficace.",
    tags: ["Dashboard", "Portali", "Automazioni"],
  },
  {
    n: "04",
    title: "App desktop e mobile",
    text: "Applicazioni per iOS, Android, Windows e macOS: scegliamo la tecnologia in base a come le persone useranno il prodotto.",
    tags: ["iOS e Android", "Windows e macOS", "Prototipi"],
  },
  {
    n: "05",
    title: "Cura e crescita",
    text: "Dopo la pubblicazione possiamo affiancarti con manutenzione, accessibilità, performance e nuove funzionalità.",
    tags: ["Manutenzione", "Accessibilità", "Performance"],
  },
];

export default function ServicesPage() {
  return (
    <div className="inner-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Servizi · digitale su misura</p>
        <h1>Facciamo spazio<br />alle <span className="serif-accent">idee buone.</span></h1>
        <p className="inner-lede">
          Ogni progetto parte da una domanda diversa. Ascoltiamo, mettiamo a fuoco
          le priorità e scegliamo insieme il modo più semplice per arrivare al risultato.
        </p>
      </section>
      <section className="section-wrap service-detail-list">
        {services.map((service) => (
          <article className="service-detail" key={service.n}>
            <span className="service-number">{service.n}</span>
            <div>
              <h2>{service.title}</h2>
              <p>{service.text}</p>
              <div className="tag-list">
                {service.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <span aria-hidden="true" className="detail-mark">↗</span>
          </article>
        ))}
      </section>
      <section className="simple-cta section-wrap">
        <p className="eyebrow">Non sai da dove iniziare?</p>
        <h2>Va benissimo.<br /><span className="serif-accent">Iniziamo parlando.</span></h2>
        <Link className="button button-dark" href="/contatti">Raccontaci la tua idea ↗</Link>
      </section>
    </div>
  );
}
