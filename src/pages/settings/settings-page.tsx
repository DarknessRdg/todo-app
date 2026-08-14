import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Text } from "@/components/ui/text";
import { testProp } from "@/lib/test-id";

/**
 * The app's preferences, such as they are.
 *
 * Deliberately short. Everything this app knows lives in the todos themselves
 * and in IndexedDB — there is no account, no sync, and nothing to configure
 * about either. A settings page padded out with rows that toggle nothing would
 * be the dead search box again: an affordance that answers a click by doing
 * nothing is worse than no affordance. Sections land here as real settings
 * appear, not before.
 */
export function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Text variant="eyebrow" className="mb-1">
          Workspace
        </Text>
        <Text testId="settings.page.title" variant="h1">
          Settings
        </Text>
      </div>

      <SettingsSection
        title="Appearance"
        description="How the app looks on this device. Kept here rather than on a todo — it is a property of the screen you are reading, not of the work.">
        <ThemeToggle
          testId="settings.appearance.theme.toggle"
          // Edge to edge inside the card, where the sidebar's copy is a compact
          // icon: there is room for the setting to say its own name here.
          className="-mx-2"
        />
      </SettingsSection>
    </div>
  );
}

/**
 * One group of settings. Filled and borderless, like every other card on the
 * canvas — the fill is what separates it from the page, not a hairline.
 */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      {...testProp(`settings.section.${title.toLowerCase()}`)}
      className="bg-card flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex flex-col gap-1">
        <Text variant="h3" as="h2">
          {title}
        </Text>
        {description ? <Text variant="muted">{description}</Text> : null}
      </div>

      {children}
    </section>
  );
}
