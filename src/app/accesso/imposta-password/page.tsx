import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/set-password-form";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Imposta password",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <section className="section-wrap admin-page"><h1>Accesso non configurato.</h1></section>;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Unable to verify invitation session:", error.message);
  }
  if (!user) {
    redirect("/accesso");
  }

  return (
    <div className="inner-page">
      <section className="inner-hero section-wrap">
        <p className="eyebrow">Invito team · primo accesso</p>
        <h1>Scegli una<br /><span className="serif-accent">password sicura.</span></h1>
        <p className="inner-lede">Usa almeno 12 caratteri e non riutilizzare password già usate altrove.</p>
      </section>
      <section className="section-wrap form-section sign-in-section">
        <SetPasswordForm />
      </section>
    </div>
  );
}
