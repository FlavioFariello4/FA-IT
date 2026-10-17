import { NextResponse } from "next/server";

export function hasSameOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return false;
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestUrl = new URL(request.url);
  const requestHost = forwardedHost || request.headers.get("host") || requestUrl.host;
  const requestProtocol = forwardedProtocol || requestUrl.protocol.slice(0, -1);
  const expectedOrigins = new Set([`${requestProtocol}://${requestHost}`]);

  try {
    if (configuredOrigin) {
      expectedOrigins.add(new URL(configuredOrigin).origin);
    }
    return expectedOrigins.has(new URL(requestOrigin).origin);
  } catch (error) {
    if (error instanceof TypeError) {
      return false;
    }
    throw error;
  }
}

export function invalidRequestOriginResponse() {
  return NextResponse.json({ message: "Richiesta non valida." }, { status: 403 });
}

export function publicFormsDisabledResponse() {
  return NextResponse.json(
    { message: "Il modulo non è ancora attivo. Riprova più avanti." },
    { status: 503 },
  );
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function readFormText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }

  return body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}
