import "server-only";
import { z } from "zod";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { ApiError } from "./errors";
export { ApiError } from "./errors";

export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "invalid_origin", "This request must come from TikSave. Reload the page and try again.");
  }
}
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "invalid_content_type", "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "invalid_request", "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) { await reader.cancel(); throw new ApiError(413, "request_too_large", "Request is too large."); }
      chunks.push(value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const result = schema.safeParse(value);
    if (!result.success) throw new ApiError(400, "invalid_request", result.error.issues[0]?.message || "Check your input.");
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_request", "Invalid JSON request.");
  } finally { reader.releaseLock(); }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function api(action: () => Promise<Response>): Promise<Response> {
  try { return await action(); }
  catch (error) {
    const known = error instanceof ApiError;
    if (!known) console.error("TikSave request failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: { code: known ? error.code : "service_error", message: known ? error.message : "The service could not complete this request. Please try again." } }, {
      status: known ? error.status : 503,
      headers: { "Cache-Control": "private, no-store", ...(known && error.status === 429 ? { "Retry-After": "60" } : {}) },
    });
  }
}
export function uuid(value: string) {
  if (!z.uuid().safeParse(value).success) throw new ApiError(400, "invalid_id", "Invalid video or asset identifier.");
  return value;
}
