import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section-wrap not-found-page">
      <p className="eyebrow">Errore 404 · pagina non trovata</p>
      <h1>Questa strada<br /><span className="serif-accent">non c’è.</span></h1>
      <p className="inner-lede">
        Il link potrebbe essere cambiato. Torna alla homepage o scopri i nostri servizi.
      </p>
      <div className="not-found-actions">
        <Link className="button button-dark" href="/">Vai alla homepage ↗</Link>
        <Link className="text-link" href="/servizi">Scopri i servizi <span>↗</span></Link>
      </div>
    </section>
  );
}
