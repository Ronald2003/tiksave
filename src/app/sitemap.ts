import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
export default function sitemap(): MetadataRoute.Sitemap { return ["", "/features", "/how-it-works", "/faq", "/privacy", "/terms", "/contact"].map((path) => ({ url: `${siteUrl()}${path}`, changeFrequency: "monthly", priority: path ? 0.6 : 1 })); }
