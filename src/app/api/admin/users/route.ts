import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const roles = ["admin", "portfolio_editor", "hr_manager"] as const;
type StaffRole = (typeof roles)[number];

async function getAdminContext(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  if (request.method !== "GET" && request.headers.get("origin") !== expectedOrigin) {
    return NextResponse.json({ message: "Richiesta non valida." }, { status: 403 });
  }

  const serverClient = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();
  if (!serverClient || !adminClient) {
    return NextResponse.json({ message: "La gestione utenti non è configurata." }, { status: 503 });
  }

  const { data: { user }, error: authError } = await serverClient.auth.getUser();
  if (authError) {
    console.error("Unable to verify user management session:", authError.message);
    return NextResponse.json({ message: "Sessione non valida." }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ message: "Accesso richiesto." }, { status: 401 });
  }

  const { data: assignments, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (roleError) {
    console.error("Unable to verify user management role:", roleError.message);
    return NextResponse.json({ message: "Non è stato possibile verificare i permessi." }, { status: 500 });
  }
  if (!(assignments ?? []).some((assignment) => assignment.role === "admin")) {
    return NextResponse.json({ message: "Permesso amministratore richiesto." }, { status: 403 });
  }

  return { adminClient, userId: user.id };
}

function isContextError(
  context: Awaited<ReturnType<typeof getAdminContext>>,
): context is NextResponse<{ message: string }> {
  return context instanceof NextResponse;
}

function isStaffRole(value: unknown): value is StaffRole {
  return roles.some((role) => role === value);
}

export async function GET(request: Request) {
  const context = await getAdminContext(request);
  if (isContextError(context)) {
    return context;
  }

  const { data: userPage, error: usersError } = await context.adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (usersError) {
    console.error("Unable to list staff accounts:", usersError.message);
    return NextResponse.json({ message: "Non è stato possibile caricare gli account." }, { status: 500 });
  }

  const { data: assignments, error: rolesError } = await context.adminClient
    .from("user_roles")
    .select("user_id,role");
  if (rolesError) {
    console.error("Unable to list staff roles:", rolesError.message);
    return NextResponse.json({ message: "Non è stato possibile caricare i ruoli." }, { status: 500 });
  }

  const rolesByUser = new Map<string, string[]>();
  for (const assignment of assignments ?? []) {
    const userRoles = rolesByUser.get(assignment.user_id) ?? [];
    userRoles.push(assignment.role);
    rolesByUser.set(assignment.user_id, userRoles);
  }

  return NextResponse.json({
    users: userPage.users.map((user) => ({
      id: user.id,
      email: user.email ?? "",
      roles: rolesByUser.get(user.id) ?? [],
    })),
    hasMore: userPage.users.length === 100,
  });
}

export async function POST(request: Request) {
  const context = await getAdminContext(request);
  if (isContextError(context)) {
    return context;
  }

  const body: unknown = await request.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Dati non validi." }, { status: 400 });
  }
  const payload = body as { email?: unknown; role?: unknown };
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isStaffRole(payload.role)) {
    return NextResponse.json({ message: "Inserisci un’email valida e un ruolo." }, { status: 400 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return NextResponse.json(
      { message: "Configura il dominio pubblico prima di invitare il team." },
      { status: 503 },
    );
  }

  const inviteRedirectTo = new URL(
    "/auth/callback?next=/accesso/imposta-password",
    siteUrl,
  ).toString();
  const { data, error: inviteError } = await context.adminClient.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: inviteRedirectTo },
  );
  if (inviteError) {
    console.error("Unable to invite staff member:", inviteError.message);
    return NextResponse.json(
      { message: "Invito non inviato. Verifica la configurazione email e riprova." },
      { status: 502 },
    );
  }

  const { error: assignmentError } = await context.adminClient
    .from("user_roles")
    .insert({ user_id: data.user.id, role: payload.role });
  if (assignmentError) {
    console.error("Invitation sent but role assignment failed:", assignmentError.message);
    return NextResponse.json(
      { message: "Invito inviato, ma il ruolo non è stato assegnato. Contatta l’amministratore." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: `Invito inviato a ${email}.` }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getAdminContext(request);
  if (isContextError(context)) {
    return context;
  }

  const body: unknown = await request.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Dati non validi." }, { status: 400 });
  }
  const payload = body as { userId?: unknown; role?: unknown; enabled?: unknown };
  if (
    typeof payload.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.userId) ||
    !isStaffRole(payload.role) ||
    typeof payload.enabled !== "boolean"
  ) {
    return NextResponse.json({ message: "Dati non validi." }, { status: 400 });
  }

  if (!payload.enabled && payload.role === "admin") {
    const { count, error: countError } = await context.adminClient
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) {
      console.error("Unable to count administrators:", countError.message);
      return NextResponse.json({ message: "Non è stato possibile verificare gli amministratori." }, { status: 500 });
    }
    if (count !== null && count <= 1) {
      return NextResponse.json(
        { message: "Non puoi rimuovere l’ultimo amministratore." },
        { status: 409 },
      );
    }
  }

  const query = context.adminClient
    .from("user_roles")
    .select("user_id")
    .eq("user_id", payload.userId)
    .eq("role", payload.role);
  const { data: existing, error: lookupError } = await query.maybeSingle();
  if (lookupError) {
    console.error("Unable to check staff role:", lookupError.message);
    return NextResponse.json({ message: "Non è stato possibile verificare il ruolo." }, { status: 500 });
  }
  if (payload.enabled && !existing) {
    const { error } = await context.adminClient
      .from("user_roles")
      .insert({ user_id: payload.userId, role: payload.role });
    if (error) {
      console.error("Unable to assign staff role:", error.message);
      return NextResponse.json({ message: "Non è stato possibile assegnare il ruolo." }, { status: 500 });
    }
  } else if (!payload.enabled && existing) {
    const { error } = await context.adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", payload.userId)
      .eq("role", payload.role);
    if (error) {
      console.error("Unable to revoke staff role:", error.message);
      return NextResponse.json({ message: "Non è stato possibile revocare il ruolo." }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "Permessi aggiornati." });
}
