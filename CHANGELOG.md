# Changelog

All notable changes to Nesty Console will be documented in this file.

## [0.3.0] - Unreleased

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
