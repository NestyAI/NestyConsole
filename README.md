# Nesty Console

Nesty Console is a separate frontend/admin project for operating a running `NestyAI Gateway`.

Current status: **v0.6.1 - Console UX Hardening & Runtime QA**

Changelog: [CHANGELOG.md](CHANGELOG.md)

## Relationship to NestyAI Gateway

- `NestyAI` is backend-only and runs separately.
- `NestyConsole` is a Next.js admin UI that calls the gateway through server-side API routes.
- Internal/admin gateway tokens stay on the server side of `NestyConsole`.
- Chat UI (`/chat`) also calls Gateway through server-side Console routes.
- `/chat` supports `conversation_id` handling returned by Gateway.
- `/chat` can list and reopen Gateway conversations via server-side Console routes.
- Console can view Gateway provider diagnostics via server-side internal proxy routes.
- Console can view effective runtime model config and safely edit provider chain overrides via server-side internal proxy routes.
- Console can search, inspect, export, summarize, clear, and manage Gateway conversations via server-side proxy routes.
- Memory controls are handled through protected server-side routes.
- Semantic recall testing uses internal admin routes and requires Internal Admin Token.
- Gateway credentials remain server-side only.

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
- Chat UI preferences are saved locally in browser storage (non-secret fields only).
- Conversation list/detail/messages are loaded through server-side Console routes only.
- Internal diagnostics requests are routed through Console server-side API routes only.
- Internal gateway calls must run in Next.js server routes or server actions only.
- Internal Admin Token remains server-side only.
- Gateway credentials are stored server-side in `data/nesty-console.db`.
- Gateway API key and internal admin token are encrypted at rest with AES-256-GCM.
- Console login uses signed HTTP-only cookie sessions (`sameSite=lax`, `secure` in production).
- Do not commit real `.env.local` values.
- `NESTY_CONSOLE_CREDENTIALS_SECRET` should be long and random.
- All Gateway calls go through server-side Console routes.
- Gateway credentials and internal admin tokens must never be exposed to browser JavaScript.

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

## Diagnostics Usage

Enable Gateway internal admin:

```env
INTERNAL_ADMIN_ENABLED=true
NESTY_INTERNAL_ADMIN_TOKEN=<your-token>
```

In Console, configure the same token via env fallback or `Settings -> Gateway Credentials`.
If needed, enable:

```env
NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN=true
```

Then visit `/diagnostics`.

## Model Config Admin Usage

Gateway must have:

```env
INTERNAL_ADMIN_ENABLED=true
NESTY_INTERNAL_ADMIN_TOKEN=<your-token>
```

Console must have the same token configured through environment fallback or `Settings -> Gateway Credentials`.
If needed, enable:

```env
NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN=true
```

Then visit `/model-configs`.

## Memory & Conversation Management Usage

- Configure Gateway URL and API key in environment fallback or `Settings -> Gateway Credentials`.
- Visit `/memory` to search conversations, inspect messages, export snapshots, summarize, clear, and reset summary.
- Message memory controls (`memory_pinned`, `memory_excluded`, `memory_tags`) are sent through protected server-side routes only.
- Semantic recall testing uses internal admin proxy route and requires:
  - `INTERNAL_ADMIN_ENABLED=true` on Gateway
  - `NESTY_INTERNAL_ADMIN_TOKEN=<your-token>` on Gateway and Console
  - Optional: `NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN=true`

## Runtime QA Checklist

Required environment variables:

- `NESTY_CONSOLE_ADMIN_USERNAME`
- `NESTY_CONSOLE_ADMIN_PASSWORD`
- `NESTY_CONSOLE_SESSION_SECRET`
- `NESTY_CONSOLE_CREDENTIALS_SECRET`

Core checks:

- Login and logout flow works.
- Gateway credential test works from `Settings -> Gateway Credentials`.
- Chat streaming/non-stream responses work.
- Conversation sidebar list/open/refresh works.
- Diagnostics dashboard loads and warning states are readable.
- Model Config admin loads and reset/update actions work.
- Memory page search/detail/actions and message memory controls work.
- Internal admin token warnings appear when missing/invalid.
- Invalid/expired Gateway API key behavior is clear and actionable.
- Protected API behavior returns 401 when unauthenticated.

Security checks:

- `/api/gateway/models` returns 401 before login.
- `/api/internal/diagnostics/provider-health/summary` returns 401 before login.
- No secret values are displayed in UI/debug/raw detail sections.
- Semantic recall test output does not expose raw vectors/embeddings.

## Credentials Manager API

- `GET /api/console/gateway-credentials`: safe metadata only
- `POST /api/console/gateway-credentials`: save URL/keys/enabled flag (no secret echo)
- `POST /api/console/gateway-credentials/test`: verifies `/health`, `/ready`, `/v1/models` and optional internal probe

## Chat API

- `POST /api/chat/completions`: forwards chat requests to `NestyAI /v1/chat/completions`.
- Supports non-stream and SSE streaming responses.
- Maps missing/invalid Gateway credentials to safe Console-friendly error responses.
- Preserves useful response metadata when available (for compact chat details display).

## Admin Auth API

- `POST /api/auth/login`: create signed admin session cookie
- `POST /api/auth/logout`: clear session cookie
- `GET /api/auth/me`: current auth status
## Implemented in v0.6.1

- Console shell layout (sidebar + topbar)
- Single-admin login page (`/login`)
- Route protection middleware for pages and admin APIs
- Logout controls in topbar and sidebar
- Protected chat page (`/chat`) with model selector and core chat options
- Server-side chat proxy route (`POST /api/chat/completions`) with streaming support
- Conversation-aware chat flow with automatic `conversation_id` tracking
- Chat controls: New Chat, Clear Messages, Copy Message, Copy Transcript, Retry Last
- Local persistence for non-secret chat UI preferences
- Lightweight conversation sidebar with list/open/refresh/search basics
- Conversation actions: rename, archive, delete (best-effort based on Gateway support)
- Diagnostics dashboard MVP (`/diagnostics`) for provider health and reliability visibility
- Runtime Model Config Admin (`/model-configs`) for safe provider chain override editing
- Memory & Conversation Management (`/memory`) for conversation search/export/summarize/clear and message memory controls
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
  - `GET /api/gateway/conversations`
  - `GET /api/gateway/conversations/{conversation_id}`
  - `GET /api/gateway/conversations/{conversation_id}/messages`
  - `GET /api/gateway/conversations/search`
  - `GET /api/gateway/conversations/{conversation_id}/export`
  - `POST /api/gateway/conversations/{conversation_id}/summarize`
  - `POST /api/gateway/conversations/{conversation_id}/clear`
  - `POST /api/gateway/conversations/{conversation_id}/reset-summary`
  - `PATCH /api/gateway/conversations/{conversation_id}/messages/{message_id}/memory`
  - `GET /api/gateway/conversations/memory-controls`
  - `PATCH /api/gateway/conversations/{conversation_id}`
  - `DELETE /api/gateway/conversations/{conversation_id}`
  - `GET /api/internal/diagnostics/provider-health/summary`
  - `GET /api/internal/diagnostics/provider-health/latest`
  - `GET /api/internal/diagnostics/provider-health`
  - `POST /api/internal/diagnostics/provider-health/check`
  - `GET /api/internal/model-configs`
  - `GET /api/internal/model-configs/{model_alias}`
  - `PATCH /api/internal/model-configs/{model_alias}`
  - `POST /api/internal/model-configs/{model_alias}/reset`
  - `POST /api/internal/embeddings/recall-test`

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
- v0.7.0 Analytics and operational insights (planned)
- Full provider marketplace and enterprise configuration workflows are planned for a later version if needed.
