import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type StaffRole = "admin" | "portfolio_editor" | "hr_manager" | "support";

export function isStaffRole(value: string): value is StaffRole {
  return value === "admin" || value === "portfolio_editor" || value === "hr_manager" || value === "support";
}

export async function requireStaffRole(allowedRoles: readonly StaffRole[]) {
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

  const roles = (data ?? []).map((row) => row.role).filter(isStaffRole);
  if (!roles.some((role) => allowedRoles.includes(role))) {
    redirect("/area-riservata");
  }

  return { supabase, user, roles };
}
