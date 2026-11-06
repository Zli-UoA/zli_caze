# Caze (beta)

A real-time room app (Void + Vite+ + Durable Streams + TanStack DB + Cloudflare Workers) that lets you join a room by ID and post comments. A separate `/room/:roomId/view` page renders them as scrolling danmaku on canvas.

## Getting Started

> Package manager: pnpm (via `packageManager`). Do not use npm. Node version is pinned via `.node-version` (Vite+ 1.4 / Vitest 5 requires `^22.18.0 || ^24.11.0 || >=26.0.0`).

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

## Preview / Deploy

Local dev and preview are the supported targets for this PR. Do **not** deploy over the existing production Worker yet: Void cannot hand off a Worker that exports the old stateful `Room` class, and the new Durable Streams class needs a coordinated migration.

```bash
pnpm run preview     # vp build && vp preview
```

To try the build on Cloudflare, deploy it as a separate Worker first (for example set `cloudflare.name` to `zli-caze-void` in `void.config.ts`) and keep the existing Worker untouched. A production cutover needs a separate runbook and an export of any old comments that must be kept.

## Notes

- `@tanstack/db` / `@tanstack/react-db` are pinned to `0.15.2` / `0.5.12`; StreamDB requires `@tanstack/db >=0.6 <1.0`. Upgrade both together.
- `void prepare` generates `.void/` types. `.void/` and `.cloudflare/` are gitignored.
- Pages live in `pages/`, API routes in `routes/`, and Durable Objects in `durable-objects/`.
- Each room is one Durable Stream at `/streams/:roomId`. `routes/streams/[...path].ts` mounts `createStreamsHandler()`, backed by `durable-objects/streams.ts` (`defineDurableObject`, binding `STREAMS`).
- Clients use `createStreamDB` from `@durable-streams/state/db`; `preloadCommentsDB()` creates the stream when missing, then preloads it and stays connected via SSE.
- Old `Room` Durable Object data is not migrated. Comments written before this change are not visible to the new stream-backed app and may be deleted when the old class/Worker is cleaned up.
