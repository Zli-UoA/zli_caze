# Caze (beta)

A real-time room app (Void + Vite+ + Durable Streams + TanStack DB + Cloudflare Workers) that lets you join a room by ID and post comments. A separate `/room/:roomId/view` page renders them as scrolling danmaku on canvas.

## Getting Started

> Package manager: pnpm (via `packageManager`). Do not use npm. Node version is pinned via `.node-version` (Void 1.6 requires `^24.22.0 || >=26.12.0`; Vite+ 1.4 requires `^22.18.0 || ^24.11.0 || >=26.0.0`).

Install dependencies:

```bash
pnpm install
```

### Development

Start the development server with HMR:

```bash
pnpm run dev        # vp dev
```

Your application will be available at `http://localhost:5173`.

## Checks

```bash
pnpm run typecheck   # tsc --noEmit
vp check              # Oxfmt + Oxlint (type-aware)
vp test               # Vitest (src, durable-objects, pages tests)
vp build              # Void production build
```

## Deploy

Merging to `main` runs `.github/workflows/void-deploy.yml`:

```text
pnpm install --frozen-lockfile
pnpm exec void deploy --platform cloudflare
```

Add the repository secret `CLOUDFLARE_API_TOKEN` before the first deploy. If the token can access multiple accounts, also add `CLOUDFLARE_ACCOUNT_ID` and pass it to the workflow. Set `CLOUDFLARE_WORKERS_SUBDOMAIN` as a repository variable if `workers.dev` is enabled and the Worker Version has no preview URL. `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` are only needed when Cloudflare Access protects the readiness URL.

This PR replaces the existing `zli-caze` Worker in place and old data is accepted as lost. Before merging:

1. Disconnect the old `zli-caze` Workers Builds integration in Cloudflare
2. Delete the old `zli-caze` Worker (same-name replacement)
3. Merge the PR; the workflow recreates `zli-caze` from `void.config.ts`

For a non-destructive trial, set `cloudflare.name` to a separate Worker such as `zli-caze-void` and deploy that first.

## Notes

- `@tanstack/db` / `@tanstack/react-db` are pinned to `0.15.2` / `0.5.12`; StreamDB requires `@tanstack/db >=0.6 <1.0`. Upgrade both together.
- `void prepare` generates `.void/` types. `.void/` and `.cloudflare/` are gitignored.
- Pages live in `pages/`, API routes in `routes/`, and Durable Objects in `durable-objects/`.
- Each room is one Durable Stream at `/streams/:roomId`. `routes/streams/[...path].ts` mounts `createStreamsHandler()`, backed by `durable-objects/streams.ts` (`defineDurableObject`, binding `STREAMS`).
- The stream route disables CORS, does not expose `DELETE`, and validates `comment` insert events before forwarding; it also stamps `createdAt` server-side and rejects malformed events with 400.
- Room access is currently anonymous: anyone who knows a room ID can read, post, and overwrite a comment by reusing its id. There is no per-room rate limit or quota. This matches the beta product model and is an accepted risk; there is no `AUTH_TOKEN` configured. Setting one would require the client to send an `Authorization` header.
- Clients use `createStreamDB` from `@durable-streams/state/db`; `preloadCommentsDB()` creates the stream when missing, then preloads it and stays connected via SSE.
- Old `Room` Durable Object data is not migrated. Comments written before this change are not visible to the new stream-backed app and may be deleted when the old class/Worker is cleaned up.
