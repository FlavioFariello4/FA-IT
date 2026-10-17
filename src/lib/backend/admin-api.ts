import { NextResponse } from "next/server";
import { hasSameOrigin, invalidRequestOriginResponse } from "@/lib/backend/http";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AdminApiContext = {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
};

export type AdminApiContextResult =
  | { context: AdminApiContext }
  | { response: NextResponse };

export async function getAdminApiContext(request: Request): Promise<AdminApiContextResult> {
  if (
    request.method !== "GET" &&
    !hasSameOrigin(request)
  ) {
    return { response: invalidRequestOriginResponse() };
  }

  const serverClient = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  if (!serverClient || !adminClient) {
    return {
      response: NextResponse.json(
        { message: "La gestione utenti non è configurata." },
        { status: 503 },
      ),
    };
  }

  const { data: { user }, error: authError } = await serverClient.auth.getUser();
  if (authError) {
    console.error("Unable to verify user management session:", authError.message);
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
    console.error("Unable to verify user management role:", roleError.message);
    return {
      response: NextResponse.json(
        { message: "Non è stato possibile verificare i permessi." },
        { status: 500 },
      ),
    };
  }
  if (!(assignments ?? []).some((assignment) => assignment.role === "admin")) {
    return {
      response: NextResponse.json(
        { message: "Permesso amministratore richiesto." },
        { status: 403 },
      ),
    };
  }

  return { context: { adminClient } };
}
