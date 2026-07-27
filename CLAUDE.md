# General Guidelines for this repo

- This is a single plain npm project — no monorepo, no workspaces, no Nx, no pnpm. One root `package.json`, one `tsconfig.json`, one `vitest.config.ts`.
- Run tasks through the root `npm` scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run cli`.
- Code layout under `src/` is organizational only (plain folders, not npm packages):
  - `src/apps/cli` — the commander CLI.
  - `src/apps/web` — skeleton for a future Vercel AI SDK web agent, not wired up yet.
  - `src/packages/client`, `src/packages/ask-agent`, `src/packages/system-prompts`, `src/packages/run-sql` — the agent, one directory per concept, imported via relative paths (no package boundary, no `index.ts` barrels).
- Coding conventions live in `docs/konvenciok.md`; read it before adding new files or tools.
