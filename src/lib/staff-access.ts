import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function requireStaffRole(allowedRoles: readonly string[]) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("Unable to verify staff session:", userError.message);
    redirect("/accesso");
  }
  if (!user) {
    redirect("/accesso");
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) {
    console.error("Unable to load staff permissions:", error.message);
    redirect("/area-riservata");
  }

  if (!(data ?? []).some((row) => allowedRoles.includes(row.role))) {
    redirect("/area-riservata");
  }

  return { supabase, user };
}
