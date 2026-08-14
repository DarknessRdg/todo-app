import { ListChecks, Palette, SquarePen, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";

import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { useSetting } from "@/hooks/use-setting";
import { useTheme } from "@/hooks/use-theme";
import { testProp } from "@/lib/test-id";
import { cn } from "@/lib/utils";

/**
 * The app's preferences, grouped by what they are about rather than listed in
 * one column.
 *
 * The groups are urls, not local state: `/settings/lists` can be linked to,
 * opened in a new tab and returned to with the back button, the same way every
 * view in the sidebar can. A tab switcher that only lives in memory quietly
 * makes a page unlinkable.
 */

type SectionId = "appearance" | "lists" | "todos";

type Section = {
  id: SectionId;
  title: string;
  /** What the group is about, said once at the top of its panel. */
  summary: string;
  icon: LucideIcon;
};

const sections: Section[] = [
  {
    id: "appearance",
    title: "Appearance",
    summary: "How the app looks on this device.",
    icon: Palette,
  },
  {
    id: "lists",
    title: "Lists",
    summary: "What your todo lists put on screen, and what they leave out.",
    icon: ListChecks,
  },
  {
    id: "todos",
    title: "Todos",
    summary: "How a todo opens when you go into it.",
    icon: SquarePen,
  },
];

/** The group `/settings` itself lands on. */
const FirstSection = sections[0];

export function SettingsPage() {
  const { section: requested } = useParams();
  const current = sections.find((section) => section.id === requested);

  // A group that does not exist is corrected in the url rather than quietly
  // shown as another one — otherwise the address bar says `/settings/nonsense`
  // while the page shows Appearance, and the link is a lie when it is shared.
  if (requested !== undefined && current === undefined) {
    return <Navigate to="/settings" replace />;
  }

  const active = current ?? FirstSection;

  return (
    // Full width and left aligned, like a todo's own page: the switcher and
    // the panel are already a two-column layout, so centring a narrow column
    // as well only pushes the tabs into the middle of the screen.
    <div className="w-full">
      <div className="mb-6">
        <Text variant="eyebrow" className="mb-1">
          Workspace
        </Text>
        <Text testId="settings.page.title" variant="h1">
          Settings
        </Text>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <SectionTabs active={active.id} />

        <section
          {...testProp(`settings.panel.${active.id}`)}
          className="min-w-0 grow">
          <div className="mb-4">
            <Text variant="h3" as="h2">
              {active.title}
            </Text>
            {/* The page is full width; a line of prose is not. Capped where
                it is written rather than by narrowing the whole layout. */}
            <Text variant="muted" className="max-w-prose">
              {active.summary}
            </Text>
          </div>

          <Panel section={active.id} />
        </section>
      </div>
    </div>
  );
}

/**
 * The vertical switcher. Anchors rather than buttons, for the reason the
 * sidebar's views are anchors: a real href can be opened in a new tab and
 * copied, where a button that fakes navigation cannot.
 */
function SectionTabs({ active }: { active: SectionId }) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-44 md:flex-col md:overflow-visible">
      {sections.map((section) => {
        const current = section.id === active;

        return (
          <Link
            key={section.id}
            to={`/settings/${section.id}`}
            aria-current={current ? "page" : undefined}
            data-active={current}
            {...testProp(`settings.tab.${section.id}.link`)}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              // Selected is the ink fill the design system reserves for it,
              // not a coloured left edge — the same mark the sidebar makes.
              "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
            )}>
            <section.icon className="size-4" />
            {section.title}
          </Link>
        );
      })}
    </nav>
  );
}

function Panel({ section }: { section: SectionId }) {
  switch (section) {
    case "appearance":
      return <AppearanceSettings />;
    case "lists":
      return <ListsSettings />;
    case "todos":
      return <TodoSettings />;
  }
}

/* -------------------------------------------------------------------------- */
/* Appearance                                                                   */
/* -------------------------------------------------------------------------- */

function AppearanceSettings() {
  const { isDark, setIsDark } = useTheme();

  return (
    <SettingCard>
      <SettingHeading
        title="Theme"
        description="Shown as it will look, so the choice is made by eye rather than by name."
      />

      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex flex-wrap gap-3">
        <ThemePreview
          testId="settings.appearance.theme.light"
          label="Light"
          selected={!isDark}
          onSelect={() => setIsDark(false)}
          canvas="bg-white"
          sidebar="bg-mist"
          card="bg-mist"
          line="bg-ink/70"
          faintLine="bg-ink/25"
        />
        <ThemePreview
          testId="settings.appearance.theme.dark"
          label="Dark"
          selected={isDark}
          onSelect={() => setIsDark(true)}
          canvas="bg-night"
          sidebar="bg-graphite"
          card="bg-graphite"
          line="bg-mist/80"
          faintLine="bg-mist/30"
        />
      </div>
    </SettingCard>
  );
}

/**
 * A theme, drawn rather than named: a miniature of the app in that theme's
 * colours — sidebar, canvas, a line of text, a card.
 *
 * Every colour here is passed in as a theme-independent class (`--color-night`
 * and friends, registered under neutral names in `index.css`). Reading them
 * from the semantic tokens would be the one thing a preview must not do: those
 * flip with the active theme, so both cards would show whichever theme you are
 * already in.
 */
function ThemePreview({
  testId,
  label,
  selected,
  onSelect,
  canvas,
  sidebar,
  card,
  line,
  faintLine,
}: {
  testId: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  canvas: string;
  sidebar: string;
  card: string;
  line: string;
  faintLine: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      {...testProp(testId)}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-xl p-2 transition-colors",
        selected ? "bg-accent" : "hover:bg-accent/60"
      )}>
      <span
        aria-hidden
        className={cn(
          "flex h-20 w-32 overflow-hidden rounded-lg ring-1 transition-shadow",
          canvas,
          // The selected card is ringed in ink; the others take the ordinary
          // hairline, so exactly one of them ever reads as chosen.
          selected ? "ring-primary ring-2" : "ring-border"
        )}>
        <span className={cn("w-1/3 border-r-0 p-1.5", sidebar)}>
          <span className={cn("block h-1 w-full rounded-full", faintLine)} />
          <span
            className={cn("mt-1 block h-1 w-2/3 rounded-full", faintLine)}
          />
        </span>

        <span className="flex flex-1 flex-col gap-1.5 p-2">
          <span className={cn("h-1.5 w-3/4 rounded-full", line)} />
          <span className={cn("h-1 w-1/2 rounded-full", faintLine)} />
          <span className={cn("mt-auto h-4 w-full rounded", card)} />
        </span>
      </span>

      <span className="flex items-center gap-1.5 px-0.5 text-sm font-medium">
        {label}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Lists                                                                        */
/* -------------------------------------------------------------------------- */

function ListsSettings() {
  const [hideDone, setHideDone] = useSetting("hideDone");

  return (
    <SettingCard>
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          testId="settings.lists.hidedone.toggle"
          checked={hideDone}
          onCheckedChange={(checked) => setHideDone(checked === true)}
          className="mt-0.5"
        />
        <span className="flex max-w-prose flex-col gap-1">
          <Text as="span">Hide done todos</Text>
          <Text variant="muted" as="span">
            Leaves the Done section out of every list. Nothing is deleted —
            completed todos are still there, and turning this off brings the
            section back.
          </Text>
        </span>
      </label>
    </SettingCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Todos                                                                        */
/* -------------------------------------------------------------------------- */

function TodoSettings() {
  const [defaultView, setDefaultView] = useSetting("defaultTodoView");

  return (
    <SettingCard>
      <SettingHeading
        title="Default description view"
        description="Where a todo's description starts. Either way, the toggle on the todo itself still switches it for that visit."
      />

      <div
        role="radiogroup"
        aria-label="Default description view"
        className="flex flex-wrap gap-3">
        <ChoiceCard
          testId="settings.todos.defaultview.write"
          label="Writing"
          description="Clicking the description opens the editor."
          selected={defaultView === "write"}
          onSelect={() => setDefaultView("write")}
        />
        <ChoiceCard
          testId="settings.todos.defaultview.read"
          label="Reading"
          description="The description stays text you can select and copy."
          selected={defaultView === "read"}
          onSelect={() => setDefaultView("read")}
        />
      </div>
    </SettingCard>
  );
}

function ChoiceCard({
  testId,
  label,
  description,
  selected,
  onSelect,
}: {
  testId: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      {...testProp(testId)}
      onClick={onSelect}
      className={cn(
        "flex max-w-64 flex-1 flex-col gap-1 rounded-xl p-3 text-left ring-1 transition-colors",
        selected
          ? "bg-accent ring-primary ring-2"
          : "ring-border hover:bg-accent/60"
      )}>
      <Text as="span" className="text-sm font-medium">
        {label}
      </Text>
      <Text variant="muted" as="span" className="text-xs">
        {description}
      </Text>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared furniture                                                             */
/* -------------------------------------------------------------------------- */

/** Filled and borderless, like every other card on the canvas. */
function SettingCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card flex flex-col gap-4 rounded-2xl p-5">
      {children}
    </div>
  );
}

function SettingHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-prose flex-col gap-1">
      <Text as="span" className="text-sm font-medium">
        {title}
      </Text>
      <Text variant="muted" as="span">
        {description}
      </Text>
    </div>
  );
}
