# Implementation and verification report

## Free link-only downloader update

The public UI now has no sign-in or upload prompts. A separate local Cobalt 11.7.1 backend is installed under ignored `.local/cobalt` and configured through `COBALT_API_URL`. See [free downloader setup](free-downloader.md). This supersedes the initial uploads-only discovery limitation below; the old protected creator routes still exist as optional management features.

Verified on 2 November 2026: **89 unit/component tests passed**, **10 desktop/mobile public browser tests passed**, and **one explicit live anonymous browser download passed** with the user-supplied TikTok short link. The live test used the real API and downloaded a real MP4, not intercepted fixture data. A separate direct transfer produced 9,082,495 bytes; FFmpeg decoded a 1280×720 H.264 frame. This is not proof of watermark absence or licensing. Production build and lint passed. An initial browser request failed with an upstream page-fetch error; one bounded retry for that specific transient error was added and tested. Restrictions, authentication failures, and rate limits are not retried.

The Cobalt source is unmodified; only its local workspace build approvals/configuration were changed. No paid service, public-instance borrowing, login cookies, or access-restriction bypass was added. Public hosting, real-device playback across browsers, optional creator RLS suites, and a separate audit of all Cobalt dependencies remain unverified. The local backend must remain running, and production refuses loopback backend configuration.

## Features and architecture

The app implements TikTok link validation, safe short-link resolution, permitted metadata, permission-based original discovery, signed direct downloads, creator email auth, private signed uploads, explicit public sharing, a library, link history, informational/legal pages, themes, responsive layouts, and SEO routes. See README for the precise source/quality limitations and operator requirements.

There is no live database or deployment configuration in the workspace beyond `.env.example`, SQL, and host config. No fake provider or browser credentials are shipped. Test fixtures are isolated under `tests/`.

## Files created

| Location | Responsibility |
| --- | --- |
| `package.json`, lockfile, `tsconfig.json`, `next.config.ts`, ESLint/PostCSS config, `components.json` | Next.js foundation, strict checks, headers, Tailwind, owned shadcn-pattern components. |
| `src/app/page.tsx`, `layout.tsx`, `globals.css` | Homepage, reusable shell and responsive theme tokens. |
| `src/app/features`, `how-it-works`, `faq`, `privacy`, `terms`, `contact` | Product and behavior-accurate information pages. |
| `src/app/auth`, `src/proxy.ts`, `src/lib/supabase` | Email authentication, confirmation/recovery, session refresh, verified server clients. |
| `src/app/library`, `src/components/library` | Private creator workspace, uploads, explicit sharing, removal/retry, history. |
| `src/app/api` | Resolve, upload init/complete, metadata, sharing/delete, signed download, library and health routes. |
| `src/lib/security` | Bounded input, origin checks, errors, distributed throttle, public DNS and pinned TLS requests. |
| `src/lib/validation`, `src/lib/video` | TikTok/upload validation, MP4 signature, separate source resolvers and download authorization. |
| `src/components/ui`, `layout`, `downloader`, `auth`, `content.tsx` | Shared UI, navigation, downloader/result states, auth forms and content. |
| `supabase/migrations`, `supabase/config.toml` | Database, constraints, RLS, restricted RPCs, private bucket and local settings. |
| `scripts/cleanup.mjs` | Bounded stale-upload/tombstone/object and rate-counter maintenance. |
| `tests/unit`, `tests/integration`, `tests/e2e`, `tests/fixtures`, test configs | Local tests, opt-in live policy/creator tests and explicit fixtures. |
| `src/app/sitemap.ts`, `robots.ts`, `opengraph-image.tsx` | Indexing and share metadata. |
| `public/creator-workspace.png`, `docs/image-provenance.md` | Generated editorial image, isolated from real video previews. |
| `.env.example`, `.gitignore`, `netlify.toml`, `README.md`, this file | Setup, secret exclusion, deployment guide and report. |

## Validation status

Verified locally on 2 November 2026:

| Check | Result |
| --- | --- |
| `npm test` | **81 passed**, 10 unit/component files. URL/host allowlisting, redirects, DNS pinning, private-address rejection, response/stream limits, compressed-header rejection, upload signatures/limits/attestation, access checks, availability honesty, origin/body validation, and form behavior. |
| `npm run lint` | **Passed**, no warnings/errors. |
| `npm run typecheck` | **Passed**, strict TypeScript. |
| `npm run build` | **Passed**, Next.js 16.4.3 production build; 20 static pages generated plus dynamic API/auth/library routes. |
| `npm run test:e2e` | **10 passed**, desktop and mobile-sized Chromium/Edge; **2 live creator runs skipped** because Supabase is not configured. Light/dark screenshots inspected, no horizontal overflow, real editorial image loaded. |
| `npm run test:integration` | **7 skipped** because no disposable Supabase credentials were supplied. RLS/Storage behavior is implemented and tested by the opt-in suite, but is **not live-verified** here. |
| `npm audit --omit=dev --json` | **0 runtime vulnerabilities** at the time of checking. |
| Full dependency audit | **16 moderate development-tool findings**, rooted in a minimatch glob-amplification advisory through the ESLint chain. No high/critical findings. The tool suggested incompatible major downgrades; these were not applied. |
| GitHub/Netlify deployment | **Not executed**; no remote/account credentials connected. Config and exact setup instructions are included. |
| Real hardware, Safari, playable movie fixture, auth delivery, SMTP and account deletion | **Not verified**; these require configured services/devices and an operator. |

The restricted Windows sandbox blocked Turbopack's local compiler socket and browser-to-preview connections. Build/browser verification succeeded when run with the required local execution permissions; no application-level workaround or adapter was introduced.

The public availability browser case uses a clearly labeled intercepted API fixture. Live tests are conditional and skips do not establish security against a deployed project. The MP4 fixture is deliberately synthetic and tests signature/transport, not codec playback.

Screenshots from the browser suite: `test-results/home-desktop.png`, `home-dark-desktop.png`, `home-mobile.png`, `home-dark-mobile.png` (ignored generated artifacts).

Audit reference: [minimatch globparts amplification advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249). These build/lint tools process repository-controlled patterns, not submitted TikTok URLs. Review updates before launch; the full dependency tree is not claimed advisory-free.

## Manual configuration and limitations

1. Supply Supabase URL/browser key/server key and rate-limit secret locally or in Netlify, apply the migration, configure email/SMTP and callbacks.
2. Run opt-in live RLS, private Storage, overwrite-prevention, full upload/download, and auth acceptance against a disposable project. Test real video bytes and signed-link expiry.
3. Configure a contact address, operator/legal details, maintenance schedule, retention/versioning, quota alerts and moderation workflow before a public launch.
4. Create/connect GitHub and Netlify, deploy, and verify the platform's runtime and IP header behavior. No hosted deployment is claimed.
5. One uploaded original per video; no transcoding, distinct HD rendition, watermark removal/detection, TikTok identity/ownership verification, Google OAuth, or deep codec/media inspection. Public metadata can be unavailable independently of an authorized original.
6. Mobile-sized Chromium tests are not real Android/iOS device certification. Cross-browser and real-device acceptance remain manual.

## Multi-platform update — 2 November 2026

- 120 unit/component cases, lint and typecheck pass; the original 118-case suite and 10 desktop/mobile browser checks also passed before the final YouTube error-message test was added.
- Production compiled with `next build --webpack`; local Turbopack could not launch its CSS worker. Netlify successfully deployed the normal production build.
- Live Facebook Reel supplied by the user: resolver HTTP 200, media HTTP 200, 2,996,438 bytes, MP4 ftyp signature.
- Live TikTok regression: resolver HTTP 200, media HTTP 200, 9,082,495 bytes, MP4 ftyp signature.
- YouTube resolver is enabled, but a live public-video probe returned `error.api.youtube.login` from Cobalt. No login cookies, CAPTCHA bypass, or restriction bypass added. UI explains sign-in-required responses. Other enabled platforms are validated/routed in tests but have not all had real download checks.
- Default dark theme and explicit light preference persistence verified on desktop/mobile. Three user-marked UI items removed.

## Historical YouTube Apify integration — 2 November 2026 (removed 3 November)

- 129 unit/component tests, lint, strict typecheck, and `next build --webpack` pass.
- Apify cloud run `BfVIIHZvQhaTdablf` delivered the user's `bTsGuYRerK8` video at 720p in 13 seconds for $0.040. The 7.1 MB MP4 passed a full FFmpeg video/audio decode.
- Integration uses a production-only Netlify secret, one fixed actor, a $0.10 per-run cap, a provider-required 300-second runtime ceiling with separate signed status polling, no residential fallback, no cookies, and no billed retries. Tests cover output URL validation, response bounds, quota errors, signed-job tampering, and routing/rate limits.
- Free credits are shared by every visitor; unlimited availability, long videos, and all YouTube content are not guaranteed. Five-minute UI availability does not delete Apify storage.
- Live deployment `b4fbc28`: the user's YouTube link returned a signed processing job, then a ready 720p result through the status endpoint. The complete 7,496,624-byte MP4 passed a full FFmpeg video/audio decode. Missing origin returned 403; a forged job returned 400. Download transfer was slow on the test connection and the media host did not support resuming byte ranges.
- The initial 45-second actor timeout failed its 300-second preflight requirement. A synchronous follow-up suffered interrupted server responses; separate signed polling now keeps requests short. Temporary deployment diagnostics were removed. Browser UI interaction could not be rechecked because browser control remained disabled; the public API-to-file path was tested directly.

## YouTube removal — 3 November 2026

- Removed YouTube URL support, the Apify resolver and polling endpoint, polling UI, provider configuration instructions, and YouTube claims from page content and metadata at the user's request. Other platform routes and theme preferences are retained.
- 119 tests pass, including rejection of YouTube links before any downloader call; strict typecheck and lint pass.
- Fixed dark theme requested afterward: removed the switch, theme observation, and saved-preference script. Desktop/mobile homepage checks pass with a preexisting light preference and after reload; typecheck and lint pass.

## Photo downloads — 3 November 2026

- Public TikTok photo links and safe short-link redirects can resolve to photo-only collections; the creator upload association remains video-only. Picker items must use unexpired tunnels at the configured backend. Each image has its own save button.
- Successful ready results clear the input; errors and unavailable results keep it for retry. The original post URL remains in the result for copying.
- The user photo post returned 15 images from the live backend. One 153,774-byte photo downloaded and passed FFmpeg decode.

## Installable app, document tools and vector design — 3 November 2026

- Added an installable manifest with generated PNG/maskable/Apple icons, a browser install prompt with manual fallback instructions, and a privacy-limited offline service worker. Browser checks confirm Cache Storage contains only the generic offline page and offline navigation displays it.
- Added client-only PDF → editable-text DOCX, DOCX → flattened PDF, and a PDF annotation/page editor under `/tools`. See `document-tools.md` for format, privacy and size limits. The homepage remains the downloader.
- The user's PDF reference and explicit light-palette approval replace the earlier dark-only direction. Added original SVG illustrations, lavender surfaces, flat purple/yellow/mint/pink colors, outlined controls and hard shadows across the site.
- 127 unit/component tests pass; strict typecheck and lint pass; the Next.js webpack production build passes. All 20 desktop/mobile browser acceptance cases pass against the production build. Generated DOCX XML contains source text; rendered Word PDFs contain visible content; saved annotation text survives PDF export; drawn signatures export successfully. Production dependency audit reports zero vulnerabilities.
- Earlier development-only failures were corrected test-origin configuration, a stale dark-theme assertion, and a hot-reload interruption; final production checks pass. Physical Android/iOS installation and complex third-party document fidelity remain manual checks. OCR, direct editing of existing paragraphs, legacy DOC input and selectable text in Word-generated PDFs are not included.
- Netlify published `00cb5e1`. All six live desktop/mobile conversion/editor cases and both live homepage cases pass. Manifest, service worker, PDF worker and license assets return HTTP 200 with correct content types. Live preview screenshots are saved locally under `.local/tiksave-vector-live-desktop.png` and `.local/tiksave-vector-live-mobile.png`.
