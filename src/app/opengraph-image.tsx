import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Optic Rank — AI-Powered SEO Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f2ed",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Top decorative line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: "#c0392b",
          }}
        />

        {/* Border frame */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #1a1a1a",
            padding: "48px 64px",
            margin: "40px",
            width: "1120px",
            height: "550px",
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#666",
              marginBottom: 16,
            }}
          >
            AI-Powered SEO Intelligence
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#1a1a1a",
              letterSpacing: "-0.02em",
              marginBottom: 24,
            }}
          >
            Optic Rank
          </div>

          {/* Divider */}
          <div
            style={{
              width: 120,
              height: 3,
              backgroundColor: "#c0392b",
              marginBottom: 24,
            }}
          />

          {/* Subtitle */}
          <div
            style={{
              fontSize: 22,
              color: "#555",
              textAlign: "center",
              maxWidth: 700,
              lineHeight: 1.5,
            }}
          >
            Track rankings, monitor competitors, audit your site, and unlock
            AI-driven insights for modern search visibility.
          </div>

          {/* Pillars */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 40,
              fontSize: 13,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#888",
            }}
          >
            <span>SEO</span>
            <span style={{ color: "#ccc" }}>|</span>
            <span>AEO</span>
            <span style={{ color: "#ccc" }}>|</span>
            <span>GEO</span>
            <span style={{ color: "#ccc" }}>|</span>
            <span>CRO</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
