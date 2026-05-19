# Contributing

Thanks for working on Nexus SCM Mobile. A few ground rules to keep the codebase consistent.

## Coding style

- **JavaScript only** (no TypeScript) — match the existing files.
- Functional React components and hooks only; no class components.
- Two-space indentation. Trailing commas on multi-line literals.
- One default export per file when the file represents a screen or component.
- File names: `PascalCase.js` for components, `camelCase.js` for utilities/hooks.

## Folder conventions

| Folder | Purpose | When to add a file |
|---|---|---|
| `app/` | Expo Router routes. File path == URL. | New screen. |
| `src/api/` | One module per back-end service. | New endpoint. |
| `src/components/` | Reusable UI building blocks. | Used by 2+ screens. |
| `src/hooks/` | `useXxx` hooks. | Reusable stateful logic. |
| `src/theme/` | Color / spacing tokens. | New token. |
| `src/utils/` | Pure helpers. | No React, no IO. |

## Cross-cutting rules

- **Every API call** must go through one of the axios instances in `src/api/client.js`. Do not call `axios` directly from screens — the interceptors handle `Authorization`, `X-Correlation-Id`, and the 401 silent-refresh dance.
- **No emojis as icons.** Use `react-native-svg` components (see `src/components/PersonaIcon.js`, `BrandLogo.js`) or Paper's built-in icon names (which map to MaterialCommunity).
- **No new background colors.** Pull from `useTheme().colors` so dark mode works automatically. Status colors live in `src/theme/tokens.js`.
- **Secrets** (Firebase keys, JWT signing keys, anything not safe for the JS bundle) never get committed. `google-services.json` at the project root is gitignored — the canonical copy is at `docs/google-services.json`.
- **No mutations on PO / Supplier / User in Phase 1–3** beyond approve/reject in Phase 3. Create / Edit / Delete are deferred.

## Branching

- `main` is always installable.
- Feature branches: `feat/<scope>-<short-desc>` (e.g. `feat/suppliers-list`).
- One phase = one PR where reasonable.

## Before opening a PR

1. `npm run lint` (when configured) returns clean.
2. `npm run prebuild` succeeds on JDK 21.
3. The app boots, logs in with at least one sample persona, and lands on the dashboard.
4. Note any new env vars in `README.md` and add placeholders to `.env`.
