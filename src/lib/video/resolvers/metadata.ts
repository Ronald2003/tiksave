import "server-only";
import { z } from "zod";
import { safeTikTokGet } from "@/lib/security/network";
const schema = z.object({ title: z.string().max(5000).optional(), author_name: z.string().max(200).optional(), thumbnail_url: z.url().optional() });
export async function resolveMetadata(canonicalUrl: string) {
  try {
    const endpoint = new URL("https://www.tiktok.com/oembed");
    endpoint.searchParams.set("url", canonicalUrl);
    const response = await safeTikTokGet(endpoint);
    if (response.status !== 200) return { metadataAvailable: false };
    const data = schema.parse(JSON.parse(response.body));
    const thumbnail = data.thumbnail_url ? new URL(data.thumbnail_url) : null;
    return { title: data.title, creatorName: data.author_name, thumbnailUrl: thumbnail?.protocol === "https:" && !thumbnail.username && !thumbnail.password ? thumbnail.href : undefined, metadataAvailable: true };
  } catch { return { metadataAvailable: false }; }
}
