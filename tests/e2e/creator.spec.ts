import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mp4Fixture } from "../fixtures/mp4";

test("LIVE creator signs in, uploads, associates, shares, downloads exact bytes, and deletes", async ({ page, browser, request, baseURL }) => {
  test.skip(process.env.RUN_SUPABASE_TESTS !== "1", "Requires a migrated disposable Supabase project and server configured with .env.local.");
  test.setTimeout(90000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `tiksave-e2e-${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(error).toBeNull();
  const userId = data.user!.id;
  let assetId: string | undefined;
  try {
    await page.goto("/auth");
    await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
    await expect(page).toHaveURL(/\/library$/);
    await page.getByLabel("Choose original MP4").setInputFiles({ name: "explicit-synthetic-fixture.mp4", mimeType: "video/mp4", buffer: Buffer.from(mp4Fixture) });
    await page.getByLabel("Video title").fill("EXPLICIT E2E ORIGINAL FIXTURE");
    await page.getByLabel("TikTok video link").fill("https://www.tiktok.com/@fixture/video/7888888888888888888");
    await page.getByRole("checkbox", { name: /I have the rights/ }).check();
    await page.getByRole("button", { name: "Upload original", exact: true }).click();
    await expect(page.getByRole("heading", { name: "EXPLICIT E2E ORIGINAL FIXTURE" })).toBeVisible({ timeout: 30000 });
    const rows = await admin.from("videos").select("id,video_assets(id)").eq("owner_id", userId).single();
    assetId = rows.data!.video_assets[0].id;
    const anonymous = await request.post(`/api/videos/${assetId}/download`, { headers: { Origin: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000" } });
    expect(anonymous.status()).toBe(404);
    const other = createClient(url, key, { auth: { persistSession: false } });
    expect((await other.from("video_assets").select("id").eq("id", assetId)).data).toEqual([]);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    const download = await downloadPromise;
    expect(new Uint8Array(await readFile((await download.path())!))).toEqual(mp4Fixture);
    await page.getByRole("tab", { name: "Download history" }).click();
    await expect(page.getByText("Link issued ·", { exact: false })).toBeVisible();
    await page.getByRole("tab", { name: /My uploads/ }).click();
    await page.getByRole("button", { name: "Enable public downloads", exact: true }).click();
    await expect(page.getByRole("button", { name: "Disable public downloads", exact: true })).toBeVisible();
    const visitor = await browser.newContext();
    try {
      const publicPage = await visitor.newPage(); await publicPage.goto(baseURL || "http://localhost:3000/");
      await publicPage.getByRole("textbox").fill("https://www.tiktok.com/@fixture/video/7888888888888888888");
      await publicPage.getByRole("button", { name: "Download", exact: true }).click();
      await expect(publicPage.getByRole("button", { name: /Download MP4/ })).toBeVisible({ timeout: 30000 });
    } finally { await visitor.close(); }
    await page.getByRole("button", { name: /Delete EXPLICIT/ }).click();
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByRole("heading", { name: "EXPLICIT E2E ORIGINAL FIXTURE" })).toHaveCount(0);
  } finally {
    const videos = await admin.from("videos").select("id").eq("owner_id", userId);
    if (videos.data?.length) { await admin.storage.from("originals").remove(videos.data.map((v) => `${userId}/${v.id}/original.mp4`)); await admin.from("videos").delete().eq("owner_id", userId); }
    await admin.auth.admin.deleteUser(userId);
  }
});
