# TikSave: public deployment tutorial (free demo)

Keep this file open so you can finish without more chat. Your website needs **Netlify for the Next.js app**, **Render for the continuously running Cobalt backend**, and your **existing Supabase project for request rate limiting**. Visitors do not need accounts. No paid service is required by these instructions; if a Free option is unavailable, stop rather than selecting a paid plan.

This is a public hobby/demo deployment, not a promise of reliable zero-cost production. Render Free sleeps after inactivity and may suspend services for traffic/usage limits. TikTok can reject requests from a hosted datacenter even when the same link worked on your computer. These hosted behaviors have not been tested in your accounts.

## 1. Put the website on GitHub

1. Sign in at https://github.com and create a **new private repository** named `tiksave`. Leave the README, license, and gitignore initialization options unchecked.
2. Open PowerShell in `C:\TiktokDownloader`. Run:

```powershell
git init
git add .
git commit -m "Build TikSave"
git branch -M main
git remote add origin https://github.com/Ronald2003/tiksave.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME`. Sign in to GitHub if prompted. If Git asks for author identity, set it locally with `git config user.name "Your Name"` and `git config user.email "YOUR_GITHUB_EMAIL"`, then retry the commit/push. If a remote already exists, inspect it with `git remote -v` instead of adding it again.

The included `.gitignore` excludes `.env.local`, `.local`, `node_modules`, and `.next`. **Do not manually upload these folders/files or your keys.** Upload source and `package-lock.json`, not a ZIP of the running folder. The separate backend source is not needed in this repository because Render will use Cobalt's official container image.

## 2. Generate a private backend key

In PowerShell run:

```powershell
node -e "console.log(require('node:crypto').randomUUID())"
```

Save the UUID privately. Below, `YOUR_GENERATED_UUID` means that exact UUID, not the literal placeholder. It will be shared between Render and Netlify server settings. Never prefix this key with `NEXT_PUBLIC_` or paste it into chat.

## 3. Deploy Cobalt on Render

1. Sign in at https://dashboard.render.com.
2. Choose **New → Web Service → Existing Image**. Use:

```text
ghcr.io/imputnet/cobalt:11
```

This is the upstream Cobalt image, not your Next.js repository. Connect the image, name the service (e.g. `yourname-tiksave-api`), choose an available region, and select the **Free** compute plan. Keep the image's default start command. Use `/` as the health-check path if asked.

3. Add these environment variables. `API_URL` must be your service's actual HTTPS `onrender.com` URL with a trailing slash. If the URL is not shown until the first deployment, enter it immediately afterward in Environment and redeploy; do not test downloads before correcting it.

| Key | Value |
| --- | --- |
| `API_URL` | `https://YOUR-RENDER-SERVICE.onrender.com/` |
| `API_PORT` | `10000` |
| `API_LISTEN_ADDRESS` | `0.0.0.0` |
| `CORS_WILDCARD` | `0` |
| `CORS_URL` | Your Netlify website origin, added in step 5 |
| `DURATION_LIMIT` | `300` |
| `API_AUTH_REQUIRED` | `1` |
| `API_KEY_URL` | `file:///etc/secrets/keys.json` |
| `DISABLED_SERVICES` | `bilibili,loom,ok,newgrounds,rutube,snapchat,soundcloud,tumblr,vk` |

Do not copy the local `127.0.0.1` settings to Render. Do not configure login cookies or additional services. The current source has been tested at Cobalt 11.7.1; the `:11` image tag can change within that major version, so record the deployed image digest for repeatability.

4. Under **Environment → Secret Files**, add a file called `keys.json`. Paste:

```json
{
  "YOUR_GENERATED_UUID": {
    "name": "TikSave website",
    "limit": 20,
    "allowedServices": ["tiktok", "youtube", "facebook", "instagram", "twitter", "vimeo", "reddit", "bsky", "dailymotion", "pinterest", "twitch", "streamable"]
  }
}
```

Replace the placeholder with your generated UUID, keeping the double quotes. Do not use a key from documentation examples. Render mounts this file at `/etc/secrets/keys.json`; Cobalt loads it via `API_KEY_URL`.

5. Deploy, or save and redeploy if you added the secret file after initial service creation. Check Logs for successful startup and API-key loading. If it cannot load `keys.json`, fix the file/path rather than disabling authentication.
6. Visit your Render URL in the browser. Wait until it shows Cobalt's JSON status. Copy this HTTPS URL for Netlify. The status route works without your API key; requests that create download links require it.

## 4. Deploy the website on Netlify

1. Sign in at https://app.netlify.com with GitHub.
2. Choose **Add new project → Import an existing project → GitHub** and select `tiksave`, branch `main`.
3. Confirm **build command** `npm run build`, **publish directory** `.next`, and **Node version** `22`. The included `netlify.toml` provides these. Let Netlify manage its Next.js integration. Do not choose static export or drag-and-drop deployment.
4. Add the following environment variables in Netlify. Copy the existing Supabase/rate-limit values from your local `.env.local` **into Netlify settings only**. Add the Cobalt UUID from step 2. Make server secrets available to Functions; public variables also need the build environment.

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Your actual HTTPS Netlify website origin, without a trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nlqafmaiybthslpsdvtp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key already saved locally |
| `SUPABASE_SERVICE_ROLE_KEY` | The server-only `sb_secret_...` value already saved locally |
| `RATE_LIMIT_SECRET` | The existing random value from `.env.local` |
| `COBALT_API_URL` | Your actual HTTPS Render URL, with trailing slash |
| `COBALT_API_KEY` | Your generated UUID, without JSON or quotes |
| `CONTACT_EMAIL` | A real support/privacy email address you monitor |

Keep secret values marked secret where supported. Do not add `RUN_SUPABASE_TESTS`, `RUN_COBALT_TEST`, `.env.local`, or local Cobalt URLs to production. Do not expose production credentials to untrusted pull-request previews.

5. Deploy. If Netlify only reveals the final site URL after this first deploy, copy it into `NEXT_PUBLIC_SITE_URL` and trigger another deployment. The second build is necessary: public settings are embedded at build time. Do not test downloads until the site origin matches the browser address exactly.
6. A successful deployment gives you a public `https://...netlify.app` website. Git pushes to `main` trigger future deployments. This step publishes your website; the tutorial itself has not published anything.

## 5. Connect the final domains

1. In Render's Environment settings, set `CORS_URL` to your exact Netlify website origin, e.g. `https://YOUR-SITE.netlify.app` (no path or trailing slash). Save and redeploy.
2. Confirm Render `API_URL` is its own public backend URL, while Netlify `COBALT_API_URL` points to that same backend URL. Neither may contain `localhost` or `127.0.0.1`.
3. In Supabase Authentication → URL Configuration, replace Site URL with the Netlify website origin. Add exact production redirect entries `/auth/callback`, `/auth/confirm`, and `/auth/callback?next=/auth?mode=update` under that origin if you keep the optional creator features. Public visitors do not need to use those features. Local redirect entries may remain for development.

If you later attach a custom domain, update Netlify's site URL, Render's CORS origin, and Supabase's optional auth URLs, then rebuild/redeploy.

## 6. Test before sharing widely

1. Open the Render backend URL and wait for JSON. Render Free can take about a minute to wake. TikSave's provider request timeout is shorter, so the first website attempt after sleep can fail; let the backend wake and retry. Do not add an anti-sleep ping service.
2. Open `https://YOUR-SITE.netlify.app/api/health`. It should show `{"data":{"status":"ok"}}`. This is only website liveness, not a backend readiness guarantee.
3. Open the homepage in a private/incognito window. Paste a public TikTok video link you have permission to download, click Download, then Download MP4. There must be no visitor account requirement. Confirm the downloaded file plays and is the expected video.
4. Test an invalid URL, an expired download link, mobile layout, and a fresh download after the backend has been asleep.
5. Review usage dashboards and keep paid upgrades/automatic overage spending disabled. If Free is unavailable or requires billing you do not want, stop; do not enter payment details just to continue this guide.
6. Review contact/legal details and retain Cobalt attribution/license information before public promotion. Keep optional creator/RLS acceptance separate; those live tests remain unverified.

## Quick fixes

| Problem | Check |
| --- | --- |
| Page loads, every request gets `invalid_origin` | `NEXT_PUBLIC_SITE_URL` must exactly match the browser origin; rebuild Netlify. |
| Website is still calling localhost | Correct `COBALT_API_URL` in Netlify, then redeploy. |
| Backend authorization error | UUID in Render `keys.json` must equal Netlify `COBALT_API_KEY`; check key-loading logs. |
| `provider_configuration` | Use HTTPS with a root backend URL and no query, credentials, or path. |
| Backend offline shortly after inactivity | Visit backend root, wait for JSON, then retry. Free cold starts can exceed the app timeout. |
| Backend is up but TikTok fetch fails | Try another permitted public post once. Datacenter IP restrictions and TikTok page changes can break extraction. Do not add restriction-bypass cookies/proxies. This deployment has not been proven on Render. |
| API works but download fails | Check public `API_URL`, HTTPS, expiry, Render logs, and remaining bandwidth. |
| Netlify protection/database errors | Verify Supabase migration and server key, rate-limit secret (32+ characters), and Functions environment scope. |
| Build fails because a local backend folder is included | `.local/` must stay ignored; deploy the Next.js repository only. |
| Free bandwidth exhausted, process out of memory, or host suspended service | Stop sharing/disable the service. This guide does not promise a free production remedy. |

## Verified references

- Render image deployment: https://render.com/docs/deploying-an-image
- Render free-tier limits: https://render.com/docs/free
- Render secret files: https://render.com/docs/configure-environment-variables#secret-files
- Upstream image: https://github.com/imputnet/cobalt/blob/main/docs/examples/docker-compose.example.yml
- Upstream API-key configuration: https://github.com/imputnet/cobalt/blob/main/docs/protect-an-instance.md
- Netlify Next.js integration: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/

Verified locally: a real anonymous TikTok-link download, unit tests, and a Next.js production build. **Not verified: this Render/Netlify deployment, hosted TikTok reachability, or reliable free public operation.** Render describes its Free plan as suitable for hobbies/previews, not production, and may suspend unusually high outbound traffic. Video downloads can consume allowances quickly; adding a payment method can change how overages are handled. Review each host's current settings before publishing.
