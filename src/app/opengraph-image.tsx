import { ImageResponse } from "next/og";
export const alt = "TikSave: keep the original, with permission";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() { return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", background: "#f8faff", padding: "75px", width: "100%", height: "100%", color: "#202536" }}><div style={{ display: "flex", color: "#4f46e5", fontSize: 35, fontWeight: 700 }}>↓ TikSave.</div><div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: "-3px", marginTop: 80 }}>Keep the original.</div><div style={{ display: "flex", color: "#4f46e5", fontSize: 65 }}>Permission comes first.</div><div style={{ display: "flex", color: "#606879", fontSize: 25, marginTop: 38 }}>Authorized MP4 originals, exactly as uploaded.</div></div>, size); }
