# Caze (beta)

A real-time room app (Void + Vite+ + TanStack DB + Cloudflare Workers) that lets you join a room by ID and post comments. A separate `/room/:roomId/view` page renders them as scrolling danmaku on canvas.

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

Phase 2 is verified with local dev and preview. Do **not** deploy it to the existing production Worker yet: the Durable Object class and storage keys change, and Void cannot hand off an existing Worker that exports stateful classes.

```bash
pnpm run preview     # vp build && vp preview
```

To try Phase 2 on Cloudflare, deploy it as a separate Worker first (for example set `cloudflare.name` to `zli-caze-void` in `void.config.ts`) and keep the existing Worker untouched. Phase 3 replaces the Durable Object with Durable Streams; its deployment runbook will handle the production cutover.

## Notes

- `@tanstack/db` and `@tanstack/react-db` must be upgraded together (exact pins: `0.4.1` / `0.1.23`).
- `void prepare` generates `.void/` types. `.void/` and `.cloudflare/` are gitignored.
- Pages live in `pages/`, API routes in `routes/`, and Durable Objects in `durable-objects/`.
- PartyKit-compatible WebSocket traffic is served at `/parties/room/:roomId`.
- Phase 2 renames the Durable Object class from `Room` to `RoomDurableObject`. Old comments are stored under the old class and are not visible to the new class; they may be permanently removed when the old Worker/class is cleaned up. No data migration is included.
- Because the old Worker exports the stateful `Room` class, Void cannot link it while adding `RoomDurableObject`. Any eventual production replacement must either delete/replace the old Worker once its data is exported, or deploy under a new Worker name.
- For a same-name replacement, export any needed comment data first. Atomic deploys cross a Durable Object migration boundary and cannot be rolled back across it.
