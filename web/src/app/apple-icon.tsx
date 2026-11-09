import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the icon is just the brand lime, full-bleed.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#ccff2a" }} />
    ),
    size,
  );
}

// No params: lets static export (output: "export") prerender this image.
export const generateStaticParams = () => [{}];
