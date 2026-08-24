import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppRouteTable } from "@/router";
import { AppVersion } from "@/lib/version";
import { readSetting, writeSetting } from "@/lib/settings";
import { renderWithContainer } from "@/test/container";
import { setupUser, waitFor } from "@/test/user";

const tab = (id: string) => `settings.tab.${id}.link`;
const panel = (id: string) => `settings.panel.${id}`;
const lightTheme = "settings.appearance.theme.light";
const darkTheme = "settings.appearance.theme.dark";
const hideDone = "settings.lists.hidedone.toggle";
const viewRead = "settings.todos.defaultview.read";
const viewWrite = "settings.todos.defaultview.write";
const version = "settings.about.version";
const author = "settings.about.author.link";
const issues = "settings.about.issues.link";

/**
 * Rendered through the real route table rather than the component: the section
 * tabs are urls, so a spec that mounted `SettingsPage` directly could not press
 * one and see the panel change.
 *
 * The theme is a class on the document element and the settings are in
 * localStorage — both outlive a render, so both are cleared between specs.
 */
function renderSettings(route = "/settings") {
  return renderWithContainer(<AppRouteTable />, { route });
}

afterEach(() => {
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

const isDark = () => document.documentElement.classList.contains("dark");

describe("settings page", () => {
  describe("when I open it", () => {
    it("Then it lands on the first group rather than an empty frame", async () => {
      renderSettings();

      expect(
        await screen.findByTestId(panel("appearance"))
      ).toBeInTheDocument();
    });

    it("Then that group is the one marked current in the switcher", async () => {
      renderSettings();

      expect(await screen.findByTestId(tab("appearance"))).toHaveAttribute(
        "aria-current",
        "page"
      );
    });

    it("Then each group is an anchor carrying its own url", async () => {
      renderSettings();

      for (const id of ["appearance", "lists", "todos", "about"]) {
        const link = await screen.findByTestId(tab(id));
        expect(link.tagName).toBe("A");
        expect(link).toHaveAttribute("href", `/settings/${id}`);
      }
    });
  });

  describe("when I switch to another group", () => {
    it("Then its panel replaces the one before it", async () => {
      const user = setupUser();
      renderSettings();

      await user.click(await screen.findByTestId(tab("lists")));

      expect(await screen.findByTestId(panel("lists"))).toBeInTheDocument();
      expect(screen.queryByTestId(panel("appearance"))).not.toBeInTheDocument();
    });

    it("Then the url says which group is open, so it can be linked to", async () => {
      const user = setupUser();
      const { currentLocation } = renderSettings();

      await user.click(await screen.findByTestId(tab("todos")));

      await waitFor(() => expect(currentLocation()).toBe("/settings/todos"));
    });
  });

  it("when I open a group by its url, Then that is the one shown", async () => {
    renderSettings("/settings/lists");

    expect(await screen.findByTestId(panel("lists"))).toBeInTheDocument();
  });

  /**
   * Falling back silently would leave the address bar naming a group that is
   * not on screen, which is a link that lies when it is shared.
   */
  it("when the url names a group that does not exist, Then it is corrected", async () => {
    const { currentLocation } = renderSettings("/settings/nonsense");

    await screen.findByTestId(panel("appearance"));
    await waitFor(() => expect(currentLocation()).toBe("/settings"));
  });

  it("when I open the about group, Then it names the build the app is running", async () => {
    renderSettings("/settings/about");

    expect(await screen.findByTestId(version)).toHaveTextContent(AppVersion);
  });

  describe("when I open the about group", () => {
    it("Then the author's profile is a link out to it", async () => {
      renderSettings("/settings/about");

      const link = await screen.findByTestId(author);

      expect(link).toHaveAttribute("href", "https://github.com/DarknessRdg");
    });

    it("Then the project's issues are a link out to them", async () => {
      renderSettings("/settings/about");

      expect(await screen.findByTestId(issues)).toHaveAttribute(
        "href",
        "https://github.com/DarknessRdg/todo-app/issues"
      );
    });

    it("Then that link opens away from the app rather than replacing it", async () => {
      renderSettings("/settings/about");

      expect(await screen.findByTestId(author)).toHaveAttribute(
        "target",
        "_blank"
      );
      expect(await screen.findByTestId(issues)).toHaveAttribute(
        "target",
        "_blank"
      );
    });
  });

  describe("when I pick a theme", () => {
    it("Then the app takes it", async () => {
      const user = setupUser();
      renderSettings();

      await user.click(await screen.findByTestId(darkTheme));

      await waitFor(() => expect(isDark()).toBe(true));
    });

    it("Then picking the other one back brings the light theme", async () => {
      const user = setupUser();
      renderSettings();

      await user.click(await screen.findByTestId(darkTheme));
      await waitFor(() => expect(isDark()).toBe(true));

      await user.click(screen.getByTestId(lightTheme));

      await waitFor(() => expect(isDark()).toBe(false));
    });

    it("Then only the chosen one reads as selected", async () => {
      const user = setupUser();
      renderSettings();

      await user.click(await screen.findByTestId(darkTheme));

      await waitFor(() =>
        expect(screen.getByTestId(darkTheme)).toHaveAttribute(
          "aria-checked",
          "true"
        )
      );
      expect(screen.getByTestId(lightTheme)).toHaveAttribute(
        "aria-checked",
        "false"
      );
    });
  });

  describe("when I choose to hide done todos", () => {
    it("Then the choice is stored", async () => {
      const user = setupUser();
      renderSettings("/settings/lists");

      await user.click(await screen.findByTestId(hideDone));

      await waitFor(() => expect(readSetting("hideDone")).toBe(true));
    });

    it("Then the control shows what was already chosen when I come back", async () => {
      writeSetting("hideDone", true);
      renderSettings("/settings/lists");

      expect(await screen.findByTestId(hideDone)).toBeChecked();
    });
  });

  describe("when I choose which way a description opens", () => {
    it("Then the choice is stored", async () => {
      const user = setupUser();
      renderSettings("/settings/todos");

      await user.click(await screen.findByTestId(viewRead));

      await waitFor(() => expect(readSetting("defaultTodoView")).toBe("read"));
    });

    it("Then writing is what is selected until something else is chosen", async () => {
      renderSettings("/settings/todos");

      expect(await screen.findByTestId(viewWrite)).toHaveAttribute(
        "aria-checked",
        "true"
      );
    });
  });
});
