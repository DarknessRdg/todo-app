import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsPage } from "@/pages/settings/settings-page";
import { renderWithContainer } from "@/test/container";
import { setupUser, waitFor } from "@/test/user";

const themeToggle = "settings.appearance.theme.toggle";

/**
 * The theme lives on the document element, not in React state — that is what
 * lets the sidebar control and this page agree without either knowing about
 * the other. Cleared between specs so one cannot start dark because the last
 * one left it that way.
 */
afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

const isDark = () => document.documentElement.classList.contains("dark");

describe("settings page", () => {
  describe("when I turn on dark mode from it", () => {
    it("Then the app goes dark", async () => {
      const user = setupUser();
      renderWithContainer(<SettingsPage />, { route: "/settings" });

      await user.click(await screen.findByTestId(themeToggle));

      await waitFor(() => expect(isDark()).toBe(true));
    });

    it("Then turning it off again brings the light theme back", async () => {
      const user = setupUser();
      renderWithContainer(<SettingsPage />, { route: "/settings" });

      const toggle = await screen.findByTestId(themeToggle);
      await user.click(toggle);
      await waitFor(() => expect(isDark()).toBe(true));

      await user.click(toggle);

      await waitFor(() => expect(isDark()).toBe(false));
    });

    it("Then the control reports the state it put the app in", async () => {
      const user = setupUser();
      renderWithContainer(<SettingsPage />, { route: "/settings" });

      const toggle = await screen.findByTestId(themeToggle);
      expect(toggle).toHaveAttribute("aria-checked", "false");

      await user.click(toggle);

      await waitFor(() =>
        expect(toggle).toHaveAttribute("aria-checked", "true")
      );
    });
  });
});
