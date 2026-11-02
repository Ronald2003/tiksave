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
