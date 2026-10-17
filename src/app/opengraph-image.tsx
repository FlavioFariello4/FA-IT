import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — Idee digitali, fatte bene`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "#f5f4ef",
          color: "#18231f",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: 26, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 24, background: "#d7f16b", fontSize: 30 }}>
            FA
          </div>
          {siteConfig.wordmark}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 94, fontWeight: 600, letterSpacing: "-0.08em", lineHeight: 0.95 }}>
          <span>Idee chiare.</span>
          <span style={{ color: "#75872f" }}>Digitale, fatto bene.</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#686e64", fontSize: 19, letterSpacing: "0.1em" }}>
          <span>STUDIO DIGITALE INDIPENDENTE</span>
          <span>FA IT</span>
        </div>
        <div style={{ position: "absolute", right: -100, bottom: -170, width: 500, height: 500, border: "1px solid #bbc19f", borderRadius: 250 }} />
        <div style={{ position: "absolute", right: 5, bottom: -80, width: 320, height: 320, border: "1px solid #bbc19f", borderRadius: 160 }} />
      </div>
    ),
    size,
  );
}
