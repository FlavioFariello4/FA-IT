import { NextResponse } from "next/server";
import { invalidRequestOriginResponse, hasSameOrigin } from "@/lib/backend/http";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { StaffRole } from "@/lib/staff-access";

type StaffApiContext = {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
};

type StaffApiResult =
  | { context: StaffApiContext }
  | { response: NextResponse };

export async function getStaffApiContext(
  request: Request,
  allowedRoles: readonly StaffRole[],
): Promise<StaffApiResult> {
  if (!hasSameOrigin(request)) {
    return { response: invalidRequestOriginResponse() };
  }

  const serverClient = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  if (!serverClient || !adminClient) {
    return {
      response: NextResponse.json(
        { message: "La gestione riservata non è configurata." },
        { status: 503 },
      ),
    };
  }

  const { data: { user }, error: authError } = await serverClient.auth.getUser();
  if (authError) {
    console.error("Unable to verify staff API session:", authError.message);
    return { response: NextResponse.json({ message: "Sessione non valida." }, { status: 401 }) };
  }
  if (!user) {
    return { response: NextResponse.json({ message: "Accesso richiesto." }, { status: 401 }) };
  }

  const { data: assignments, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (roleError) {
    console.error("Unable to verify staff API permissions:", roleError.message);
    return {
      response: NextResponse.json(
        { message: "Non è stato possibile verificare i permessi." },
        { status: 500 },
      ),
    };
  }

  const allowedRoleSet: ReadonlySet<string> = new Set(allowedRoles);
  if (!(assignments ?? []).some(({ role }) => role === "admin" || allowedRoleSet.has(role))) {
    return {
      response: NextResponse.json({ message: "Non hai i permessi per questa operazione." }, { status: 403 }),
    };
  }

  return { context: { adminClient } };
}
