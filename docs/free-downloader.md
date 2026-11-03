# Free local link downloader

TikSave now supports a separately running, self-hosted [Cobalt API](https://github.com/imputnet/cobalt). Visitors paste a TikTok URL and download the returned MP4 without registration, uploads, or a paid API subscription. MP4 bytes go directly from Cobalt to the browser; Next.js and Netlify do not proxy the movie.

This is a deliberate change from the original uploads-only resolver. Cobalt retrieves media exposed by public TikTok web pages; it is **not an official TikTok API**. It does not independently verify copyright ownership, and this integration does not certify an unwatermarked original. Use only content you have permission to download. There is no authentication, CAPTCHA, age, or private-post bypass added here.

## Current local setup

Upstream source is installed at `.local/cobalt`, ignored by Git and excluded from application lint/TypeScript. Tested revision: `a636575b09de1fc55d9b8cd98cac88f5f2f16b42`, Cobalt 11.7.1. The upstream source is unmodified; only its local workspace build approval/configuration files differ. Its required FFmpeg and isolated-vm install scripts were approved; unused optional syscall-napi was disabled.

The API listens only at `127.0.0.1:9000`, only TikTok is enabled, and video duration is limited to five minutes. It uses no TikTok login cookies or paid service. `.env.local` contains `COBALT_API_URL=http://127.0.0.1:9000/`.

Run two terminals:

```powershell
# Terminal 1, from C:\TiktokDownloader
npm run dev:downloader
# Terminal 2, from C:\TiktokDownloader
npm run dev
```

Open `http://localhost:3000`. Both processes must remain running. Download links expire quickly; check the link again to obtain a new one. The supplied test video was retrieved as a real 9,082,495-byte MP4; FFmpeg decoded a frame and reported H.264, 1280×720. This establishes this sample's retrieval/playability, not universal availability or watermark absence. One request failed transiently before subsequent requests succeeded; provider/TikTok failures are surfaced rather than replaced with fake links.

## Recreate the backend on another machine

Install Node 22/24, Git, and pnpm, then run from the project root:

```powershell
git clone https://github.com/imputnet/cobalt.git .local/cobalt
git -C .local/cobalt checkout a636575b09de1fc55d9b8cd98cac88f5f2f16b42
pnpm --dir .local/cobalt --filter '@imput/cobalt-api...' install --frozen-lockfile
# With pnpm 11, if it reports ignored build scripts:
pnpm --dir .local/cobalt approve-builds ffmpeg-static isolated-vm '!syscall-napi'
Copy-Item scripts/cobalt.env.example .local/cobalt/api/.env
# Set COBALT_API_URL=http://127.0.0.1:9000/ in .env.local, then start both processes.
```

Do not run the installer concurrently with another package installation. The app's npm dependencies and the backend's pnpm dependencies are separate.

## Tests

```powershell
npm test
npm run lint
npm run typecheck
# Optional real-network browser test; use your own permitted video link.
$env:RUN_COBALT_TEST='1'
$env:COBALT_TEST_URL='https://vt.tiktok.com/YOUR_LINK/'
npm run test:e2e -- --project desktop --grep 'LIVE anonymous'
```

Unit tests cover fixed backend configuration, tunnel origin/path/expiry validation, invalid responses, response-byte limits and production loopback rejection. The live browser test uses a real network response and real downloaded MP4, not a mock.

## Hosting limit

The software has no API subscription fee. **No free public backend hosting has been provisioned or promised.** A Netlify deployment cannot reach the developer computer's loopback address; the app deliberately rejects that configuration in production. A public website needs a continuously available HTTPS Cobalt instance under your control or with the instance owner's permission, plus abuse protection, bandwidth planning, and maintenance. Do not use another public Cobalt instance without permission or bypass its bot protection. See [upstream hosting](https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md) and [API access rules](https://github.com/imputnet/cobalt/blob/main/docs/api.md).

For Cobalt downloads, only the configured backend origin and its short-lived `/tunnel` URLs are returned to browsers. Arbitrary returned URLs and external redirect responses are rejected. URL validation, safe short-link resolution, mutation-origin checks and rate limiting still apply.

## Attribution

Cobalt by imput is licensed under [AGPL-3.0](https://github.com/imputnet/cobalt/blob/main/LICENSE). Its source is available at the pinned revision above. Retain attribution and review the upstream license obligations for any redistribution, modification, or public deployment. FFmpeg and other upstream dependencies have their own licenses. Local source/configuration stays separate from TikSave's deployment archive.

## Multi-platform update

The public form accepts TikTok, public Facebook videos/Reels, Instagram videos/Reels, X, Vimeo, Reddit, Bluesky, Dailymotion, Pinterest videos, Twitch clips, and Streamable. Exact HTTPS hosts are allowlisted; the app contacts only the configured Cobalt backend for non-TikTok links. TikTok short-link safety and the optional TikTok creator library are unchanged. Albums, slideshows, playlists, and audio-only responses are not included. The backend requests up to 1080p H.264 MP4 for compatibility; the five-minute duration limit remains. Availability varies by platform and hosting network. Do not use login cookies or bypass access restrictions.

Dark is the default theme; an explicit saved light preference is retained.
