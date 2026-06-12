# Changelog

All notable changes to Nesty Console will be documented in this file.

## [0.10.0] - Unreleased

### Added
- Titanium Noir Cinematic Command Deck visual system with deep blue-black ambient foundations and cold titanium surfaces.
- Shared glass surface tiers, page motion wrappers, status primitives, loading skeletons, accessible Modal, and accessible Drawer.
- Floating desktop sidebar and independent floating topbar with grouped operator navigation.
- Page-specific command heroes across Dashboard, Chat, Workspaces, Status, Models, Diagnostics, Memory, API Keys, Providers, and Settings.

### Changed
- Rebuilt the protected Console presentation layer in place with stronger contrast, more spacious command panels, and consistent responsive behavior.
- Standardized API Key and Runtime Provider overlays with focus trapping, Escape handling, focus return, and body scroll locking.
- Restricted glass blur to the topbar, modal/drawer overlays, and sticky chat composer.
- Added restrained GSAP entrance and overlay motion with reduced-motion support and transform/opacity-only animation.

### Performance
- Bounded entrance staggering and avoided layout-affecting animation properties.
- Kept base and raised glass surfaces blur-free to reduce GPU cost.

### Security
- Preserves existing routes, server/client boundaries, data fetching, forms, API semantics, credential handling, and secret redaction.
- Chat streaming parser, SSE format, stop/cancel flow, scroll stabilization, and message persistence remain unchanged.

## [0.9.3] - Unreleased

### Added
- Server-proxied Gateway v1.5 runtime provider APIs under `/api/console/runtime/*`.
- Settings page: `/settings/providers` for runtime OpenAI-compatible provider CRUD, test, enable/disable.
- Gateway v1.5.2 policy error mapping and friendly Chat/Diagnostics copy (`gateway_policy_*` codes).
- Diagnostics runtime status panel synced from `GET /internal/console/runtime/status`.
- Model Configs provider-chain suggestions from runtime provider catalog (manual ID entry preserved).
- Optional Console client auth headers (`NESTY_CONSOLE_CLIENT_ID`, `NESTY_CONSOLE_CLIENT_SECRET`) for runtime proxy calls.
- Policy error fixtures in `validate:provider-parsers`.

### Changed
- Chat stream mid-flight errors preserve safe `details` (including `request_id` and `reason_code` when present).
- Settings overview links to Runtime Providers; env status shows console client secret readiness.

### Security
- Browser never calls Gateway runtime APIs directly; all traffic goes through Console server routes.
- Provider `api_key` is accepted only transiently on create/update POST bodies and is stripped from all responses.
- Built-in providers remain read-only in Console UI (disable-only).

## [0.9.2] - Unreleased

### Added
- Pure provider error parsers module (`provider-error-parsers.ts`) for Retry-After, HTTP-date Retry-After, and `X-RateLimit-Reset`.
- Safe rate-limit reset metadata in error `details` (`rate_limit_reset_seconds`, `rate_limit_reset_at`).
- Request ID copy button on `RequestIdTag` (client-only, no new dependencies).
- Diagnostics error banner shows Request ID + log correlation hint.
- Optional supplementary script: `pnpm run validate:provider-parsers` (Node strip-types; not required for release).

### Changed
- Health, ready, and models API routes use shared `gatewayResultToResponse` on error paths only.
- Chat, Status, and Gateway Credentials show friendly rate-limit retry/reset copy from normalized `details`.
- Status page accepts Console error codes and displays request ID on probe failures.

### Security
- Raw `Retry-After` and `X-RateLimit-Reset` header values are never shown in UI.
- HTTP-date Retry-After accepts valid future dates only (rejects past and >7 days).
- Chat SSE passthrough unchanged; no Gateway or credential/auth changes.

## [0.9.1] - Unreleased

### Added
- Shared Gateway provider error mapper (`provider-errors.ts`) with code-first upstream mapping.
- Distinct Console error codes for revoked keys, quota, rate limits, and model allowlist/alias failures.
- Request ID display in Chat and Gateway Credentials test failures (sanitized diagnostic metadata).
- Numeric `Retry-After` seconds hint in rate-limit error messages.

### Changed
- Chat, proxy routes, and Gateway Credentials test now align with NestyAI Gateway v1.3.0/v1.3.1 provider error envelopes.
- API Keys revoke copy notes that external clients receive `api_key_revoked` (HTTP 403).
- Models page notes that authenticated `/v1/models` may filter to an API key allowlist.

### Security
- Preserves existing Console error JSON shape (`type: console_error`); new Gateway fields are additive in `details` only.
- Request IDs are sanitized before storage/render; secrets remain server-side; chat streaming passthrough unchanged.

## [0.9.0] - Unreleased

### Changed
- Rebuilt Nesty Console UI around a calmer premium product design system.
- Improved global layout, navigation shell, panels, cards, buttons, forms, selects, tables, badges, and workspace/chat surfaces.
- Fixed inconsistent dropdown/select styling and removed unreadable white-on-white states.
- Improved responsive behavior, accessibility, and visual consistency across major Console pages.

### Security
- Product UI rebuild preserves server-side Gateway credential boundaries, protected route behavior, workspace context semantics, chat streaming behavior, metadata rendering, and local-first workspace storage.

## [0.8.8] - Unreleased

### Fixed
- Fixed a Chat UX issue where sending a message could scroll the page to the top.

### Changed
- Improved Chat scroll stability during message send and streaming.

### Security
- Scroll stability changes do not alter Gateway credential boundaries, server-side proxy behavior, workspace context injection, chat streaming semantics, or metadata rendering.

## [0.8.7] - Unreleased

### Added
- Added absolute URL copy support for Workspace conversation links.
- Added Copy Link action for the active Chat conversation.
- Added optional keyboard navigation polish for the Workspace list.
- Added bounded title refresh improvements for deep-linked conversations.

### Changed
- Improved Workspace and Chat conversation link polish while preserving existing deep-link behavior.

### Security
- Conversation links contain only Workspace IDs and Gateway conversation IDs, and continue to use server-side Console proxy routes without exposing Gateway credentials, internal admin tokens, provider secrets, cookies, sessions, or request headers.

## [0.8.6] - Unreleased

### Added
- Added a controlled GSAP motion layer for Workspace UI (`gsap`, `@gsap/react`).
- Added reduced-motion guards (`canAnimate()`, `useReducedMotion()`) for all GSAP paths.
- Added workspace list entrance stagger, selected workspace glow, chat panel entrance, context preview content fade, note pin flash, and import/export notice pop-in.

### Changed
- Improved Workspace Memory Hub and Chat workspace panel motion while preserving existing behavior and deep-link flows.

### Security
- GSAP motion is decorative client-side UI only and does not expose Gateway credentials, internal admin tokens, provider secrets, cookies, sessions, request headers, or linked conversation contents.

## [0.8.5] - Unreleased

### Changed
- Refined Workspace Memory Hub and Chat workspace integration with a premium Neural Noir UX pass.
- Improved Workspace list, notes, linked conversation rows, import/export UI, and context preview visual hierarchy.
- Improved responsive behavior, accessibility, and micro-interactions for Workspace-related UI.

### Security
- Workspace UI polish preserves the local-first model and does not expose Gateway credentials, internal admin tokens, provider secrets, cookies, sessions, request headers, or linked conversation contents.

## [0.8.4] - Unreleased

### Added
- Added URL sync when opening conversations from the Chat sidebar.
- Added Copy Link action for linked Workspace conversations.
- Added silent title refresh for deep-linked conversations when conversation list metadata is available.

### Changed
- Improved Workspace Conversation Deep Link continuity between Workspaces and Chat.

### Security
- Conversation links contain only local workspace IDs and Gateway conversation IDs, and continue to use existing server-side Console proxy routes without exposing Gateway credentials, internal admin tokens, provider secrets, cookies, sessions, or request headers.

## [0.8.3] - Unreleased

### Added
- Added deep-link support for opening Gateway conversations in Chat.
- Added Open in Chat actions for linked Workspace conversations.
- Added combined workspace and conversation chat URLs.

### Changed
- Improved Workspace Memory Hub continuity between Workspaces and Chat.

### Security
- Conversation deep links use existing server-side Console routes and do not expose Gateway credentials, internal admin tokens, provider secrets, cookies, sessions, or request headers.

## [0.8.2] - Unreleased

### Added
- Added safe local JSON import for Workspace Memory Hub.
- Added local labels for linked workspace conversations.
- Added improved import/export workflow for browser-local workspaces.

### Changed
- Improved linked conversation readability in Workspaces while keeping references local-only.

### Security
- Workspace import sanitizes data, drops suspicious secret-like fields, remains browser-local, and never stores Gateway credentials, internal admin tokens, provider secrets, cookies, sessions, or request headers.

## [0.8.1] - Unreleased

### Added
- Added workspace switcher and current-conversation linking in Chat.
- Added workspace context preview for safer visibility into injected project context.
- Added clearer pinned-note visibility for Workspace Memory Hub.
- Added local workspace JSON export (copy and download) on `/workspaces`.

### Changed
- Improved Workspace Memory Hub usability and chat integration while keeping workspace data local-first.

### Security
- Workspace context remains opt-in, transient, local-first, and does not expose Gateway credentials, internal admin tokens, provider secrets, cookies, sessions, or linked conversation contents.

## [0.8.0] - Unreleased

### Added
- Added Workspace Memory Hub for organizing project-specific context, notes, presets, and linked conversations.
- Added local workspace templates for common NestyAI ecosystem projects.
- Added workspace-aware chat entry flow for opening Chat with project context.

### Security
- Workspace data is stored locally as non-secret user context and never stores Gateway API keys, internal admin tokens, provider secrets, cookies, sessions, or credentials.

## [0.7.4] - Unreleased

### Added
- Added Chat Session Presets for quickly switching between common NestyChat modes.
- Added built-in presets for Fast Chat, Balanced, Deep Pro, Coding Assistant, and Vietnamese Helper.
- Added local custom presets saved in browser-local non-secret preferences.

### Security
- Chat presets store only non-secret UI preferences and never store Gateway API keys, internal admin tokens, provider secrets, or credentials.

## [0.7.3] - Unreleased

### Added

* Added display support for Gateway v1.2.4 Nesty Pro quality metadata.
* Added Pro evidence source badges, retrieval/planner/quality guard usage indicators, and Pro context budget/truncation details.

### Changed

* Improved Nesty Pro orchestration details to distinguish role execution metadata from Pro quality/context metadata.

### Security

* Pro quality metadata rendering remains sanitized and does not expose role outputs, internal notes, hidden prompts, raw context, tool payloads, provider secrets, or chain-of-thought.

## [0.7.2] - Unreleased

### Added

* Added Planner metadata display in Chat Response Details.
* Added Retrieval metadata display for context sources, truncation, and memory/search usage.
* Added Answer Quality metadata display for quality flags and actions.

### Changed

* Improved Chat Response Details organization so orchestration, retrieval, planner, answer quality, output safety, and provider fallback metadata are easier to inspect.

### Security

* Runtime metadata rendering remains sanitized and does not expose Gateway credentials, internal admin tokens, hidden prompts, raw context, raw tool arguments, provider secrets, or stack traces.

## [0.7.1] - Unreleased

### Changed

* Improved API Key Management UX, empty states, error states, and production QA guidance.
* Improved one-time raw API key creation flow with clearer warnings and safer state cleanup.
* Improved API key usage, limit, model allowlist, and revoked-state display.

### Security

* Rechecked API key management boundaries so raw keys remain one-time only and internal admin credentials remain server-side.
* Added stronger UI warnings to prevent accidental API key loss or misuse.

## [0.7.0] - Unreleased

### Added

* Added API Key Management UI (`/api-keys`) to manage environment-specific Gateway API keys.
* Added server-side proxy endpoints (`/api/internal/api-keys`) to handle listing, creation, detail retrieval, updating, and revocation.
* Implemented client-side api-key API wrapper.
* Added navigation support in Sidebar, Dashboard cards, and Settings Admin Surfaces.

### Changed

* Updated Console-wide styling to cleanly integrate API Keys within the Neural Noir theme.

### Security

* Raw API keys are returned exactly once upon creation, and exist only in temporary React component state. They are never stored in localStorage, sessionStorage, IndexedDB, cookies, logs, or databases.
* Copying raw API keys requires explicit user action (no auto-copy).
* Detail, update, list, and revoke proxy endpoints never return or expose raw keys or key hashes.

## [0.6.8] - Unreleased

### Added

* Added Redis KV/Upstash credential storage backend for Vercel/serverless deployments.
* Added persistent Gateway credential switching on Vercel without redeploying.

### Changed

* Credential storage mode can now be auto, sqlite, redis_kv, or env_only.
* Settings Gateway now displays Redis KV storage status.

### Security

* Gateway credentials are encrypted before being stored in Redis KV and are never returned to the browser.

## [0.6.7] - Unreleased

### Added

* Added Gateway output safety metadata display in chat response details.
* Added provider fallback metadata display for attempted providers and fallback reasons.
* Added diagnostics history cleanup action for Gateway provider health records.
* Added UI support for the `ollama_cloud` provider in Model Configs and Diagnostics views.

### Changed

* Improved Diagnostics display for effective config source/revision metadata and provider error categories.
* Improved chat response details to distinguish orchestration metadata, output safety metadata, and provider fallback metadata.

### Security

* Runtime metadata display remains sanitized and does not expose provider secrets, raw provider responses, internal tool markup, hidden prompts, or stack traces.

## [0.6.6] - Unreleased

### Changed

* Improved responsive scaling for the Chat page.
* Expanded the main chat canvas on wide screens.
* Improved chat sidebar/options layout behavior across desktop and smaller screens.
* Reduced cramped fixed-width layout behavior in main Console pages.

## [0.6.5] - 2026-06-01

### Added

* Added environment-only credential storage fallback mode (`env_only`) for serverless environments (e.g. Vercel).
* Added automatic detection of Vercel runtime to disable SQLite storage.
* Added explicit `NESTY_CONSOLE_DISABLE_CREDENTIAL_STORAGE` feature flag.
* Added warning metadata and UI indicators showing active Storage Mode and availability details.
* Added support for testing unsaved Gateway credentials on-the-fly without database persistence.
* Added support for both snake_case and camelCase fields in connection testing API request bodies.

### Changed

* Disabled credential editing and saving in environment-only mode (returns HTTP 409 Conflict rather than throwing filesystem errors).
* Made the master encryption secret (`NESTY_CONSOLE_CREDENTIALS_SECRET`) optional in env-only mode so basic chat doesn't crash.
* Made `NESTY_INTERNAL_ADMIN_TOKEN` optional to enable chat testing without requiring internal admin configurations.

## [0.6.4] - 2026-06-01

### Added

* Added Chat Canvas Renderer for polished assistant response rendering.
* Added safe Markdown rendering for headings, lists, quotes, code blocks, and tables.
* Added raw/rendered response toggle for chat messages.
* Added improved copy actions for full response and code blocks.

### Changed

* Improved chat response readability and separated rendered answer content from response metadata/details.

### Security

* Rendered chat content is sanitized and does not execute raw HTML or scripts.
* Gateway credentials and internal admin tokens remain server-side only.

## [0.6.3] - 2026-06-01

### Added
- Created `ProOrchestrationDetails` component to visualize multi-model orchestration steps, latencies, and roles (planner, researcher, critic, finalizer) for `nesty-pro-1.0`.
- Integrated tolerant metadata parsing in chat page to handle `data.metadata.orchestration`, `data.metadata`, `data.orchestration`, and root properties from SSE streams.
- Added message-level metadata extraction when opening existing conversations to display correct details.

### Changed
- Polished error mapping in `mapGatewayError` and `POST` completions API to inspect both HTTP status and Gateway JSON payload `error.code`, `error.details.upstream_status`, and `error.details.gateway_code`.
- Preserved only safe details in client-facing error envelopes (`upstream_status` and `gateway_code`), ensuring no system secrets or internal tracebacks are leaked.
- Improved client-side `ErrorBanner` displaying helpful instructions and links to configuration routes.

### Limitations
- "Clear stored credentials" is not supported in Nesty Console v0.6.3. Users can replace credentials but cannot completely clear them.

## [0.6.2] - Unreleased

### Changed

- Refreshed Console UI with the Neural Noir design system.
- Improved sidebar, topbar, cards, badges, tables, forms, and chat visual hierarchy.
- Improved dark-theme readability, responsive spacing, and operator-console styling.

### Security

- UI refresh preserves server-side Gateway credential boundaries and does not expose secrets to browser JS.

## [0.6.1] - Unreleased

### Changed

- Improved Console-wide loading, error, and empty states.
- Standardized protected route/API error presentation.
- Improved destructive action confirmations and user-facing warnings.
- Improved responsive layout consistency across main Console pages.

### Security

- Centralized secret redaction utilities and verified sensitive fields remain hidden in admin views.
- Rechecked protected Console routes and server-side proxy boundaries.

## [0.6.0] - Unreleased

### Added

- Added Memory & Conversation Management area.
- Added server-side proxy routes for conversation search, message pagination, export, summarize, clear, and reset-summary.
- Added message memory controls for pinned/excluded/tags when supported by Gateway.
- Added optional semantic recall test UI through protected internal proxy routes.

### Security

- Conversation and memory requests are routed through protected server-side Console routes so Gateway credentials and internal admin tokens are never exposed to the browser.

## [0.5.0] - Unreleased

### Added

- Added Runtime Model Config Admin for viewing and editing Gateway model alias configuration.
- Added server-side internal model config proxy routes.
- Added safe provider chain editor, effective config view, and reset override actions.

### Security

- Runtime model config requests are routed through protected server-side Console routes so Internal Admin Token is never exposed to the browser.

## [0.4.0] - Unreleased

### Added

- Added Diagnostics Dashboard MVP for Gateway provider health and reliability.
- Added server-side internal diagnostics proxy routes.
- Added provider health summary, latest checks, reliability status, and admin-token warnings.

### Security

- Internal diagnostics requests are routed through protected server-side Console routes so Internal Admin Token is never exposed to the browser.

## [0.3.2] - Unreleased

### Added

- Added lightweight conversation sidebar for NestyChat Web.
- Added server-side proxy routes for listing and loading Gateway conversations.
- Added basic conversation actions such as refresh, open, rename, archive/delete when supported by Gateway.

### Changed

- Improved chat continuity by allowing existing Gateway conversations to be reopened from the chat UI.

## [0.3.1] - Unreleased

### Added

- Added conversation_id support to NestyChat Web.
- Added chat controls such as New Chat, Clear Chat, and Copy Message.
- Added local UI preference persistence for selected model and chat options.

### Changed

- Improved streaming response handling and chat error states.
- Improved chat layout and usability.

## [0.3.0]

### Added

- Added NestyChat Web MVP with protected chat page, model selector, chat options, and Gateway chat proxy.

### Security

- Chat requests are sent through server-side Next.js routes so Gateway API keys are not exposed to the browser.

## [0.2.1]

### Added

- Added single-admin login and route protection.
- Protected Console pages and API routes with signed HTTP-only session cookies.

## [0.2.0]

### Added

- Added Gateway Credentials Manager with encrypted server-side credential storage.
- Added Gateway credential testing and invalid/expired key UX.

## [0.1.0]

### Added

- Initial Console shell with Gateway status, models, settings, and server-side Gateway proxy routes.
