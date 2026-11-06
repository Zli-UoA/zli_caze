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
vp test               # Vitest (node environment, src/**/*.test.{ts,tsx})
vp build              # Void production build
```

## Preview / Deploy

```bash
pnpm run preview     # vp build && vp preview
pnpm run deploy      # void deploy --platform cloudflare --atomic
```

## Notes

- `@tanstack/db` and `@tanstack/react-db` must be upgraded together (exact pins: `0.4.1` / `0.1.23`).
- `void prepare` generates `.void/` types. `.void/` and `.cloudflare/` are gitignored.
- Pages live in `pages/`, API routes in `routes/`, and Durable Objects in `durable-objects/`.
- PartyKit-compatible WebSocket traffic is served at `/parties/room/:roomId`.
- Phase 2 renames the Durable Object class from `Room` to `RoomDurableObject`, so comments stored by the old class are not visible after the first Void deploy. Beta data loss is accepted; the deploy should be run with `--atomic`.
- For an existing Worker, link it once with Void (restoring its `wrangler.jsonc` if needed) before running the atomic deploy, and commit the updated `void.lock.json`.
