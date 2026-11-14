export async function requestApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || "Something went wrong. Please try again.");
  return body.data as T;
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
