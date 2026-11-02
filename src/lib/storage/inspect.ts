import { ApiError } from "@/lib/security/errors";

export async function readMp4Prefix(response: Response) {
  const encoding = response.headers.get("content-encoding");
  if (response.status !== 206 || !response.body || Number(response.headers.get("content-length")) > 4096 || (encoding && encoding !== "identity")) {
    await response.body?.cancel();
    throw new ApiError(503, "range_unavailable", "Storage could not safely inspect the file. Please try again.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new ApiError(422, "invalid_file", "Storage returned more file data than requested."); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } finally { reader.releaseLock(); }
}
