import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteUrl } from "@/lib/env";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "TikSave | Video downloader", template: "%s | TikSave" },
  description: "Download available MP4 videos from TikTok, YouTube, Facebook, Instagram, and more. Use only content you have permission to save.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "TikSave", title: "TikSave | Keep the original", description: "Check a link. Find an authorized original. Keep every detail.", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image" },
};
const themeScript = `(function(){try{var t=localStorage.getItem('theme');document.documentElement.classList.toggle('dark',t!=='light')}catch(e){}})()`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><a href="#main" className="skip-link">Skip to content</a><Header /><main id="main">{children}</main><Footer /></body></html>;
}
