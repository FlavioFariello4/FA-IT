import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const defaultSiteOrigin = "https://www.fa-it.it";

function getSiteOrigin() {
  for (const candidate of [process.env.SITE_URL, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!candidate) {
      continue;
    }
    try {
      const url = new URL(candidate);
      if (
        (url.protocol === "https:" ||
          (process.env.NODE_ENV !== "production" && url.hostname === "localhost")) &&
        url.hostname !== "0.0.0.0" &&
        url.hostname !== "onrender.com" &&
        !url.hostname.endsWith(".onrender.com")
      ) {
        return url.origin;
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  return defaultSiteOrigin;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next") ?? "/area-riservata";
  const siteOrigin = getSiteOrigin();
  const candidateNextUrl = new URL(nextPath, siteOrigin);
  const safeNextUrl =
    nextPath.startsWith("/") && !nextPath.startsWith("//") && candidateNextUrl.origin === siteOrigin
      ? candidateNextUrl
      : new URL("/area-riservata", siteOrigin);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const tokenType = url.searchParams.get("type");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/accesso?errore=invito", siteOrigin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Unable to complete the staff invitation:", error.message);
      return NextResponse.redirect(new URL("/accesso?errore=invito", siteOrigin));
    }
  } else if (tokenHash && tokenType === "invite") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" });
    if (error) {
      console.error("Unable to verify the staff invitation token:", error.message);
      return NextResponse.redirect(new URL("/accesso?errore=invito", siteOrigin));
    }
  } else {
    return NextResponse.redirect(new URL("/accesso?errore=invito", siteOrigin));
  }

  return NextResponse.redirect(safeNextUrl);
}
