import { ApiError } from "./security/errors";

export async function requestApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  let body: { data?: T; error?: { code?: string; message?: string } } | undefined;
  try {
    body = await response.json();
  } catch {
    if ([502, 503, 504].includes(response.status)) {
      throw new ApiError(response.status, "provider_unreachable", "The download server is temporarily unavailable.");
    }
    if (response.status === 429) {
      throw new ApiError(429, "rate_limited", "Too many requests. Wait a minute and try again.");
    }
    throw new ApiError(response.status || 502, "request_failed", "Something went wrong. Please try again.");
  }
  if (!response.ok) throw new ApiError(response.status, body?.error?.code ?? "request_failed", body?.error?.message || "Something went wrong. Please try again.");
  return body!.data as T;
}
export async function downloadAsset(id: string) {
  const data = await requestApi<{ url: string }>(`/api/videos/${id}/download`, { method: "POST" });
  const link = document.createElement("a");
  link.href = data.url;
  link.rel = "noopener noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
}
