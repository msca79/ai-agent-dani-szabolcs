# General Guidelines for this repo

- This is a single plain npm project — no monorepo, no workspaces, no Nx, no pnpm. One root `package.json`, one `tsconfig.json`, one `vitest.config.ts`.
- Run tasks through the root `npm` scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run cli`, `npm run web`. `make cli` / `make web` are thin wrappers around the same two — pick one to decide which surface starts.
- Code layout under `src/` is organizational only (plain folders, not npm packages):
  - `src/apps/cli` — the commander CLI (uses `queryAgent`).
  - `src/apps/web` — Vite dev server (`index.html` + `vite.config.ts` at the app root, required by Vite). `web/server/` is the backend half — `chat-api-plugin.ts` (a Vite `configureServer` middleware exposing `/api/ask`, wired to `queryAgent`) and `ask-request.ts` (Zod validation) — it calls the agent directly in the same Node process, so secrets/DB access never reach the browser. `web/client/` is the browser half — `main.ts` (entry), `chat-ui.ts` (DOM/rendering), `chat-client.ts` (`fetch('/api/ask')`, streaming read), `render-markdown.ts`, `typewriter.ts` (smooths choppy network chunks into a steady reveal), `style.css`. The response streams as plain chunked text, and the client keeps the session's Q&A turns in memory and resends them as `history` on every request — agents are stateless, the caller (cli or web) owns conversation memory.
  - `src/agents/agent-loop` — the shared, agent-agnostic tool-use loop (`runAgentLoop`) plus `ToolDefinition`/`ConversationTurn` types and `agent-logger.ts` (JSONL/colored transparency log). Knows nothing about DB pools or any specific tool — a concrete agent supplies its own `systemPrompt` + `tools` (each tool's `execute` closes over whatever pool/resource *it* needs, so one agent can mix tools with different permissions in the same run).
  - `src/agents/client` — the Anthropic SDK wrapper.
  - `src/agents/query-agent` — read-only recommendation agent (`queryAgent`): `run_sql` tool only, read-only pool. Used by cli and web today.
  - `src/agents/ingest-agent` — internal catalog-editing agent (`ingestAgent`): `run_sql` (read, read-only pool) + `upsertProduct` (write, write pool) + `fetchGameDescription` (mock external fetch). **Not wired into cli/web yet** — implemented and tested, exposing it is a follow-up.
  - `src/tools/run-sql` — read-only arbitrary-SELECT tool (shared by both agents).
  - `src/tools/upsert-product` — structured (not raw-SQL) insert-or-update on `games`; only touches columns actually provided. Uses `write-pool.ts` (`DATABASE_URL_WRITE`, `boardgame_rw` role — INSERT/UPDATE/SELECT only, no DELETE/DDL, enforced at the Postgres permission level as defense in depth beyond the tool's own design).
  - `src/tools/fetch-game-description` — **mock only**, no real network call; returns a deterministic placeholder description until a real BoardGameGeek (or similar) integration exists.
  - Imported via relative paths, no package boundary, no `index.ts` barrels.
- Postgres (docker-compose + init SQL) lives in `devops/postgres/`; start it with `make pg`. Roles: `boardgame_ro` (read-only, `run_sql`) and `boardgame_rw` (INSERT/UPDATE only on `games`, `upsertProduct`) — both least-privilege, neither can DELETE or touch DDL.
- Coding conventions live in `docs/konvenciok.md`; read it before adding new files or tools.
