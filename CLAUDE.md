# General Guidelines for this repo

- This is a plain **npm workspace** monorepo (`package.json` `workspaces: ["src/apps/*", "src/packages/*"]`). No Nx, no pnpm.
- Run tasks through npm, not ad-hoc tool invocations:
  - Single package: `npm run <script> --workspace=<package-name>` (e.g. `npm run test --workspace=@boardgame/ask-agent`).
  - All packages: `npm run <script> --workspaces --if-present` (root `npm test`, `npm run lint`, `npm run typecheck` already do this).
- Workspace layout:
  - `src/apps/cli` (`@boardgame/cli`) — the commander CLI.
  - `src/apps/web` (`@boardgame/web`) — skeleton for a future Vercel AI SDK web agent, not wired up yet.
  - `src/packages/client`, `src/packages/ask-agent`, `src/packages/system-prompts`, `src/packages/run-sql` — the agent, one npm package per concept.
- `@boardgame/run-sql` must not depend on `@boardgame/ask-agent` (or vice versa in the other direction) — that would create a package cycle. `ask-agent` composes the `ToolDefinition` for each tool itself from the tool package's raw exports; tool packages stay dependency-free of `ask-agent`.
- Coding conventions live in `docs/konvenciok.md`; read it before adding new files or tools.
