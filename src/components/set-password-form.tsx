"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createSupabaseBrowserClient();
    if (!client) {
      setStatus("Accesso non configurato. Contatta l’amministratore.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (password !== confirmation) {
      setStatus("Le password non coincidono.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setStatus("Non è stato possibile impostare la password. Verifica i requisiti e riprova.");
        return;
      }
      router.replace("/area-riservata");
      router.refresh();
    } catch (error) {
      console.error("Unable to set staff password:", error);
      setStatus("Connessione non disponibile. Controlla la rete e riprova.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form sign-in-form" onSubmit={handleSubmit}>
      <label>Nuova password<input autoComplete="new-password" minLength={12} name="password" required type="password" /></label>
      <label>Conferma password<input autoComplete="new-password" minLength={12} name="confirmation" required type="password" /></label>
      <button className="button button-dark" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Salvataggio…" : "Imposta password ↗"}
      </button>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </form>
  );
}
