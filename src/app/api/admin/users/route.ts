import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/backend/admin-api";
import { isValidEmail, readJsonObject } from "@/lib/backend/http";
import { isStaffRole } from "@/lib/staff-access";

export const runtime = "nodejs";

const defaultSiteOrigin = "https://www.fa-it.it";
const defaultInviteSender = "FA IT Support <support@fa-it.it>";

function trustedSiteOrigin(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && url.hostname === "localhost")
    ) {
      return null;
    }
    if (url.hostname === "onrender.com" || url.hostname.endsWith(".onrender.com")) {
      return null;
    }
    return url.origin;
  } catch (error) {
    if (error instanceof TypeError) {
      return null;
    }
    throw error;
  }
}

function getSiteOrigin(request: Request) {
  const requestOrigin = trustedSiteOrigin(request.headers.get("origin"));
  const configuredSiteOrigin = trustedSiteOrigin(process.env.SITE_URL);
  const publicSiteOrigin = trustedSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  return configuredSiteOrigin ?? requestOrigin ?? publicSiteOrigin ?? defaultSiteOrigin;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function GET(request: Request) {
  const result = await getAdminApiContext(request);
  if ("response" in result) {
    return result.response;
  }

  const { data: userPage, error: usersError } = await result.context.adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (usersError) {
    console.error("Unable to list staff accounts:", usersError.message);
    return NextResponse.json({ message: "Non è stato possibile caricare gli account." }, { status: 500 });
  }

  const { data: assignments, error: rolesError } = await result.context.adminClient
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
  const result = await getAdminApiContext(request);
  if ("response" in result) {
    return result.response;
  }

  const payload = await readJsonObject(request);
  if (!payload) {
    return NextResponse.json({ message: "Dati non validi." }, { status: 400 });
  }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!isValidEmail(email) || typeof payload.role !== "string" || !isStaffRole(payload.role)) {
    return NextResponse.json({ message: "Inserisci un’email valida e un ruolo." }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: "Inviti email non configurati: aggiungi RESEND_API_KEY nell’ambiente Render." },
      { status: 503 },
    );
  }

  const from = process.env.SUPPORT_EMAIL_FROM?.trim() || defaultInviteSender;
  const senderAddress = from.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (/[\r\n]/.test(from) || senderAddress.toLowerCase() !== "support@fa-it.it") {
    console.error("SUPPORT_EMAIL_FROM must use the verified support@fa-it.it sender.");
    return NextResponse.json(
      { message: "Il mittente degli inviti deve essere configurato con support@fa-it.it." },
      { status: 503 },
    );
  }

  const siteOrigin = getSiteOrigin(request);
  const inviteRedirectTo = new URL("/auth/callback?next=/accesso/imposta-password", siteOrigin).toString();
  const { data, error: inviteError } = await result.context.adminClient.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: inviteRedirectTo },
  });
  if (inviteError || !data.user || !data.properties.hashed_token) {
    console.error("Unable to generate staff invitation:", inviteError?.message ?? "Missing invite token hash.");
    return NextResponse.json(
      { message: "Non è stato possibile generare l’invito. Verifica che l’email non abbia già un account." },
      { status: 502 },
    );
  }

  const { error: assignmentError } = await result.context.adminClient
    .from("user_roles")
    .insert({ user_id: data.user.id, role: payload.role });
  if (assignmentError) {
    console.error("Unable to assign the role for the new staff invitation:", assignmentError.message);
    const { error: cleanupError } = await result.context.adminClient.auth.admin.deleteUser(data.user.id);
    if (cleanupError) {
      console.error("Unable to remove the account after staff role assignment failed:", cleanupError.message);
    }
    return NextResponse.json(
      {
        message: cleanupError
          ? "Il ruolo non è stato assegnato e non è stato possibile rimuovere l’account temporaneo. Verifica Supabase."
          : "Il ruolo non è stato assegnato; l’account temporaneo è stato rimosso. Riprova.",
      },
      { status: 500 },
    );
  }

  const safeEmail = escapeHtml(email);
  const inviteUrl = new URL("/auth/callback", siteOrigin);
  inviteUrl.searchParams.set("token_hash", data.properties.hashed_token);
  inviteUrl.searchParams.set("type", "invite");
  inviteUrl.searchParams.set("next", "/accesso/imposta-password");
  const safeInviteUrl = escapeHtml(inviteUrl.toString());
  let emailResponse: Response;
  try {
    emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `team-invite/${data.user.id}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: "support@fa-it.it",
        subject: "Sei stato invitato nel team FA IT",
        text: [
          "Ciao,",
          "",
          "sei stato invitato a collaborare con FA IT.",
          "Per attivare il tuo account e impostare la password, apri questo link:",
          inviteUrl.toString(),
          "",
          "Se non ti aspettavi questo invito, puoi ignorare questa email.",
          "",
          "FA IT",
          "support@fa-it.it",
        ].join("\n"),
        html: [
          "<!doctype html><html lang=\"it\"><body style=\"margin:0;background:#f4f3ed;padding:32px 16px;font-family:Arial,sans-serif;color:#202822\">",
          "<main style=\"max-width:560px;margin:0 auto;background:#fffefa;padding:36px;border:1px solid #deded4\">",
          "<p style=\"font-size:13px;font-weight:700;letter-spacing:.12em\">FA IT</p>",
          "<h1 style=\"font-size:28px;font-weight:500\">Benvenuto nel team</h1>",
          `<p>Sei stato invitato a collaborare con FA IT usando <strong>${safeEmail}</strong>.</p>`,
          `<p style=\"margin:28px 0\"><a href=\"${safeInviteUrl}\" style=\"display:inline-block;background:#d7f16b;padding:14px 20px;color:#202822;text-decoration:none;font-weight:700\">Attiva l’account e imposta la password</a></p>`,
          "<p>Se il pulsante non funziona, copia questo link nel browser:</p>",
          `<p style=\"overflow-wrap:anywhere;font-size:12px\"><a href=\"${safeInviteUrl}\">${safeInviteUrl}</a></p>`,
          "<p style=\"margin-top:32px;color:#62675e;font-size:13px\">Se non ti aspettavi questo invito, puoi ignorare questa email.</p>",
          "<p style=\"margin-top:28px;font-size:13px\">FA IT · <a href=\"https://www.fa-it.it\">www.fa-it.it</a></p>",
          "</main></body></html>",
        ].join(""),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error(
      "Unable to confirm staff invitation delivery through Resend:",
      error instanceof Error ? error.message : "Unknown network error",
    );
    return NextResponse.json(
      { message: "Esito dell’invio non verificabile. Controlla Resend prima di eliminare o reinviare l’invito." },
      { status: 502 },
    );
  }

  let providerResult: { id?: unknown; message?: unknown };
  try {
    providerResult = await emailResponse.json() as { id?: unknown; message?: unknown };
  } catch (error) {
    console.error("Resend returned an invalid staff invitation response:", error);
    return NextResponse.json(
      { message: "Account creato, ma l’esito dell’invio non è verificabile. Controlla Resend prima di reinviare l’invito." },
      { status: 502 },
    );
  }
  if (!emailResponse.ok || typeof providerResult.id !== "string") {
    console.error("Resend rejected staff invitation:", {
      status: emailResponse.status,
      message: typeof providerResult.message === "string" ? providerResult.message : "Invalid provider response",
    });
    const { error: deleteRoleError } = await result.context.adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", data.user.id)
      .eq("role", payload.role);
    if (deleteRoleError) {
      console.error("Unable to remove the role after Resend rejected the invitation:", deleteRoleError.message);
    }
    const { error: deleteUserError } = await result.context.adminClient.auth.admin.deleteUser(data.user.id);
    if (deleteUserError) {
      console.error("Unable to remove the account after Resend rejected the invitation:", deleteUserError.message);
    }
    return NextResponse.json(
      {
        message: deleteRoleError || deleteUserError
          ? "Resend ha rifiutato l’invito e la pulizia dell’account è incompleta. Controlla Supabase."
          : "Resend non ha accettato l’invito. Verifica che il dominio e il mittente siano verificati.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ message: `Invito inviato a ${email}.` }, { status: 201 });
}

export async function PATCH(request: Request) {
  const result = await getAdminApiContext(request);
  if ("response" in result) {
    return result.response;
  }

  const payload = await readJsonObject(request);
  if (!payload) {
    return NextResponse.json({ message: "Dati non validi." }, { status: 400 });
  }
  if (
    typeof payload.userId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.userId) ||
    typeof payload.role !== "string" ||
    !isStaffRole(payload.role) ||
    typeof payload.enabled !== "boolean"
  ) {
    return NextResponse.json({ message: "Dati non validi." }, { status: 400 });
  }

  if (!payload.enabled && payload.role === "admin") {
    const { count, error: countError } = await result.context.adminClient
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

  const query = result.context.adminClient
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
    const { error } = await result.context.adminClient
      .from("user_roles")
      .insert({ user_id: payload.userId, role: payload.role });
    if (error) {
      console.error("Unable to assign staff role:", error.message);
      return NextResponse.json({ message: "Non è stato possibile assegnare il ruolo." }, { status: 500 });
    }
  } else if (!payload.enabled && existing) {
    const { error } = await result.context.adminClient
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
