export default function Loading() {
  return (
    <section aria-label="Caricamento pagina" className="route-loader">
      <span aria-hidden="true" className="route-loader-mark">FA</span>
      <span>Un momento, stiamo arrivando.</span>
      <span aria-hidden="true" className="route-loader-line"><i /></span>
    </section>
  );
}
