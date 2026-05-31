# Nesty Console

Nesty Console is a separate frontend/admin project for operating a running `NestyAI Gateway`.

Current status: **v0.3.0 - NestyChat Web MVP**

Changelog: [CHANGELOG.md](CHANGELOG.md)

## Relationship to NestyAI Gateway

- `NestyAI` is backend-only and runs separately.
- `NestyConsole` is a Next.js admin UI that calls the gateway through server-side API routes.
- Internal/admin gateway tokens stay on the server side of `NestyConsole`.
- Chat UI (`/chat`) also calls Gateway through server-side Console routes.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- lucide-react icons

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create local env file:

```bash
copy .env.local.example .env.local
```

3. Set required values:

- `NESTY_GATEWAY_URL` (optional fallback if not saved in UI)
- `NESTY_API_KEY` (optional fallback)
- `NESTY_INTERNAL_ADMIN_TOKEN` (recommended stable fallback)
- `NESTY_CONSOLE_CREDENTIALS_SECRET` (required to save encrypted secrets in UI)
- `NESTY_CONSOLE_ADMIN_USERNAME` (default `admin`)
- `NESTY_CONSOLE_ADMIN_PASSWORD` (required for login)
- `NESTY_CONSOLE_SESSION_SECRET` (required for signed session cookie)

4. Run dev server:

```bash
pnpm run dev
```

## Security Notes

- Never expose `NESTY_INTERNAL_ADMIN_TOKEN` to browser/client components.
- Never expose `NESTY_API_KEY` to browser/client components.
- Never expose `NESTY_CONSOLE_ADMIN_PASSWORD` or `NESTY_CONSOLE_SESSION_SECRET` to browser/client components.
- Browser pages should call same-origin routes (`/api/gateway/*`) only.
- Chat page uses `/api/chat/completions`, which forwards to Gateway server-side.
- Internal gateway calls must run in Next.js server routes or server actions only.
- Gateway credentials are stored server-side in `data/nesty-console.db`.
- Gateway API key and internal admin token are encrypted at rest with AES-256-GCM.
- Console login uses signed HTTP-only cookie sessions (`sameSite=lax`, `secure` in production).
- Do not commit real `.env.local` values.
- `NESTY_CONSOLE_CREDENTIALS_SECRET` should be long and random.

## Credential Priority

For all Gateway proxy calls, Nesty Console resolves credentials in this order:

1. Stored server-side credentials (encrypted in SQLite)
2. Environment fallback values
3. If missing, structured `credentials_not_configured` error

This allows smooth use with ephemeral Console keys that rotate when Gateway restarts.

## Ephemeral Key Flow

Recommended flow for Pterodactyl/container-panel deployments:

1. Start Gateway and copy the temporary `nsk_console_...` key from startup logs.
2. Open `Settings -> Gateway Credentials`.
3. Paste the key and save.
4. If Gateway restarts and rotates the key, Console will show invalid/expired key warnings. Update with the new key.

## Internal Admin Token

- Stable env token is recommended (`NESTY_INTERNAL_ADMIN_TOKEN`).
- You can also override/update it in `Settings -> Gateway Credentials`.
- Token value is never returned to browser JavaScript.

## Credentials Manager API

- `GET /api/console/gateway-credentials`: safe metadata only
- `POST /api/console/gateway-credentials`: save URL/keys/enabled flag (no secret echo)
- `POST /api/console/gateway-credentials/test`: verifies `/health`, `/ready`, `/v1/models` and optional internal probe

## Chat API

- `POST /api/chat/completions`: forwards chat requests to `NestyAI /v1/chat/completions`.
- Supports non-stream and SSE streaming responses.
- Maps missing/invalid Gateway credentials to safe Console-friendly error responses.

## Admin Auth API

- `POST /api/auth/login`: create signed admin session cookie
- `POST /api/auth/logout`: clear session cookie
- `GET /api/auth/me`: current auth status
## Implemented in v0.3.0

- Console shell layout (sidebar + topbar)
- Single-admin login page (`/login`)
- Route protection middleware for pages and admin APIs
- Logout controls in topbar and sidebar
- Protected chat page (`/chat`) with model selector and core chat options
- Server-side chat proxy route (`POST /api/chat/completions`) with streaming support
- Dashboard landing page
- Gateway status page (`/status`)
- Models page (`/models`)
- Settings page (`/settings`) with safe config-state display
- Gateway Credentials Manager page (`/settings/gateway`)
- Encrypted server-side credential storage (`data/nesty-console.db`)
- Server-side proxy routes:
  - `GET /api/gateway/health`
  - `GET /api/gateway/ready`
  - `GET /api/gateway/models`

## Secret Generation Helper

Generate strong random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Ops Warning

This project is single-admin and self-host focused. Keep reverse-proxy protection in place and avoid exposing admin
surfaces publicly without strict network controls.

## Roadmap

- v0.4.0 Diagnostics/Admin tooling
- v0.5.0 Runtime Model Config Admin
- v0.6.0 Conversations/Memory operations
