# General Guidelines for this repo

- This is a plain **npm workspace** monorepo (`package.json` `workspaces: ["apps/*", "packages/*"]`). No Nx, no pnpm.
- Run tasks through npm, not ad-hoc tool invocations:
  - Single package: `npm run <script> --workspace=<package-name>` (e.g. `npm run test --workspace=@boardgame/core`).
  - All packages: `npm run <script> --workspaces --if-present` (root `npm test`, `npm run lint`, `npm run typecheck` already do this).
- Workspace layout: `apps/cli` (`@boardgame/cli`, the commander CLI) and `packages/core` (`@boardgame/core`, the agent — organized as one directory per concept: `client/`, `ask-agent/`, `system-prompts/`, `run-sql/`).
- Coding conventions live in `docs/konvenciok.md`; read it before adding new files or tools.
