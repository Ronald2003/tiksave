import { json } from "@/lib/security/http";
export const runtime = "nodejs";
export async function GET() { return json({ status: "ok" }); }
