import { screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { describe, expect, it } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarProjects } from "@/layout/sidebar-projects";
import {
  createTestContainer,
  inMemoryProjectRepository,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeProject, makeTodo } from "@/test/todo-factory";

const addButton = "sidebar.project.create.button";
const addInput = "sidebar.project.create.input";
const link = (id: string) => `sidebar.project.${id}.link`;
const count = (id: string) => `sidebar.project.${id}.count`;

function renderProjects({
  projects = [],
  todos = [],
}: {
  projects?: ReturnType<typeof makeProject>[];
  todos?: ReturnType<typeof makeTodo>[];
} = {}) {
  const projectRepository = inMemoryProjectRepository(projects);

  return {
    ...renderWithContainer(
      <SidebarProvider>
        <SidebarProjects />
      </SidebarProvider>,
      {
        diContainer: createTestContainer(
          inMemoryTodoRepository(todos),
          projectRepository
        ),
        route: "/",
      }
    ),
    projectRepository,
  };
}

describe("sidebar projects", () => {
  describe("when the sidebar loads", () => {
    it("Then every stored project is listed", async () => {
      const garden = makeProject({ name: "Garden" });
      renderProjects({ projects: [garden] });

      expect(await screen.findByTestId(link(garden.id))).toHaveTextContent(
        "Garden"
      );
    });

    it("Then each one links to its own page", async () => {
      const garden = makeProject({ name: "Garden" });
      renderProjects({ projects: [garden] });

      expect(await screen.findByTestId(link(garden.id))).toHaveAttribute(
        "href",
        `/project/${garden.id}`
      );
    });

    it("Then its open todos are counted", async () => {
      const garden = makeProject();
      renderProjects({
        projects: [garden],
        todos: [
          makeTodo({ projectId: garden.id, done: false }),
          makeTodo({ projectId: garden.id, done: false }),
        ],
      });

      expect(await screen.findByTestId(count(garden.id))).toHaveTextContent("2");
    });

    it("Then finished todos are left out of the count", async () => {
      const garden = makeProject();
      renderProjects({
        projects: [garden],
        todos: [
          makeTodo({ projectId: garden.id, done: false }),
          makeTodo({ projectId: garden.id, done: true }),
        ],
      });

      expect(await screen.findByTestId(count(garden.id))).toHaveTextContent("1");
    });

    it("Then another project's todos are not counted against it", async () => {
      const garden = makeProject();
      const other = makeProject();
      renderProjects({
        projects: [garden, other],
        todos: [makeTodo({ projectId: other.id, done: false })],
      });

      await screen.findByTestId(link(garden.id));

      expect(screen.queryByTestId(count(garden.id))).not.toBeInTheDocument();
    });
  });

  describe("when I add a project from the sidebar", () => {
    it("Then it is persisted with the name I typed", async () => {
      const user = setupUser();
      const { projectRepository } = renderProjects();

      await user.click(screen.getByTestId(addButton));
      await user.type(await screen.findByTestId(addInput), "Garden{Enter}");

      await waitFor(() =>
        expect(projectRepository.create.mock.calls[0][0]).toMatchObject({
          name: "Garden",
        })
      );
    });

    it("Then it joins the list without a reload", async () => {
      const user = setupUser();
      const { projectRepository } = renderProjects();

      await user.click(screen.getByTestId(addButton));
      await user.type(await screen.findByTestId(addInput), "Garden{Enter}");

      await waitFor(() => expect(projectRepository.create).toHaveBeenCalled());
      const created = projectRepository.create.mock.calls[0][0];

      expect(await screen.findByTestId(link(created.id))).toHaveTextContent(
        "Garden"
      );
    });

    it("Then a blank name creates nothing", async () => {
      const user = setupUser();
      const { projectRepository } = renderProjects();

      await user.click(screen.getByTestId(addButton));
      await user.type(await screen.findByTestId(addInput), "   {Enter}");

      await waitFor(() =>
        expect(screen.queryByTestId(addInput)).not.toBeInTheDocument()
      );
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it("Then escaping abandons it", async () => {
      const user = setupUser();
      const { projectRepository } = renderProjects();

      await user.click(screen.getByTestId(addButton));
      await user.type(await screen.findByTestId(addInput), "Garden{Escape}");

      await waitFor(() =>
        expect(screen.queryByTestId(addInput)).not.toBeInTheDocument()
      );
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it("Then it is created once, not once per way of closing the field", async () => {
      const user = setupUser();
      const { projectRepository } = renderProjects();

      await user.click(screen.getByTestId(addButton));
      const field = await screen.findByTestId(addInput);
      await user.type(field, "Garden{Enter}");

      await waitFor(() => expect(projectRepository.create).toHaveBeenCalled());
      expect(projectRepository.create).toHaveBeenCalledTimes(1);
    });
  });
});
