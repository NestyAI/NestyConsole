<p align="center">
  <img src="public/NestyAI_Full.svg" alt="Nesty Console" width="560" />
</p>

# Nesty Console

Nesty Console is a separate frontend/admin project for operating a running `NestyAI Gateway`.

Current status: **v0.9.0 - Product UI Rebuild**

Changelog: [CHANGELOG.md](CHANGELOG.md)

v0.9.0 adds:
* Calmer premium product design system (graphite surfaces, restrained accents, reduced neon/glow).
* Refreshed shell, shared UI primitives, form controls, and major page surfaces.
* Fixed native select/dropdown readability (dark closed state, readable options, consistent focus).
* Product behavior unchanged — Gateway proxy boundaries, chat streaming, credentials, and workspace context injection are preserved.
* Root-level Cursor skills remain shared workspace tooling and are not part of the Nesty Console runtime.

v0.8.8 adds:
* Fixed chat page scroll-to-top when sending messages or during streaming.
* Message panel now scrolls within its container; page position stays stable.
* Near-bottom guard preserves manual scroll-up while reading history.
* URL sync uses `scroll: false` to avoid Next.js scroll reset on conversation/workspace param updates.

v0.8.7 adds:
* Workspace linked conversation rows copy absolute app URLs (`window.location.origin` + `/chat?...`).
* Chat status row Copy Link for the active conversation (includes workspace ID when active; `useWorkspaceContext=1` only when context is enabled).
* Copied links contain only workspace and conversation IDs — no secrets or conversation content.
* Optional keyboard navigation on the Workspace list (Arrow Up/Down, Home, End).
* Bounded deep-link conversation title refresh (up to 100 conversations, once per ID per session, silent failure).
* Gateway credentials remain server-side only; workspace context remains opt-in and transient.

v0.8.6 adds:
* Controlled GSAP motion for `/workspaces` and the Chat workspace panel (list stagger, selection glow, panel entrance, context preview fade, pin flash, notice pop-in).
* Reduced-motion guards on all GSAP paths; CSS/Tailwind fallback when `prefers-reduced-motion: reduce`.
* GSAP is UI-only for Workspace surfaces — workspace CRUD, import/export, deep links, context injection, and chat streaming behavior are unchanged.
* Root-level Cursor skills are shared workspace tooling and are not part of the Nesty Console runtime.

v0.8.5 adds:
* Premium Neural Noir UX polish for `/workspaces` and the Chat workspace panel.
* Improved visual hierarchy for pinned vs unpinned notes, linked conversation rows, and import/export.
* Subtle CSS/Tailwind micro-interactions, responsive layout, and accessibility improvements (keyboard focus, aria-live notices).
* Workspace Hub remains local-first (`localStorage`). Chat supports workspace and conversation deep links.
* Context injection remains opt-in and transient; only pinned notes and memory tags are used for context.
* Linked conversations are local references/labels only. Import/export remains browser-local.
* Root-level Cursor skills are shared workspace tooling and are not part of the Nesty Console runtime.

v0.8.4 adds:
* Opening a conversation from the Chat sidebar updates the URL with `conversation=<id>` (and preserves active workspace / `useWorkspaceContext=1` when set).
* Copy Link action on `/workspaces` linked conversation rows (IDs only, no conversation content fetch).
* Silent title refresh for deep-linked conversations when the sidebar conversation list contains metadata.
* Links contain only workspace and conversation IDs. Gateway credentials remain server-side only.
* No linked conversation contents are injected into workspace context.

v0.8.3 adds:
* Deep-link support to open Gateway conversations in Chat via `/chat?conversation=<id>`.
* Combined workspace and conversation URLs: `/chat?workspace=<id>&conversation=<id>`.
* Open in Chat actions on `/workspaces` linked conversation rows (navigation only — IDs in URL, no conversation content fetch).
* Workspace context remains opt-in (`useWorkspaceContext=1`) and transient; linked conversation IDs or contents are never injected into workspace context.
* Gateway credentials remain server-side only. Deep links use existing Console API proxy routes.

v0.8.2 adds:
* Safe local JSON import for workspaces (paste JSON, validate, merge, atomic save).
* Local labels for linked workspace conversations (browser-only metadata).
* Import/export panel on `/workspaces` with trusted-import warning.
* Import only trusted workspace JSON. Suspicious secret-like fields are dropped during import.
* Linked conversation labels are never sent to Gateway and never injected into workspace context.
* No linked conversation contents are fetched automatically from `/workspaces`.
* Gateway credentials remain server-side only. Do not store secrets in workspace notes, prompts, or imported JSON.

v0.8.1 adds:
* In-chat workspace switcher to change active project without leaving Chat.
* Link current conversation to the active workspace (local reference only).
* Collapsible workspace context preview showing character count, included components, and safe built context text.
* Clearer pinned vs unpinned notes on `/workspaces` — only pinned notes are injected into chat context.
* Local workspace JSON export (copy or download).
* Workspace context remains opt-in, transient, and browser-local. Do not store secrets in workspace notes or prompts.

v0.8.0 adds:
* Local-first Workspaces (`/workspaces`) stored in browser `localStorage` under `nesty-console.workspaces.v1`.
* Organize project notes, memory tags, linked Gateway conversation IDs, and preferred chat presets/options per workspace.
* Open Chat with workspace context via `/chat?workspace=<id>` or `/chat?workspace=<id>&useWorkspaceContext=1`.
* Workspace context (system prompt, pinned notes, memory tags) is injected as a transient request-only system message when enabled — not saved into visible chat history.
* Do not store secrets in workspace notes or prompts. Gateway credentials remain server-side only.

v0.7.4 adds:
* Switch quickly between built-in presets (Fast Chat, Balanced, Deep Pro, Coding Assistant, Vietnamese Helper) or save custom session configurations.
* Presets store only non-secret UI options locally in browser localStorage.
* Gateway credentials and tokens remain server-side only.

v0.7.3 adds:
* Console supports Gateway v1.2.4 safe Pro orchestration quality metadata.
* It can display evidence source labels, whether planner/retrieval metadata was used, whether quality guard was applied, and Pro context budget/truncation state.
* It does not display role outputs, hidden prompts, chain-of-thought, raw context, raw search/tool payloads, or secrets.

v0.7.2 adds:
* Console displays safe Gateway runtime metadata from v1.2.x.
* Chat details can show retrieval sources, planner search/tool decisions, and answer quality flags.
* Metadata display is sanitized and does not show hidden prompts, raw context, tool arguments, or secrets.

v0.7.1 adds:
* Improved API Key Management UX, empty states, error states, and production QA guidance.
* Improved one-time raw API key creation flow with clearer warnings, copy confirmation, and safer state cleanup.
* Improved API key usage, limit, model allowlist, and revoked-state display.

v0.7.0 adds:
* Secured API Key Management UI (`/api-keys`) to list, create, inspect, update, and revoke Gateway API keys.
* Proxied server-side routes ensuring credentials and tokens never leak to client JavaScript.
* One-time success modal to securely view and copy the raw API key without storage or logging.

v0.6.8 adds:
* Redis KV/Upstash credential storage for Vercel/serverless deployments.
* Gateway API keys can be updated from `/settings/gateway` without redeploying when Redis KV is configured.
* Existing SQLite local/VPS storage and env-only fallback behavior remain supported.
* Secrets remain encrypted server-side only.

v0.6.5 adds:
* Serverless hosting and read-only filesystem support (Vercel Compatibility).
* Environment-only fallback mode (`env_only`) that bypasses SQLite database writes.
* Connection testing of unsaved form parameters on-the-fly.
* Optional requirements for `NESTY_CONSOLE_CREDENTIALS_SECRET` and `NESTY_INTERNAL_ADMIN_TOKEN` during testing and basic chat.
* Suffix warnings for Gateway URLs ending in `/v1` or `/api`.

## Relationship to NestyAI Gateway

- `NestyAI` is backend-only and runs separately.
- `NestyConsole` is a Next.js admin UI that calls the gateway through server-side API routes.
- Internal/admin gateway tokens stay on the server side of `NestyConsole`.
- Chat UI (`/chat`) also calls Gateway through server-side Console routes.
- `/chat` supports `conversation_id` handling returned by Gateway.
- `/chat` can list and reopen Gateway conversations via server-side Console routes.
- Console can view Gateway provider diagnostics via server-side internal proxy routes.
- Diagnostics history cleanup runs through `DELETE /api/internal/diagnostics/provider-health` (protected internal admin proxy).
- Console can view effective runtime model config and safely edit provider chain overrides via server-side internal proxy routes.
- Console supports provider naming for `ollama_cloud`; Gateway-side `OLLAMA_API_KEY` is required on Gateway only (not in Console).
- Console can search, inspect, export, summarize, clear, and manage Gateway conversations via server-side proxy routes.
- Memory controls are handled through protected server-side routes.
- Semantic recall testing uses internal admin routes and requires Internal Admin Token.
- Console can securely manage (create, list, inspect, update, revoke) Gateway API keys through `/api-keys` via internal proxy routes.
- Gateway credentials remain server-side only.

## Design System

- Neural Noir: dark mission-control aesthetic for AI Gateway operations.
- Typography: Chakra Petch + JetBrains Mono + DM Sans.
- Electric cyan active states, green/amber/red operational status, violet memory/AI indicators.
- All Gateway credentials remain server-side only.

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

## Deploying to Vercel

When deploying to Vercel or other serverless hosting environments, the SQLite database is not available for reliable persistent writes. Nesty Console can use Redis KV/Upstash for encrypted credential persistence, or fall back to **environment-only mode** (`env_only`) when no persistent storage is configured.

## Vercel persistent credential storage with Upstash Redis

SQLite is intended for local/VPS persistent Node deployments. Redis KV/Upstash is recommended for Vercel/serverless because it lets Console persist the small encrypted Gateway credential record outside the deployment filesystem. Env-only remains a fallback when no persistent storage is configured.

Credentials are encrypted with `NESTY_CONSOLE_CREDENTIALS_SECRET` before storage. Browser clients never receive plaintext Gateway API keys or Internal Admin Tokens. When Redis KV is configured, Gateway keys can be updated from `/settings/gateway` without redeploying.

Setup:

1. In Vercel Project, open Storage or Marketplace.
2. Add the Upstash Redis integration.
3. Ensure these env vars exist: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
4. Set `NESTY_CONSOLE_CREDENTIAL_STORAGE=auto`.
5. Set `NESTY_CONSOLE_CREDENTIALS_SECRET=<strong secret>`.
6. Redeploy.
7. Open `/settings/gateway` and save Gateway credentials from the UI.

Storage mode selection:

* `NESTY_CONSOLE_CREDENTIAL_STORAGE=auto` selects `redis_kv` when Upstash env vars exist.
* `auto` selects `env_only` on Vercel without Upstash.
* `auto` selects `sqlite` locally when no Upstash env exists.
* `redis_kv` stores encrypted credentials only.

In env-only mode, saving credentials via the Settings UI is disabled. Instead, specify all necessary credentials as environment variables in your Vercel Project settings:

- `NESTY_GATEWAY_URL`: The base URL of your NestyAI Gateway.
- `NESTY_API_KEY`: The API Key to authorize client requests against the Gateway.
- `NESTY_CONSOLE_ENABLE_INTERNAL_ADMIN`: Set to `true` to enable internal diagnostics, memory recall, and model config management.
- `NESTY_INTERNAL_ADMIN_TOKEN`: The token required for internal admin proxy routes (optional).
- `NESTY_CONSOLE_ADMIN_PASSWORD`: Password for Console login.
- `NESTY_CONSOLE_SESSION_SECRET`: Session signing secret.
- `NESTY_CONSOLE_CREDENTIAL_STORAGE`: Set to `auto`, `sqlite`, `redis_kv`, or `env_only`.
- `NESTY_CONSOLE_STORAGE_PREFIX`: Optional Redis key prefix, default `nesty-console`.
- `UPSTASH_REDIS_REST_URL`: Upstash Redis REST URL for Redis KV mode.
- `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST token for Redis KV mode.

To manually force environment-only mode locally or in other docker/serverless environments, set:
```env
NESTY_CONSOLE_DISABLE_CREDENTIAL_STORAGE=true
```

## Security Notes

- Never expose `NESTY_INTERNAL_ADMIN_TOKEN` to browser/client components.
- Never expose `NESTY_API_KEY` to browser/client components.
- Never expose `NESTY_CONSOLE_ADMIN_PASSWORD` or `NESTY_CONSOLE_SESSION_SECRET` to browser/client components.
- Raw API keys generated during creation must exist only in temporary component state. Do not store raw keys in localStorage, sessionStorage, IndexedDB, cookies, URL params, or logs.
- Detail, list, edit, or revoke views must never expose raw keys or key hashes.
- Console must never log raw keys, request payloads, secrets, or internal Gateway admin headers.
- Browser pages should call same-origin routes (`/api/gateway/*` and `/api/internal/*`) only.
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

## API Key Management QA Checklist

- `/api-keys` redirects to `/login` when signed out.
- `/api/internal/api-keys` returns 401 before login.
- Internal Admin Token is configured in `Settings → Gateway Credentials`.
- Create API key displays `raw_key` exactly once.
- Closing the one-time raw key panel clears it from UI state.
- Refresh/list/detail/edit/revoke never show `raw_key` or `key_hash`.
- Copy raw key requires user click.
- Revoked key can no longer access Gateway public API.
- Browser network calls only hit Console `/api/internal/api-keys` routes.
- No Gateway internal admin token is visible in browser/network response.
- No raw API key is stored in `localStorage`/`sessionStorage`/`cookies`/`URL`.

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
- API Key Management `/api-keys` loads, key creation, metadata update, and revocation work.
- One-time raw API key display works (requires explicit copy click, does not store raw key).
- Internal admin token warnings appear when missing/invalid.
- Invalid/expired Gateway API key behavior is clear and actionable.
- Protected API behavior returns 401 when unauthenticated.

Security checks:

- `/api/gateway/models` returns 401 before login.
- `/api/internal/diagnostics/provider-health/summary` returns 401 before login.
- `/api/internal/api-keys` returns 401 before login.
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
## Implemented in v0.7.0

- API Key Management page (`/api-keys`) with creation, listing, details, updating, and revocation views.
- Server-side API key proxy routes:
  - `GET /api/internal/api-keys`
  - `POST /api/internal/api-keys`
  - `GET /api/internal/api-keys/{api_key_id}`
  - `PATCH /api/internal/api-keys/{api_key_id}`
  - `POST /api/internal/api-keys/{api_key_id}/revoke`

## Implemented in v0.6.2

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
- v0.6.2 Neural Noir UI refresh
- v0.7.0 API Key Management UI
- Full provider marketplace and enterprise configuration workflows are planned for a later version if needed.
