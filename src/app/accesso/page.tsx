import type { Metadata } from "next";
import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = {
  title: "Accesso riservato",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  const { errore } = await searchParams;

  return (
    <div className="inner-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Area riservata · accesso autorizzato</p>
        <h1>Benvenuto<br /><span className="serif-accent">nel team.</span></h1>
        <p className="inner-lede">
          L’area è accessibile solo agli account invitati e ai ruoli autorizzati.
        </p>
      </section>
      <section className="section-wrap form-section sign-in-section">
        <div className="form-aside">
          <p className="eyebrow">Accesso sicuro</p>
          <h2>Un account<br /><em>alla volta.</em></h2>
          <p>Non hai un account? Chiedi all’amministratore di invitarti.</p>
        </div>
        <SignInForm />
        {errore === "invito" && (
          <p className="form-status" role="alert">
            Il link di invito non è più valido. Chiedi all’amministratore di inviarne uno nuovo.
          </p>
        )}
      </section>
    </div>
  );
}
