"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const client = createSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const { error } = await client.auth.signOut();
    if (error) {
      console.error("Unable to sign out:", error.message);
      return;
    }

    router.replace("/accesso");
    router.refresh();
  }

  return <button className="text-button sign-out-button" onClick={handleSignOut} type="button">Esci</button>;
}
