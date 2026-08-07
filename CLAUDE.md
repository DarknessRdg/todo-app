# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # Type-check (tsc -b) then production build
npm run lint       # ESLint over the repo
npm run preview    # Serve the production build
npm test           # Run Vitest (watch mode)
npx vitest run                         # Run all tests once (CI style)
npx vitest run src/lib/validator.test.ts   # Run a single test file
```

There is no separate typecheck script; `npm run build` runs `tsc -b` as its first step. Tests are colocated as `*.test.ts` next to the code they cover.

## Architecture

A client-only todo SPA (React 19 + Vite + TypeScript). All data is persisted locally in **IndexedDB** — there is no server. The code is organized around a ports-and-adapters (hexagonal) structure wired together with a DI container.

### Dependency injection (inversify)

- `src/di-container/index.ts` builds the container. `createDIContainer()` is **async** because it opens IndexedDB before binding the repository/service. The only public token is `Dependencies.TodoService`; the repository and DB handle are private (`PrivateDependencies`).
- The container is created once in `src/router.tsx` (inside a `useEffect`, gated behind a loading state) and passed down via `ContainerContext`. Components/hooks retrieve services with `useContainer()` (`src/di-container/hook.ts`) then `container.get<T>(Dependencies.X)`.
- To add a dependency: define a `Symbol.for(...)` token, bind it in `resolve()`, and consume it via the container.

### Domain / backend layer

- `src/backend/todo-service.ts` is the core. It defines the `TodoRepository` **port** (interface) and the `TodoService` that depends on it — the service never imports IndexedDB directly.
- `src/backend/adapter/indexed-db/` is the **adapter**: `indexed-db.ts` defines the DB schema/version and `OpenDb()`; `todo-repository.ts` implements `TodoRepository`. Swapping storage means writing a new adapter and rebinding the token — the service is untouched.
- Bumping the IndexedDB schema requires incrementing `DatabaseVersion` and updating the `upgrade` callback in `indexed-db.ts`.

### Validation

Zod is **not** used directly in the domain. Instead:
- Zod schemas live in the service (`createTodoZodScheme`, `todoZodScheme`).
- `src/lib/validator.ts` (`zodAsValidator`) adapts a Zod object schema into the app's own `IValidator<T>` abstraction (`src/validators/validators.ts`), which exposes `validateField` and `validateAll`.
- `validateAll` returns a `ValidationResult<T>` with an `onValidAsync(action)` helper — used in `TodoService.create` to only persist when valid.
- Zod error messages are dash-cased codes (e.g. `"title-required"`) intended as i18n/translation keys, not user-facing strings.

### Data fetching (TanStack Query)

- Each operation has a hook under `src/pages/inbox/` (`use-todo-list`, `use-todo-create`, `use-todo-update`, `use-todo-delete`, `use-todo-count`, `use-todo-details`). Each hook grabs `TodoService` from the container and wraps a `useQuery`/`useMutation`.
- Query keys are exported constants (e.g. `QueryTodoKey`, `QueryCountKey`). Mutations invalidate the affected keys in `onSuccess` — when adding a mutation, invalidate every query key whose data it changes.

### UI

- shadcn/ui components (new-york style, zinc base) live in `src/components/ui/` — generally treat these as vendored/generated; app-specific components live elsewhere in `src/components/` and `src/pages/`.
- Tailwind CSS v4 via the `@tailwindcss/vite` plugin (config is in `src/index.css`, not a `tailwind.config`). Icons from `lucide-react`. Toasts via `sonner`. Forms via `@tanstack/react-form`.
- Routing uses `react-router` (`src/router.tsx`); currently a single index route under `AppLayout`.

### Conventions

- Import alias `@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig`).
- Prettier is the formatter (`.prettierrc.json`, with `prettier-plugin-tailwindcss` for class sorting).

## Design system

The visual direction is the **"Studio" system** — a clean, monochrome product
surface modeled on the shared company design language (see the BizLink reference):
a **white canvas**, **light-gray *filled* cards with no borders**, a single
**pale-sage** accent panel, and **ink-black** for the primary action and selected
states. Restrained, editorial, lots of whitespace. The full spec lives in
`docs/design/system-reference.md` — read it before any non-trivial UI/styling work.
This section is the enforced summary. (The earlier
`docs/design/notion-style-reference.md` is **superseded** and kept only as history.)

**Golden rule — semantic tokens, neutral names.** Style through the app's semantic
tokens in `src/index.css` (`--background`, `--foreground`, `--card`, `--primary`,
`--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--ring`, …)
and the shadcn/ui layer — never hard-code hexes in components. The three literal
brand colors are registered in `@theme` under **neutral** names only: `--color-ink`
(`#1f1f1f`), `--color-sage` (`#f6f7ed`), `--color-mist` (`#f4f4f4`). Never introduce
product/company-named variables.

**Tune the token, not the component.** When a color, contrast, or hover reads
wrong, fix it by editing the variable in `src/index.css` — in **both** the `:root`
and `.dark` blocks — not by bolting a utility class onto the component that
happens to show the problem. Reach for the token that drives the surface:
`--input` for control hairlines (checkbox/textarea/calendar borders), `--card-hover`
for row hover, `--ring` for focus rings, `--border` for dividers. One token edit
fixes every consumer at once and survives regeneration of the vendored
`src/components/ui/` files. Only touch a component when no token controls the
property — and call that out when it happens.

### The four-color system

| Color | Hex | Token role |
|-------|-----|------------|
| White | `#ffffff` | `--background`, `--popover`, sidebar — the canvas. |
| Mist (light gray) | `#f4f4f4` | `--card`, `--secondary`, `--muted` — **filled, borderless** cards & chips. |
| Sage | `#f6f7ed` | `--accent` — the **single tint**: hero stats panel, hover, Done badge. |
| Ink | `#1f1f1f` | `--foreground` + `--primary` — text, the one dark action, selected/Urgent states. |

Secondary text = `--muted-foreground` `#737373`. `--destructive` `#d64545` is the
only non-monochrome color, reserved for delete.

### Rules

- **Cards are filled, not bordered** — gray `bg-card` fill on the white canvas
  distinguishes them; do **not** add hairline borders to content cards. (A subtle
  border is fine only to define same-on-same panels, e.g. the white sidebar.)
- **Monochrome** — build hierarchy with the gray→ink ramp and `--muted-foreground`,
  not new hues. Priority badges escalate by fill darkness (`bg-foreground/[0.06 →
  0.16]`, Urgent = solid ink); the **sage accent** marks positive/selected (Done,
  hero, hover).
- **No gradients**, no playful doodles — clean flat fills and generous whitespace.
- **One dark action per view** (`--primary` ink; a rounded/pill submit); everything
  else is ghost/text on gray.
- **Radius** `--radius` = 14px; cards `rounded-2xl`, pills `rounded-full` for the
  primary submit and count chips. **Type:** Inter throughout (no serif); mono
  (`--font-mono`) reserved for code only. **Motion:** ~200ms ease; the check-mark
  completion pop (`.animate-check-pop`) is the one flourish.

### Dark theme

Neutral monochrome inversion in the `.dark` block: near-black canvas `#161616`,
`#1f1f1f` filled cards, light primary `#f4f4f4`, muted dark-sage accent — same rules
(filled cards, monochrome, flat, single accent).
