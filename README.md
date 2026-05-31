# Nesty Console

Nesty Console is a separate frontend/admin project for operating a running `NestyAI Gateway`.

Current status: **v0.2.0 - Gateway Credentials Manager**

## Relationship to NestyAI Gateway

- `NestyAI` is backend-only and runs separately.
- `NestyConsole` is a Next.js admin UI that calls the gateway through server-side API routes.
- Internal/admin gateway tokens stay on the server side of `NestyConsole`.

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

4. Run dev server:

```bash
pnpm run dev
```

## Security Notes

- Never expose `NESTY_INTERNAL_ADMIN_TOKEN` to browser/client components.
- Never expose `NESTY_API_KEY` to browser/client components.
- Browser pages should call same-origin routes (`/api/gateway/*`) only.
- Internal gateway calls must run in Next.js server routes or server actions only.
- Gateway credentials are stored server-side in `data/nesty-console.db`.
- Gateway API key and internal admin token are encrypted at rest with AES-256-GCM.
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
- Do not commit real `.env.local` values.

## Implemented in v0.2.0

- Console shell layout (sidebar + topbar)
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

## Ops Warning

This project does not yet include a full web auth system. Do not expose Nesty Console directly to the public internet
without reverse-proxy protection and access control.

## Roadmap

- v0.3.0 NestyChat Web MVP
- v0.4.0 Runtime Model Config Admin
- v0.5.0 Diagnostics dashboard
- v0.6.0 Conversations/Memory operations
