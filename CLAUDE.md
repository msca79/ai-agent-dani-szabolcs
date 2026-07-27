# General Guidelines for this repo

- This is a single plain npm project — no monorepo, no workspaces, no Nx, no pnpm. One root `package.json`, one `tsconfig.json`, one `vitest.config.ts`.
- Run tasks through the root `npm` scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run cli`, `npm run web`. `make cli` / `make web` are thin wrappers around the same two — pick one to decide which surface starts.
- Code layout under `src/` is organizational only (plain folders, not npm packages):
  - `src/apps/cli` — the commander CLI.
  - `src/apps/web` — Vite dev server (`index.html` + `vite.config.ts` at the app root, required by Vite). `web/server/` is the backend half — `chat-api-plugin.ts` (a Vite `configureServer` middleware exposing `/api/ask`) and `ask-request.ts` (Zod validation) — it calls `askAgent` directly in the same Node process, so secrets/DB access never reach the browser. `web/client/` is the browser half — `main.ts` (entry), `chat-ui.ts` (DOM/rendering), `chat-client.ts` (`fetch('/api/ask')`, streaming read), `render-markdown.ts`, `typewriter.ts` (smooths choppy network chunks into a steady reveal), `style.css`. The response streams as plain chunked text (`askAgent`'s `onTextDelta`), and the client keeps the session's Q&A turns in memory and resends them as `history` on every request — `askAgent` itself is stateless, the caller (cli or web) owns conversation memory.
  - `src/agents/client`, `src/agents/ask-agent`, `src/agents/system-prompts` — the agent core.
  - `src/tools/run-sql` — the agent's tools.
  - Imported via relative paths, no package boundary, no `index.ts` barrels.
- Postgres (docker-compose + init SQL) lives in `devops/postgres/`; start it with `make pg`.
- Coding conventions live in `docs/konvenciok.md`; read it before adding new files or tools.
