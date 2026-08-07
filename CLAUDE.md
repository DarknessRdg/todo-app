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

## Testing policy

**Behavior changes start from a test.** Before writing the implementation for any
change that alters what the app *does*, write the failing Vitest test first, then
make it pass. This is not optional and not something to retrofit after the fact.
Vitest is the only test runner.

**Specs live next to the file they cover — always.** `todo-service.ts` is tested by
`todo-service.test.ts` in the same directory, `todo.tsx` by `todo.test.tsx` beside
it. Do **not** collect specs into a separate test directory; the only things that
belong in `src/test/` are shared harness files that are not themselves tests
(`setup.ts`, `container.tsx`). A root-level `test/` folder is reserved for
future A/B tests — do not put unit or interaction specs there.

### What MUST be covered

- **Business logic — always, no exceptions.** Anything in `src/backend/`
  (`todo-service.ts`, the repository adapters), `src/lib/`, and `src/validators/`.
  Every branch of a service method, every validation rule.
- **User interaction** in `src/pages/` and `src/components/` — a button click, an
  input blur, a keyboard shortcut, form submit, toggling a checkbox, opening a
  modal, navigation triggered by a click. If a user can do it and the app reacts,
  there is a test asserting the reaction.

### What must NOT be tested

Do not write tests for presentation. No assertions on colors, Tailwind class
names, DOM structure/nesting, spacing, or which element wraps which. These change
constantly and the churn is not wanted. A test that breaks when a `className`
changes is a bug in the test. Assert on **behavior and output** — what the user
sees happen and what the service was asked to do — never on markup shape.

### Spec naming — `component` > `action` > `…N side effects`

Every spec is a nesting path, read outermost → innermost, exactly like the test-id
path below:

```
"component"  >  "when <action>"  >  "Then <side effect 1>"
                                 >  "Then <side effect 2>"
                                 >  "Then <side effect N>"
```

- **Level 1 — the component.** The outer `describe` names the unit under test as
  the app calls it: `"todo list"`, `"todo detail modal"`, `"TodoCheckerInput"`,
  `"TodoService"`. No `"… component"` / `"… tests"` suffixes.
- **Level 2 — the action.** One `describe` per thing the user (or caller) does,
  phrased `"when I …"` / `"when the …"`: `"when I complete a todo"`,
  `"when I delete a todo"`, `"when the page loads"`.
- **Level N — one `it` per side effect** that action produces, each opening with
  `Then` and naming *only* the outcome: `"Then it moves from the open section to
  the done section"`, `"Then it updates the counts"`.

```tsx
describe("todo list", () => {
  describe("when I complete a todo", () => {
    it("Then it moves from the open section to the done section", async () => { … });
    it("Then it updates the counts", async () => { … });
  });

  describe("when I delete a todo", () => {
    it("Then it is removed from the screen", async () => { … });
    it("Then it updates the counts", async () => { … });
    it("Then cancelling keeps it and leaves the counts alone", async () => { … });
  });
});
```

Rules that keep the path honest:

- **One side effect per `it`.** An action that changes the list *and* the counts is
  two `it`s under the same action, never one test asserting both — splitting is
  what makes a failure name the broken thing.
- **Collapse the action level when there is exactly one side effect.** Fold it into
  the `it` as a full sentence — `it("when clicked while done, Then reports the
  reopen", …)` — rather than writing a `describe` that holds a single `it`.
- **Never restate the action inside the `it`.** The action level already carries it;
  the `it` starts at `Then`.
- **No `should`, no bare verbs.** `it("Then the url carries its id")`, not
  `it("should update the url")`.

### Selecting elements — `data-test-id`, nothing else

UI tests **must** locate every element they touch by its test id. Walking the DOM
is banned: no `container.querySelector`, no `.firstChild`/`parentElement`
chains, no "the second button inside the third div", and no matching on visible
copy or class names. Those break the moment the markup or wording is reordered,
which is exactly the churn this policy exists to avoid.

```tsx
// ✅ the only accepted form
await user.click(screen.getByTestId("home.todo.1234.check.button"));

// ❌ brittle — structure, copy, and classes all change freely
container.querySelector(".todo-row button");
screen.getByText("Complete");
screen.getByRole("checkbox");
```

**Rules for the id value:**

- **Unique per rendered document**, exactly like a DOM `id`. Two elements on
  screen never carry the same test id — for list rows, include the entity id to
  disambiguate.
- **Semantic dotted path**, read outermost → innermost: page, then feature, then
  entity, then element, then element kind. Lowercase, dot-separated.

  | Example | Meaning |
  |---|---|
  | `home.todo.create.input` | the new-todo text input on the home page |
  | `home.todo.123456678` | the todo row for entity `123456678` |
  | `home.todo.1234.check.button` | the complete/reopen toggle inside that row |

- Build the path from the entity id at runtime
  (`` testId={`home.todo.${todo.id}`} ``) rather than hard-coding row ids.

**Every reusable component must accept a `testId` prop** and spread it onto its
root element as `data-test-id`. A component that cannot be targeted by test id is
not finished. Compose the type — never redeclare the prop:

This includes the vendored `src/components/ui/` primitives — `Button`, `Input`,
`Checkbox`, `Badge`, `DialogContent`, `AlertDialogAction`, `SelectTrigger` and
friends all take `testId`. Pass the prop (`testId="home.todo.create.submit"`)
rather than spreading `testProp()` at the call site; only tag a raw DOM element
directly, and re-apply `testId` when regenerating a shadcn component. The one
component that cannot take the prop plainly is `RichTextEditor`: its editable
element is rendered by ProseMirror, so the id rides along in Tiptap's
`editorProps.attributes`.

**Never write the `data-test-id` attribute by hand.** `src/lib/test-id.ts` owns
both the type and the attribute spelling; components spread the result of
`testProp()` so the attribute name can never be typo'd:

```ts
// src/lib/test-id.ts
export type TestIdProps = { testId?: string };

/** Spread onto an element to tag it. Emits nothing when testId is undefined. */
export function testProp(testId?: string): { "data-test-id"?: string } {
  return testId === undefined ? {} : { "data-test-id": testId };
}
```

```tsx
// any reusable component
type TodoCheckerInputProps = CheckboxProps & TestIdProps;

function TodoCheckerInput({ testId, ...props }: TodoCheckerInputProps) {
  return <Checkbox {...props} {...testProp(testId)} />;
}
```

Returning `{}` for an absent id matters: writing `data-test-id={testId}` inline
would stamp `data-test-id="undefined"` onto untagged elements, which then collide
with each other and break the uniqueness rule.

Note the attribute is `data-test-id` (with the second dash). Testing Library
queries `data-testid` by default, so `src/test/setup.ts` must call
`configure({ testIdAttribute: "data-test-id" })` for `getByTestId` to work.

### Mocking — use the ports, that is what they are for

The hexagonal structure exists so tests can swap implementations. Do not reach for
module-level monkey-patching:

- To test `TodoService`, hand it a **fake/mock `TodoRepository`** (the port
  interface in `src/backend/todo-service.ts`). Never touch IndexedDB in a test.
- To test a page or hook, build a test container binding
  `Dependencies.TodoService` to a mock, and provide it through `ContainerContext`
  — the same seam `useContainer()` reads from in production.
- Use `vi.fn()` for the mock methods and assert on the calls (was `create` called
  with the right payload?) rather than on rendered markup.

### Fixtures — generated, not literal

Build entities with the factories in `src/test/todo-factory.ts` (`makeTodo`,
`makeCreateTodo`), never hand-written object literals. Values are randomised with
faker so a spec cannot quietly come to depend on a value it never declared.

The rule that keeps this honest: **anything a test asserts on or branches on, it
passes explicitly** — `makeTodo({ done: true })`. Reading a generated value back
out of the factory to assert against defeats the purpose. The exception is
pass-through assertions, where a random value proves *more* than a literal
(`create` receiving the exact title it was handed).

Runs stay reproducible: `src/test/setup.ts` seeds faker once per file and prints
the seed, so `FAKER_SEED=<n> npx vitest run` replays a failure exactly.

### The harness

Configured in `vite.config.ts` under `test`: `jsdom` environment,
`./src/test/setup.ts` as the setup file, `globals: false` (import `describe`/`it`/
`expect` from `vitest` explicitly, matching the existing specs), and
`restoreMocks` so spies reset between tests. `src/test/setup.ts` registers the
`@testing-library/jest-dom` matchers, runs RTL `cleanup()` after each test, and
stubs `matchMedia`/`ResizeObserver` — jsdom implements neither, and Radix
primitives reach for both.

Helpers live in `src/test/container.tsx`:

- `mockTodoRepository(overrides?)` — a `vi.fn()`-backed fake of the
  `TodoRepository` port, every method resolving an empty default.
- `createTestContainer(repository?)` — the production container shape bound to a
  mock repository. Synchronous, unlike `createDIContainer()`, because no
  IndexedDB is opened.
- `renderWithContainer(ui, { container? })` — renders through the real seams:
  `ContainerContext` (what `useContainer()` reads) plus a `QueryClientProvider`
  with retries disabled.

Both helpers are fully typed against the port: `MockTodoRepository` maps each
method to `Mock<TodoRepository[K]>`, so `repository.create.mock.calls[0][0]` is a
`TodoEntity` (not `any`) and `mockResolvedValue` is checked against the real
return type. There is no `as` cast — adding a method to `TodoRepository` breaks
`mockTodoRepository()` until it is handled.

Reference examples: `src/components/todo.test.tsx` (DOM interaction) and
`src/backend/todo-service.test.ts` (service through the container).

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

Secondary text = `--muted-foreground` `#737373`. Colour outside the ramp exists
in exactly three places, all of them token-driven:

| Token(s) | Where | Why it is allowed |
|---|---|---|
| `--destructive` `#d64545` | delete only | destruction must not read as an ordinary action |
| `--link` `#2563eb` (`#7ba7f5` dark) | `.tiptap a` | a link that looks like body text is not a link |
| `--code-keyword` / `-string` / `-number` / `-function` / `-comment` | `.tiptap .hljs-*` | syntax highlighting is information, not decoration |

The code palette is deliberately desaturated to sit on the mist/ink surfaces —
retune those five variables (in **both** `:root` and `.dark`) rather than adding
hues elsewhere. **The chrome around code stays monochrome**: `pre` keeps its
`bg-muted` fill, and colour appears only on the tokens inside it. Nothing outside
this table gets a hue.

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
