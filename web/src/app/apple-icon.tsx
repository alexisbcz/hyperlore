import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the mark goes full-bleed on the brand lime.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ccff2a", alignItems: "center", justifyContent: "center" }}>
        <svg viewBox="7 7 18 18" width="104" height="104">
          <rect x="7" y="7" width="4" height="18" rx="2" fill="#0b0c0e" />
          <rect x="21" y="7" width="4" height="18" rx="2" fill="#0b0c0e" />
          <rect x="11" y="15" width="10" height="2" fill="#0b0c0e" />
          <circle cx="16" cy="16" r="4" fill="#0b0c0e" />
          <circle cx="16" cy="16" r="1.75" fill="#ccff2a" />
        </svg>
      </div>
    ),
    size,
  );
}
