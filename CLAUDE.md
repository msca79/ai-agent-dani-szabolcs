# General Guidelines for this repo

- This is a single plain npm package — no monorepo, no workspaces, no Nx, no pnpm.
- Run tasks through the root `npm` scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run cli`.
- Code layout under `src/`: one directory per concept — `cli/`, `client/`, `ask-agent/`, `system-prompts/`, `run-sql/`. Each directory holds everything it needs (schema, guard, DB connection, tests).
- Coding conventions live in `docs/konvenciok.md`; read it before adding new files or tools.
