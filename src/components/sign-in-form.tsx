"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SignInForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createSupabaseBrowserClient();
    if (!client) {
      setStatus("Accesso non configurato: completa prima le variabili Supabase.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");
    const formData = new FormData(event.currentTarget);
    try {
      const { error } = await client.auth.signInWithPassword({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });

      if (error) {
        setStatus("Email o password non validi, oppure accesso non disponibile.");
        return;
      }

      router.replace("/area-riservata");
      router.refresh();
    } catch (error) {
      console.error("Unable to sign in:", error);
      setStatus("Connessione non disponibile. Controlla la rete e riprova.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form sign-in-form" onSubmit={handleSubmit}>
      <label>
        Email aziendale
        <input autoComplete="username" name="email" required type="email" />
      </label>
      <label>
        Password
        <input autoComplete="current-password" name="password" required type="password" />
      </label>
      <button className="button button-dark" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Accesso in corso…" : "Accedi ↗"}
      </button>
      <p aria-live="polite" className="form-status" role="status">{status}</p>
    </form>
  );
}
