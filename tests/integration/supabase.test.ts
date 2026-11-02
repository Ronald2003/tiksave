import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mp4Fixture } from "../fixtures/mp4";

const run = process.env.RUN_SUPABASE_TESTS === "1";
describe.skipIf(!run)("LIVE disposable Supabase database and Storage policies", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = () => createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const users: string[] = [];
  const paths: string[] = [];
  const videoIds: string[] = [];
  let owner: SupabaseClient;
  let other: SupabaseClient;
  let ownerId: string;
  let otherId: string;
  let intent: { id: string; video_id: string; storage_path: string };
  let assetId: string;
  beforeAll(async () => {
    if (!url || !key || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Provide disposable Supabase test credentials in .env.local.");
    for (let i = 0; i < 2; i++) {
      const email = `tiksave-policy-${randomUUID()}@example.test`;
      const password = `${randomUUID()}Aa1!`;
      const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) throw new Error("Could not create disposable test users.");
      users.push(data.user.id);
      const client = createClient(url, key, { auth: { persistSession: false } });
      const signin = await client.auth.signInWithPassword({ email, password });
      if (signin.error) throw new Error("Could not authenticate disposable test user.");
      if (i === 0) { owner = client; ownerId = data.user.id; } else { other = client; otherId = data.user.id; }
    }
  });
  afterAll(async () => {
    if (paths.length) await admin().storage.from("originals").remove(paths);
    if (videoIds.length) await admin().from("videos").delete().in("id", videoIds);
    for (const id of users) await admin().auth.admin.deleteUser(id);
  });
  it("does not permit clients to self-authorize uploads or call privileged RPCs", async () => {
    expect((await owner.from("video_assets").insert({ owner_id: ownerId })).error).not.toBeNull();
    expect((await owner.rpc("initialize_upload", { p_owner: otherId, p_title: "spoof", p_tiktok_id: null, p_size: 32, p_public_metadata: false, p_share_download: true })).error).not.toBeNull();
    expect((await owner.rpc("consume_rate_limit", { bucket_key: "x".repeat(64), max_requests: 120 })).error).not.toBeNull();
  });
  it("creates an owner-scoped private upload reservation", async () => {
    const { data, error } = await admin().rpc("initialize_upload", { p_owner: ownerId, p_title: "EXPLICIT SYNTHETIC TEST FIXTURE", p_tiktok_id: "7999999999999999999", p_size: mp4Fixture.length, p_public_metadata: false, p_share_download: false });
    expect(error).toBeNull(); intent = data; paths.push(intent.storage_path); videoIds.push(intent.video_id);
    expect((await other.from("videos").select("id").eq("id", intent.video_id)).data).toEqual([]);
    expect((await owner.from("upload_intents").select("id").eq("id", intent.id)).data).toHaveLength(1);
  });
  it("denies raw uploads and reads, and accepts only a path-scoped signed upload", async () => {
    expect((await owner.storage.from("originals").upload(intent.storage_path, mp4Fixture, { contentType: "video/mp4" })).error).not.toBeNull();
    const signed = await admin().storage.from("originals").createSignedUploadUrl(intent.storage_path, { upsert: false });
    expect(signed.error).toBeNull();
    const transfer = await fetch(signed.data!.signedUrl, { method: "PUT", body: mp4Fixture, headers: { "Content-Type": "video/mp4", "x-upsert": "false" } });
    expect(transfer.ok).toBe(true);
    const overwrite = await fetch(signed.data!.signedUrl, { method: "PUT", body: mp4Fixture, headers: { "Content-Type": "video/mp4", "x-upsert": "true" } });
    expect(overwrite.ok).toBe(false);
    expect((await other.storage.from("originals").download(intent.storage_path)).error).not.toBeNull();
  });
  it("finalizes only the correct reservation and owner", async () => {
    expect((await admin().rpc("finalize_upload", { p_intent: intent.id, p_owner: otherId, p_size: mp4Fixture.length })).error).not.toBeNull();
    const { data, error } = await admin().rpc("finalize_upload", { p_intent: intent.id, p_owner: ownerId, p_size: mp4Fixture.length });
    expect(error).toBeNull(); assetId = data;
    expect((await owner.from("video_assets").select("id").eq("id", assetId)).data).toHaveLength(1);
    expect((await other.from("video_assets").select("id").eq("id", assetId)).data).toEqual([]);
  });
  it("separates public metadata from download visibility", async () => {
    const anon = createClient(url, key, { auth: { persistSession: false } });
    await admin().from("videos").update({ is_public: true }).eq("id", intent.video_id);
    expect((await anon.from("videos").select("id").eq("id", intent.video_id)).data).toHaveLength(1);
    expect((await anon.from("video_assets").select("id").eq("id", assetId)).data).toEqual([]);
    await admin().from("video_assets").update({ is_public: true }).eq("id", assetId);
    expect((await anon.from("video_assets").select("id").eq("id", assetId)).data).toHaveLength(1);
    expect((await anon.storage.from("originals").download(intent.storage_path)).error).not.toBeNull();
  });
  it("signed downloads contain the exact uploaded fixture bytes", async () => {
    const { data, error } = await admin().storage.from("originals").createSignedUrl(intent.storage_path, 30, { download: "fixture.mp4" });
    expect(error).toBeNull();
    const result = await fetch(data!.signedUrl);
    expect(result.ok).toBe(true); expect(new Uint8Array(await result.arrayBuffer())).toEqual(mp4Fixture);
  });
  it("composite ownership constraints reject an asset owned by a different creator", async () => {
    const attempt = await admin().from("video_assets").insert({ video_id: intent.video_id, owner_id: otherId, storage_path: `${otherId}/${intent.video_id}/original.mp4`, file_size: 32, mime_type: "video/mp4", authorization_status: "authorized" });
    expect(attempt.error).not.toBeNull();
  });
});
