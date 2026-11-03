import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteUrl } from "@/lib/env";
export const metadata: Metadata = {
  applicationName: "TikSave",
  appleWebApp: { capable:true, title:"TikSave", statusBarStyle:"black-translucent" },
  icons: { apple:"/icons/apple-touch-icon.png" },
  metadataBase: new URL(siteUrl()),
  title: { default: "TikSave | Video downloader", template: "%s | TikSave" },
  description: "Download available videos and photo posts from TikTok, Facebook, Instagram, and more. Use only content you have permission to save.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "TikSave", title: "TikSave | Keep the original", description: "Check a link. Find an authorized original. Keep every detail.", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image" },
};
export const viewport:Viewport={themeColor:"#eee9ff"};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="vector-theme"><body><a href="#main" className="skip-link">Skip to content</a><Header /><main id="main">{children}</main><Footer /></body></html>;
}
