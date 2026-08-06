# "Studio" — Design System Reference

> Clean monochrome product surface, shared company design language.
> Modeled on the **BizLink** reference (a light CRM dashboard). This is the
> **current, authoritative** system. `notion-style-reference.md` is superseded.

**Theme:** light-first, with a neutral dark inversion.

The surface reads like a calm, editorial workspace: a **white canvas**, content
grouped into **light-gray filled cards with no borders** (like recessed panels),
a single **pale-sage** tint used for one hero/stats panel and positive states, and
**ink-black** reserved for the primary action and selected items. Generous
whitespace, soft-rounded corners, monochrome throughout — color is structure and
contrast, not decoration.

## Colors (the whole system)

| Name | Hex | Role | Token |
|------|-----|------|-------|
| White | `#ffffff` | Page canvas, sidebar, elevated menus/dialogs | `--background`, `--popover`, `--sidebar` |
| Mist | `#f4f4f4` | **Filled, borderless** cards; chips; ghost buttons; inputs bg | `--card`, `--secondary`, `--muted` |
| Sage | `#f6f7ed` | The one accent tint — hero stats panel, hover, Done/positive | `--accent`, `--color-sage` |
| Ink | `#1f1f1f` | Primary text; the single dark action button; selected/Urgent | `--foreground`, `--primary`, `--color-ink` |

Supporting: `--muted-foreground` `#737373` (secondary text), `--border` `#e7e7e7`
(soft dividers / input hairline), `--destructive` `#d64545` (the only non-mono color,
delete only), `--ring` `#1f1f1f` (ink focus). Registered neutral-named brand
constants: `--color-ink`, `--color-sage`, `--color-mist`.

Charts / data: a **grayscale ramp** (`#1f1f1f → #737373 → #a3a3a3 → #d4d4d4`) with
one deep-sage step (`#c7cbb0`). No rainbow categorical colors.

## Surfaces

| Level | Value | Purpose |
|-------|-------|---------|
| Canvas | `#ffffff` | The page. Sidebar and top bar share it. |
| Card (recessed) | `#f4f4f4` | Task cards, stat tiles, chips — **fill, no border**. |
| Accent panel | `#f6f7ed` | The hero stats band and hover state — the single tint. |
| Selected / emphasis | `#1f1f1f` | Ink fill with white text (selected card, Urgent, primary button). |

## Typography

- **Inter** everywhere (`--font-sans` / `--font-display`). No serif.
- Weights: 400 body, 500 UI/nav, 600 headings/titles.
- Page title ~24px semibold `tracking-tight`; section/column headers ~16px semibold
  paired with a **count chip** (`.count-chip`); big stat numbers 24–36px semibold
  with `tabular-nums`.
- Secondary text uses `--muted-foreground`; small labels use `.eyebrow`
  (`text-xs font-medium`, muted — sentence case, not uppercase).
- **Mono** (`--font-mono`, JetBrains Mono) is reserved for **code only**.

## Shape & spacing

- **Radius** `--radius` = 14px. Cards `rounded-2xl` (~16px); the primary submit and
  count chips are `rounded-full`; small controls `rounded-md`.
- Base spacing unit 4px; comfortable density. Cards ~`px-4 py-3.5`; hero panel
  `px-6/8 py-6`; generous gaps between sections.

## Components

- **Sidebar** — white panel (subtle border to define it against the white canvas).
  Muted nav links that darken on hover; active item = **gray pill** (`bg-muted`) with
  ink text + ink icon and a right-aligned count. Grouped sections (Views / Projects /
  Members) with `.eyebrow` labels; a filled-gray search field (no border) with a `/`
  `.kbd` hint.
- **Hero stats panel** — the signature element: a `bg-accent` (sage) `rounded-2xl`
  band with big stat numbers and a small ink **progress ring**.
- **Capture bar** — filled-gray `rounded-2xl` bar, borderless, with an ink
  **`rounded-full` submit** on the right (the one dark action).
- **Task card** — `bg-card` filled, no border, `rounded-2xl`; hover shifts to
  `bg-accent` (sage); done rows drop to ~60% opacity. Title + a meta row of chips.
- **Badges / chips** — soft gray fills (`--secondary`) with icons. Priority escalates
  by **fill darkness** (`bg-foreground/[0.06] → [0.09] → [0.16]`, Urgent = solid ink /
  inverted text). Status: Done = sage, Open = gray. Due/project/labels = gray chips.
- **Count chip** (`.count-chip`) — soft gray rounded rect with a number, beside
  column/section headers.

## Do / Don't

**Do**
- Use white canvas + gray filled cards; reserve sage for one hero panel, hovers, and
  positive/Done states.
- Keep it monochrome; escalate with the gray→ink ramp and darkness, not new hues.
- Use ink for exactly one primary action per view (rounded/pill).
- Group with whitespace and soft-round corners; use count chips beside headers.

**Don't**
- Don't add borders to content cards (fill distinguishes them). Don't add shadows or
  gradients.
- Don't introduce categorical/brand colors for badges or charts — grayscale + the
  single sage accent only. (`--destructive` red is the sole exception, delete-only.)
- Don't use serif or mono for UI (mono = code only).
- Don't hard-code hexes in components — go through the semantic tokens.

## Dark theme

Neutral monochrome inversion (`.dark` in `src/index.css`): canvas `#161616`, filled
cards `#1f1f1f`, light primary `#f4f4f4` (inverted ink), muted dark-sage accent
`#2a2c22`. Same rules — filled cards, monochrome, flat, single accent.
