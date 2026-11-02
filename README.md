# TikSave

For the complete public **Netlify + Render Free** deployment tutorial, including API-key protection, exact environment settings, GitHub commands, and troubleshooting, open [PUBLIC-DEPLOYMENT.md](docs/PUBLIC-DEPLOYMENT.md). This is an unverified public-demo hosting path, not a guarantee of reliable free production.

Current public workflow: paste a link, check availability, and download an available MP4 without registering or uploading. The free local [Cobalt backend is now connected](docs/free-downloader.md), and a real user-supplied video has been retrieved. Both the website and backend must be running. Existing protected management routes remain optional. Public backend hosting is unresolved; Netlify alone cannot run this persistent media service.

A permission-based TikTok link analyzer and creator-original MP4 library. Built with Next.js App Router, strict TypeScript, Tailwind CSS, shadcn-style owned UI components, Lucide, Motion, React Hook Form, Zod, and Supabase. Netlify is the intended host.

**This is an implementation prepared for deployment, not a claim of production readiness.** No live Supabase project or Netlify site is connected in this workspace. Live RLS, Storage, auth, and upload/download acceptance tests must pass against your project before launch. See [verification](docs/verification.md).

## What works

- Responsive homepage, clipboard paste, keyboard submission, validation, loading/error states, real-source result panel, persisted light/dark preference, mobile navigation, informational and legal pages, metadata, Open Graph image, sitemap, and robots.
- Strict TikTok video/short-link validation. Limited, revalidated redirects; public-IP DNS resolution and pinned HTTPS connections; request timeout and response limits. Canonical video links do not trigger a page scrape.
- Documented TikTok oEmbed metadata, when accessible. No embed HTML or remote scripts are executed. The resolver returns partial/no metadata honestly.
- Supabase SSR email sign-up/sign-in, confirmation callbacks, password reset, session refresh, server verification, and sign-out.
- Authenticated creator library, MP4 selection/drop, progress, optional canonical association, rights attestation, private-by-default uploads, explicit sharing/revocation, deletion/retry, and download-link history.
- Direct, path-scoped signed uploads to a private bucket. Server completion checks stored size, MIME, and MP4 container signature before authorizing an immutable asset.
- RLS-scoped asset discovery and server access checks before 60-second signed downloads. Large videos download directly from Storage.
- Distributed database rate limiting in production, origin checks on mutations, bounded JSON bodies, secure headers, private/no-store responses, and secrets confined to server modules.
- SQL migration, local Supabase config, unit/component tests, public Playwright tests, opt-in live Supabase and creator acceptance suites, maintenance script, and Netlify configuration.

## Deliberate limits

A public TikTok link is never proof of ownership or access to an unwatermarked original. “Authorized” means that an authenticated uploader attested to their rights and granted the applicable access, **not** that TikSave verified their TikTok identity. TikSave does not remove or detect watermarks. It serves the file as uploaded and makes no guarantee about its contents.

No private API, protected-resource scraping, signature bypass, DRM circumvention, transcoding, invented media URL, or production fixture provider exists. Canonical identification does not prove that a post still exists. An unavailable metadata endpoint does not imply removal of the video.

The MVP stores one original asset per library video. It exposes only the backed original MP4 download; it does not create a separate HD rendition or manufacture resolution/duration data. Original quality is preserved. A separate HD label would require a second authorized asset and trusted media inspection, neither of which is simulated. Google OAuth is deferred as requested.

MP4 validation inspects an ISO BMFF signature, not a full decode, codec compatibility, malware scan, or content moderation. Synthetic test fixtures are explicitly labeled and are not playable media. Test with your own small, playable MP4 on real devices before launch.

## Local development

Use Node.js 22 LTS (Node 24 also satisfies the project engine range).

```powershell
npm ci
Copy-Item .env.example .env.local
# Edit .env.local locally. Never paste secrets into chat or commit them.
npm run dev
```

Open `http://localhost:3000`. Without Supabase settings, static pages and validation work; creator pages show a setup notice. Development can check public metadata without a database, but it cannot supply any original. Production resolution/download requests fail closed if distributed rate-limit configuration is missing.

### Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Exact canonical origin, e.g. `http://localhost:3000` locally and your HTTPS domain in production. Used for CSRF, metadata, and auth redirects. No trailing path. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Current browser-safe publishable key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy browser-safe anon key fallback. Prefer the publishable key for new projects. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only elevated key, used for verification-controlled writes, rate limits, signed uploads, and public-download signing. Never prefix with `NEXT_PUBLIC_`. |
| `RATE_LIMIT_SECRET` | A random secret of at least 32 characters, used to hash rate-limit identities. Generate locally using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. |
| `MAX_UPLOAD_BYTES` | Optional integer, 1,024–26,214,400; defaults to 26,214,400 (25 MiB). May lower the application limit, not raise the bucket ceiling. |
| `CONTACT_EMAIL` | Operator support/privacy/rights address. Required operationally before a public launch. |
| `RUN_SUPABASE_TESTS` | `1` opts into tests that create/delete disposable users and videos. Keep unset/`0` outside a test project. |
| `E2E_BASE_URL` | Optional Playwright target; default local origin. Use a disposable test deployment only. |

Public variables are embedded at build time: changing them requires a rebuild. Environment names follow current Supabase publishable-key guidance with a legacy anon fallback. The service-role key remains server-only; browser requests use an RLS-scoped client. No service credential is needed in client code.

## Supabase setup

1. Create a **dedicated** Supabase project; choose its data region deliberately. Do not mix this bucket/policies with unrelated applications.
2. Open SQL Editor and run `supabase/migrations/202611020001_tiksave.sql` once, or use the CLI workflow below. The migration creates tables, indexes, ownership constraints, RLS, restricted RPCs, a profile trigger, and the private `originals` bucket (25 MiB, MP4 only).
3. Copy the project URL, publishable/legacy anon key, and server-only service-role key into `.env.local`. Generate `RATE_LIMIT_SECRET`. Set your exact site origin.
4. In Authentication, enable Email, keep email confirmation enabled, and set a password minimum of at least 12 characters. Configure production SMTP and the authentication provider's rate limits/bot protection for public launch.
5. Set Auth Site URL to your canonical origin. Add exact redirect allowlist entries: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`, and the corresponding production HTTPS routes. Add the recovery callback `https://YOUR-DOMAIN/auth/callback?next=/auth?mode=update` if your allowlist uses exact query matching. Do not allow arbitrary redirect destinations.
6. Default PKCE email links use `/auth/callback` and must be opened in the browser that began the flow. For cross-device confirmation, use email templates with `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`; for password recovery use `type=recovery`. `/auth/confirm` accepts only email/signup/recovery types and redirects to fixed destinations.
7. Check Storage: `originals` must remain **private**, MP4-only, with a maximum of 26,214,400 bytes. **Do not add public read/write policies.** There are deliberately no raw-object client policies; scoped signed URLs supply access. Ensure bucket versioning is disabled, or add an explicit version-retention/purge process before relying on deletion for storage costs/privacy.
8. Run the live integration and creator browser tests below against this disposable project. Confirm that direct Storage reads/writes and private asset queries by another user fail.
9. Before public use, set `CONTACT_EMAIL`, review the legal text with your operator identity/jurisdiction, and run a real playable-video transfer on mobile and desktop.

Optional local Supabase requires Docker and the Supabase CLI:

```powershell
npx supabase start
npx supabase db reset
npx supabase status
# Copy local API URL, anon key and service_role key to .env.local.
# Leave Auth email confirmation enabled; inspect local test mail in Studio/Inbucket.
npm run dev
```

For a remote project using the CLI:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration is for a new dedicated schema and is intentionally not a destructive reset. Back up a populated deployment before applying any later migrations. Never edit `storage.objects` directly to delete files: remove objects through the Storage API first.

## API and architecture

```text
Browser → Next.js Node route handlers → RLS-scoped Supabase queries
             │
             ├─ TikTok validator → safe short links → documented metadata
             ├─ owner/public asset visibility → server authorization → signed download
             └─ authenticated upload intent → signed upload → stored-object verification

Browser ⇄ Supabase Storage directly (MP4 bytes)
```

| Method and route | Behavior |
| --- | --- |
| `POST /api/videos/resolve` | `{url}` → canonical ID, permitted metadata, accurate availability and authorized asset IDs. No media download during analysis. |
| `POST /api/videos/upload/init` | Auth + title, filename, MIME, size, optional URL, rights attestation, public-metadata/download choices → reservation and signed upload URL. |
| `POST /api/videos/upload/complete` | Auth + `{intentId,videoId}` → check immutable stored bytes and atomically authorize asset. Idempotent after completion. |
| `GET /api/videos/[id]` | RLS-permitted video metadata. `[id]` is a library video UUID. |
| `DELETE /api/videos/[id]` | Owner-only file and row deletion. Failed deletions remain hidden and retryable. |
| `PATCH /api/videos/[id]` | Owner-only `{shared}` public-download grant/revocation. Enabling also exposes metadata; revoking does not hide existing public metadata. |
| `POST /api/videos/[id]/download` | **Here `[id]` is the asset UUID**, returned by resolution or library. Rechecks permissions; returns a 60-second URL, safe filename, and expiry. |
| `GET /api/library` | Current user's 20 library entries and latest 30 download-link records. |
| `GET /api/health` | Minimal liveness only, not a database/storage readiness claim. |

Success: `{ "data": ... }`. Failure: `{ "error": { "code": "...", "message": "..." } }`. Mutation requests require `Origin` matching `NEXT_PUBLIC_SITE_URL`; JSON endpoints also require `Content-Type: application/json`. Validation is bounded to 8 KiB. Authorization failures do not disclose whether another user's private asset exists.

`src/lib/video/resolvers` separates URL resolution, metadata, and authorized originals. `src/lib/video/download.ts` centralizes signing and access checks. `src/lib/security` owns SSRF, CSRF/origin, rate limits, and safe errors. Static marketing pages avoid server rendering; only auth, library, and API paths refresh sessions. SQL enforces composite `(video_id, owner_id)` asset ownership independently of application checks.

Elevated access is limited to trusted server modules. Clients cannot insert/update video assets or call privileged upload/rate-limit RPCs directly; otherwise they could mark an unverified object authorized. RLS-scoped sessions perform discovery and library reads. Public-download signing requires elevated storage access because public row visibility never creates raw bucket access.

### Lifecycle and maintenance

Application limits: 20 pending/completed videos per owner, at most 200 MiB reserved plus completed bytes, 25 MiB per file (optionally lower). Each pending upload reserves the full bucket limit to prevent size under-declaration from bypassing the quota. Reservations are serialized per owner in a transaction. An existing TikTok association per owner cannot silently be overwritten; delete it first.

Signed upload tokens last two hours. Pending deletion immediately hides the entry and removes current bytes, but retains a tombstone for at least three hours so an unexpired token cannot create an untracked orphan. Incomplete transfers remain retryable/removable in the library. The server refuses to buffer a whole MP4 during validation and requires a small Range response.

Run maintenance hourly using a secure operator job or scheduled GitHub Action with repository/environment secrets:

```powershell
# Local operator run; .env.local is ignored by Git.
npm run cleanup
# Hosted CI with environment secrets already injected:
node scripts/cleanup.mjs
```

This removes up to 100 pending/deleting reservations older than three hours, deletes objects before rows, and prunes rate counters older than one day. Re-run a full batch. It is **not automatically scheduled** by the app. Do not claim orphan cleanup is running until you configure the job. For account deletion, remove all owned Storage objects and video rows first, then delete the Auth user. The restrictive owner FK deliberately prevents deleting an account while it still owns videos.

## Tests

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright uses installed Microsoft Edge on Windows; install Edge or change `channel` to an installed browser. The suite has desktop and mobile-sized Chromium projects. It does not certify real iOS Safari or real hardware. The public availability test uses an **explicit browser-intercepted fixture**, not a live TikTok claim. Production imports no test fixture. All security/unit tests are local and deterministic.

Live Supabase tests:

```powershell
# Use only a disposable migrated Supabase project in .env.local.
# Set RUN_SUPABASE_TESTS=1 locally, never in your public deployment environment.
npm run test:integration
# Start/restart npm run dev so it picks up the same .env.local, then:
npm run test:e2e
```

The live suite creates two confirmed test accounts and verifies DB reads/writes, privileged RPC denial, ownership constraints, private Storage denial, signed-upload overwrite prevention, metadata-vs-download visibility, and exact download bytes. The live browser flow verifies sign-in, upload completion, association, private download denial, history, explicit public sharing, and deletion. Test users/files are cleaned in teardown. Do not run against a populated production project.

An absent `RUN_SUPABASE_TESTS=1` yields explicit skips, **not a pass** for live security. Supply a playable, rights-cleared MP4 for final hardware/browser acceptance; the checked-in fixture tests container signature and byte transport only.

## Netlify deployment (GitHub continuous deployment)

1. Complete Supabase setup and live checks first. Create a private GitHub repository and push this source, including `package-lock.json`; exclude `.env.local`, build output, and secrets. This workspace starts without a Git repository or remote, so no commit/push has been claimed.
2. In Netlify choose **Add new project → Import an existing project → GitHub**, select the repository and deployment branch.
3. Set build command `npm run build`, publish directory `.next`, Node 22. `netlify.toml` supplies these defaults. Use Netlify's automatically managed current Next.js/OpenNext integration; do not install a custom adapter, pin the legacy plugin, use a static export, or add a catch-all SPA redirect.
4. Add all production variables from the table to Netlify's environment configuration. Mark the service-role key and rate-limit secret as secrets, scoped to Functions/build as appropriate. Do not give production secrets to untrusted PR previews. Use a separate Supabase project for previews.
5. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS Netlify/custom domain, add the exact Supabase Auth callbacks for it, and configure `CONTACT_EMAIL`. First determine the domain if necessary, then rebuild with the correct public variables.
6. Deploy. Connect the custom domain if needed and let Netlify provision HTTPS. Git pushes to the configured branch trigger subsequent builds.
7. Verify `/`, every informational page, `/auth`, `/library`, `/api/health`, `/sitemap.xml`, and `/robots.txt`. Exercise signup/confirmation/recovery/signout, supported short links, validation failures, actual authorized uploads/downloads, and denied private downloads as a second user. Run the opt-in suites against a disposable preview before promoting a release.
8. In a production request verify that `x-nf-client-connection-ip` is set/overwritten by Netlify and `NETLIFY=true` is available to Functions. Rate limiting trusts only that platform header; if absent, anonymous traffic shares a conservative global bucket. Never trust a user-supplied `X-Forwarded-For` list.
9. Schedule maintenance, enable budget/quota alerts, review retention and abuse handling, and test a deletion plus retry. Sign-out/redirect responses must preserve Auth cookies and private API responses must not be cached by the CDN.

No Netlify account was connected and no hosted deployment has been made here. A successful local Next.js build is necessary, but does not establish Netlify-specific runtime correctness.

## Free-tier operation

Static pages cache normally. Resolution never downloads video bytes. Uploads/downloads go directly between browser and Supabase Storage; only a bounded header check runs in a function. The optional Cobalt downloader is a separate persistent process with its own FFmpeg dependency; FFmpeg never runs inside the Next.js/Netlify functions. Fonts and editorial imagery are local. Rate counters and query counts are bounded, and stale uploads have a maintenance path.

Application limits do not imply provider allowances. Check current [Netlify usage and billing](https://docs.netlify.com/manage/accounts-and-billing/) and [Supabase usage](https://supabase.com/docs/guides/platform/manage-your-usage) before enabling public sharing. Storage egress from even a small popular original can consume a free allowance quickly. Metadata endpoints and Auth SMTP also have independent limits. Configure alerts and spending controls; the application cannot promise zero cost. On database/rate-limit failures, protected endpoints fail closed with a safe 503. Storage/quota/network errors retain a retryable library state; downloads are not rerouted through Netlify as a fallback.

## Security checklist before public launch

- [ ] Apply migration to a dedicated project; run live RLS/Storage and full creator browser tests.
- [ ] Verify the private bucket and absence of permissive raw-object policies; disable bucket versioning or configure version purge.
- [ ] Keep only browser-safe publishable/anon keys public. Verify no elevated key in client bundles, Git, or logs.
- [ ] Set exact HTTPS site origin, at least 32-character rate-limit secret, callback allowlist, SMTP, email confirmation, and strong Auth policy.
- [ ] Verify origin rejection, rate-limit behavior across function instances, and pinned DNS redirect resolution on the deployed Netlify runtime.
- [ ] Verify Storage Range support and signed-upload overwrite rejection against your provider version.
- [ ] Test public metadata without download sharing, revocation, signed-link expiry, deletion/retry, and pending-token tombstones.
- [ ] Schedule maintenance and provider budget alerts; verify account/data deletion procedure.
- [ ] Configure real operator contact details, review legal pages, and establish copyright/abuse response.
- [ ] Test a real playable MP4, desktop/mobile layouts, clipboard permission denial, reduced motion, keyboard navigation, and real iOS Safari.
- [ ] Review dependency audit output. Build-tool advisories are described in the verification report; avoid blind `npm audit fix --force` downgrades.

The CSP allows Next.js inline bootstrap/theme scripts and inline styles, disallows objects/frames, and restricts connections/media. It is not a nonce-based strict CSP; a stricter policy requires per-request rendering/nonces and should be evaluated against the static-page cost goal.

## Source references

- [Supabase SSR clients and cookie/session refresh](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase signed uploads](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- [TikTok documented oEmbed metadata](https://developers.tiktok.com/docs/en/embed-videos) (the provider currently announces deprecation of its Embed Videos product; metadata may stop being available. Failures are handled as missing metadata, never replaced with scraping.)
- [Netlify Next.js integration](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)

Recommended next steps: configure a disposable Supabase environment, run live security/creator acceptance, test a real MP4 on real devices, set operator/SMTP/maintenance settings, then connect GitHub and validate a Netlify preview. See [file map and verification](docs/verification.md) for the implementation report.
