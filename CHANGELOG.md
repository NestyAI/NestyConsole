# Changelog

All notable changes to Nesty Console will be documented in this file.

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
