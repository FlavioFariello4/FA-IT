import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next") ?? "/area-riservata";
  const candidateNextUrl = new URL(nextPath, request.url);
  const safeNextUrl =
    nextPath.startsWith("/") && candidateNextUrl.origin === url.origin
      ? candidateNextUrl
      : new URL("/area-riservata", request.url);
  const code = url.searchParams.get("code");
  const supabase = await createSupabaseServerClient();

  if (!supabase || !code) {
    return NextResponse.redirect(new URL("/accesso?errore=invito", request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Unable to complete the staff invitation:", error.message);
    return NextResponse.redirect(new URL("/accesso?errore=invito", request.url));
  }

  return NextResponse.redirect(safeNextUrl);
}
