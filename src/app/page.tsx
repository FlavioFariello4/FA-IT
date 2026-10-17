import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const services = [
  {
    number: "01",
    title: "Siti web",
    description: "Esperienze chiare e veloci, pensate per raccontare bene chi sei.",
  },
  {
    number: "02",
    title: "E-commerce",
    description: "Negozi online con un back office pratico per gestire prodotti e ordini.",
  },
  {
    number: "03",
    title: "Applicazioni",
    description: "Web app in cloud, software desktop e app mobile su misura.",
  },
  {
    number: "04",
    title: "Crescita digitale",
    description: "Manutenzione, accessibilità e ottimizzazione per far evolvere il progetto.",
  },
];

export default function Home() {
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: "it-IT",
    description:
      "Progettiamo e sviluppiamo siti web, e-commerce e applicazioni digitali su misura.",
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
        type="application/ld+json"
      />
      <section className="hero section-wrap">
        <div className="hero-topline">
          <span>Studio digitale indipendente</span>
          <span className="availability"><i /> Nuove collaborazioni aperte</span>
        </div>
        <h1 data-reveal>
          Idee chiare.
          <br />
          <span className="hero-highlight">Digitale, fatto bene.</span>
        </h1>
        <div className="hero-bottom">
          <p>
            Progettiamo esperienze digitali semplici, utili e belle da usare.
            Dalla prima idea al prodotto pronto a crescere.
          </p>
          <Link className="round-link" href="/contatti">
            <span>Raccontaci il tuo progetto</span>
            <span className="round-link-icon" aria-hidden="true">↗</span>
          </Link>
        </div>
        <div aria-hidden="true" className="hero-art">
          <div className="hero-art-grid" />
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-stamp">
            <span>FARE</span>
            <span>BENE</span>
            <span className="stamp-star">✳</span>
          </div>
          <span className="hero-art-caption">IDEA → PROGETTO → REALTÀ</span>
        </div>
      </section>

      <section className="intro-band">
        <div className="section-wrap intro-inner">
          <p className="eyebrow">Piccoli team. Grandi idee.</p>
          <h2 data-reveal>
            Tecnologia accessibile,
            <br />
            <span className="serif-accent">relazioni che contano.</span>
          </h2>
          <p className="intro-copy">
            FA IT è un progetto indipendente in costruzione. Ci piace ascoltare,
            capire il problema e trasformarlo in soluzioni digitali su misura — senza
            complicare le cose.
          </p>
          <Link className="text-link" href="/studio">Conosci lo studio <span>↗</span></Link>
        </div>
      </section>

      <section className="section-wrap services-preview">
        <div className="section-heading" data-reveal>
          <div>
            <p className="eyebrow">Cosa possiamo fare insieme</p>
            <h2>Dal primo <span className="serif-accent">schizzo</span><br />al prossimo passo.</h2>
          </div>
          <Link className="text-link" href="/servizi">Scopri i servizi <span>↗</span></Link>
        </div>
        <div className="service-list">
          {services.map((service) => (
            <Link className="service-row" href="/servizi" key={service.number}>
              <span className="service-number">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <span aria-hidden="true" className="service-arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="portfolio-band">
        <div className="section-wrap portfolio-preview">
          <div className="portfolio-preview-copy">
            <p className="eyebrow">Lavori in corso</p>
            <h2>Le idee migliori<br />meritano <span className="serif-accent">di uscire.</span></h2>
            <p>
              Stiamo preparando il nostro spazio per i progetti che realizzeremo insieme.
              Qui troverai processi, scelte e risultati, non solo belle schermate.
            </p>
            <Link className="text-link" href="/portfolio">Entra nel portfolio <span>↗</span></Link>
          </div>
          <div aria-label="Anteprima grafica del portfolio" className="portfolio-art" role="img">
            <div className="portfolio-art-card card-back"><span>STORIE DIGITALI</span><i>✳</i></div>
            <div className="portfolio-art-card card-front">
              <span className="mini-window"><i /><i /><i /></span>
              <strong>Progetti<br />con una<br /><em>direzione.</em></strong>
              <small>FA IT / concept</small>
            </div>
          </div>
        </div>
      </section>

      <section className="section-wrap join-band">
        <div className="join-shape" aria-hidden="true">✳</div>
        <div>
          <p className="eyebrow">Crescere insieme</p>
          <h2>All’inizio di una<br /><span className="serif-accent">bella avventura.</span></h2>
        </div>
        <div className="join-copy">
          <p>
            Siamo all’inizio: cerchiamo persone curiose, con voglia di imparare e
            condividere. L’esperienza conta meno della motivazione.
          </p>
          <Link className="button button-dark" href="/lavora-con-noi">
            Scopri le opportunità <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="contact-cta">
        <div className="section-wrap contact-cta-inner">
          <p className="eyebrow">Hai un’idea in testa?</p>
          <h2>Facciamola<br /><span className="serif-accent">succedere.</span></h2>
          <Link className="round-link round-link-invert" href="/contatti">
            <span>Parliamone</span><span className="round-link-icon" aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </>
  );
}
