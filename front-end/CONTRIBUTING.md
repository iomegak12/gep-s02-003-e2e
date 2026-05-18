# Contributing to Nexus SCM Front-End

Thanks for contributing! A few ground rules to keep the codebase consistent.

## Branching

- `main` is always deployable.
- Feature branches: `feat/<short-description>` (e.g., `feat/supplier-kanban`).
- Fix branches: `fix/<short-description>`.

## Local setup

```
npm install
npm run dev
```

You'll need the back-end stack running (see the repo's
[back-end/](../back-end) directory).

## Coding conventions

- **JavaScript, not TypeScript** for this project.
- React function components + hooks only — no class components.
- One component per file. Filename matches the exported component
  (`Button.jsx` exports `Button`).
- Style with CSS files colocated next to the component
  (`Button.jsx` + `Button.css`).
- **Never hard-code colors.** Always use design tokens from
  [src/styles/tokens.css](src/styles/tokens.css) via `var(--token-name)`.
- Prefer composition over abstraction. Don't introduce wrappers for things
  with one caller.

## API calls

- All HTTP goes through [src/api/client.js](src/api/client.js) so that
  Authorization and `X-Correlation-Id` are attached automatically.
- Service-specific endpoints live in `src/api/<service>.js`.
- Cache and dedupe with `@tanstack/react-query`. Use a `queryKey` that starts
  with the service name (`['suppliers', filters]`).

## Adding a new screen

1. Create a folder under `src/features/<area>/`.
2. Add a route entry in [src/routes/index.jsx](src/routes/index.jsx).
3. Add the nav item to the appropriate role in
   [src/constants/nav.js](src/constants/nav.js).
4. Use existing primitives from `src/components/ui/` first; build new
   primitives only when you need them in more than one screen.

## Phased delivery

Stay within the current phase scope (see [README.md](README.md)). If a screen
needs something outside the phase, raise it before building it.

## Commit messages

Conventional commits are preferred:

- `feat(suppliers): add Kanban view`
- `fix(shell): health modal flickers on theme switch`
- `chore: bump axios`

## Pull requests

- Keep PRs focused on a single phase deliverable.
- Include before/after screenshots for any visible change.
- Verify `npm run lint` and `npm run build` are clean.
