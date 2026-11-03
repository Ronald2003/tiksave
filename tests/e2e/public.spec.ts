import { test, expect } from "@playwright/test";
test("homepage is responsive with the vector theme", async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your favorite videos.Ready to save.");
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open your creator library" })).toHaveCount(0);
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  await page.screenshot({ path: `test-results/home-preview-${testInfo.project.name}.png` });
  await expect(page.locator("html")).toHaveClass(/vector-theme/);
  await expect(page.getByText("No registration. No extra steps.", {exact:true})).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Switch to .* theme/ })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/vector-theme/);
});
test("invalid link is rejected locally", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").fill("https://tiktok.com.evil.test/@a/video/6718335390845095173");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "secure link" })).toBeVisible();
});
test("photo result fixture clears the link and offers each image", async ({ page }) => {
  await page.route("**/photo-fixture/*", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><rect width="120" height="180" fill="#777"/></svg>' }));
  await page.route("**/api/videos/resolve", route => route.fulfill({ json: { data: { status: "ready", images: [1,2].map(index => ({ url: `/photo-fixture/${index}`, filename: `image-${index}`, expiresAt: Date.now()+90000 })) } } }));
  await page.goto("/");
  await page.getByRole("textbox").fill("https://www.tiktok.com/@4kwallpapers85/photo/7688136271289388310");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByRole("link", { name: "Save image 2" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("explicit API fixture shows an unavailable source accurately", async ({ page }) => {
  // Browser-only fixture. Production has no mock mode, test hook, or fixture provider.
  await page.route("**/api/videos/resolve", (route) => route.fulfill({ json: { data: { status: "clean_source_unavailable", videoId: "6718335390845095173", assets: [], message: "Watermark-free original unavailable for this video." } } }));
  await page.goto("/"); await page.getByRole("textbox").fill("https://www.tiktok.com/@a/video/6718335390845095173");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByText("Watermark-free original unavailable for this video.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Upload your original" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Download MP4/ })).toHaveCount(0);
});
test("API rejects wrong origin and invalid JSON inputs", async ({ request }) => {
  const cross = await request.post("/api/videos/resolve", { headers: { Origin: "https://evil.test" }, data: { url: "https://vm.tiktok.com/ABCdef/" } });
  expect(cross.status()).toBe(403);
  const origin = new URL(process.env.E2E_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").origin;
  const invalid = await request.post("/api/videos/resolve", { headers: { Origin: origin }, data: { url: "https://example.com" } });
  expect(invalid.status()).toBe(400);
  expect((await request.get("/api/health")).status()).toBe(200);
});
test("informational pages, auth setup, and SEO endpoints load", async ({ page, request }) => {
  test.setTimeout(60000);
  for (const path of ["/features", "/how-it-works", "/faq", "/privacy", "/terms", "/contact", "/auth", "/library"]) {
    const response = await page.goto(path); expect(response?.status()).toBe(200); await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/robots.txt")).status()).toBe(200);
});
