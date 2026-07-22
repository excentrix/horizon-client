import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Share-card for VELO credentials & verified profiles. Data arrives via query
// params (built server-side in generateMetadata) so this route never blocks on
// the backend. Explicit hexes are correct here — next/og can't read CSS vars;
// values mirror docs/brand/COLORS.md + the app's evidence scale.
const STATUS_THEME: Record<string, { label: string; color: string }> = {
  verified: { label: "VERIFIED", color: "#5858CC" },
  suspicious: { label: "FLAGGED", color: "#EC5B13" },
  failed: { label: "NOT DEFENDED", color: "#8a826f" },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title")?.slice(0, 90) || "Proof of work";
    const status = searchParams.get("status") || "verified";
    const score = searchParams.get("score");
    const meta = searchParams.get("meta")?.slice(0, 80) || "code-grounded interrogation";
    const t = STATUS_THEME[status] ?? STATUS_THEME.verified;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#FDF8EC",
            padding: "64px 80px",
            fontFamily: "sans-serif",
            color: "#212121",
            position: "relative",
          }}
        >
          {/* Rising sun, clipped by the horizon line */}
          <div
            style={{
              position: "absolute",
              right: 96,
              bottom: 0,
              width: 320,
              height: 160,
              borderTopLeftRadius: 320,
              borderTopRightRadius: 320,
              background: "radial-gradient(circle at 50% 100%, #FFB36B 0%, #EC5B13 80%)",
              display: "flex",
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 6,
              backgroundColor: "#414141",
              display: "flex",
            }}
          />

          {/* Brand row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 20,
                borderTopLeftRadius: 40,
                borderTopRightRadius: 40,
                background: "#EC5B13",
                display: "flex",
              }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>VELO</span>
              <span
                style={{
                  fontSize: 16,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: "#5a544a",
                }}
              >
                proof of work
              </span>
            </div>
          </div>

          {/* Verdict block */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 900 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  display: "flex",
                  border: `3px solid ${t.color}`,
                  color: t.color,
                  borderRadius: 8,
                  padding: "8px 18px",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 5,
                }}
              >
                {t.label}
                {score ? ` · ${score}/100` : ""}
              </span>
            </div>
            <span
              style={{
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1.05,
                color: "#212121",
              }}
            >
              {title}
            </span>
            <span style={{ fontSize: 22, letterSpacing: 2, color: "#5a544a", textTransform: "uppercase" }}>
              {meta}
            </span>
          </div>

          {/* Footer */}
          <span style={{ fontSize: 18, letterSpacing: 3, color: "#8a826f", textTransform: "uppercase" }}>
            excentrix.tech · auditable, not authoritative
          </span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch {
    return new Response("Failed to generate image", { status: 500 });
  }
}
