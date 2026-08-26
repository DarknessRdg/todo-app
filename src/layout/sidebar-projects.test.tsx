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
const toggle = (id: string) => `sidebar.project.${id}.toggle`;
const addChild = (id: string) => `sidebar.project.${id}.add.button`;
const rowMenu = (id: string) => `sidebar.project.${id}.menu.button`;
const renameItem = (id: string) => `sidebar.project.${id}.rename.button`;
const renameInput = (id: string) => `sidebar.project.${id}.rename.input`;
const moveSection = (id: string) => `sidebar.project.${id}.move.label`;
const moveTo = (id: string, target: string) =>
  `sidebar.project.${id}.move.${target}.button`;
const deleteItem = (id: string) => `sidebar.project.${id}.delete.button`;
const deleteConfirm = "sidebar.project.delete.confirm";
const deleteCancel = "sidebar.project.delete.cancel";
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

  /**
   * Three levels, and no more — the rule itself is specced in
   * `project-tree.test.ts`; these are about the sidebar offering exactly what
   * the rule allows.
   */
  describe("when I add a project inside another", () => {
    it("Then it is created under that project", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const { projectRepository } = renderProjects({ projects: [work] });

      await user.click(await screen.findByTestId(addChild(work.id)));
      await user.type(screen.getByTestId(addInput), "Website");
      await user.keyboard("{Enter}");

      await waitFor(() =>
        expect(projectRepository.create.mock.calls[0][0]).toMatchObject({
          name: "Website",
          parentId: work.id,
        })
      );
    });

    it("Then it appears nested under it, without a reload", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      renderProjects({ projects: [work] });

      await user.click(await screen.findByTestId(addChild(work.id)));
      await user.type(screen.getByTestId(addInput), "Website");
      await user.keyboard("{Enter}");

      // A project with children grows a chevron; one without does not.
      expect(await screen.findByTestId(toggle(work.id))).toBeInTheDocument();
    });

    it("Then a project already three deep offers no way to add one", async () => {
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const launch = makeProject({ name: "Launch", parentId: website.id });
      renderProjects({ projects: [work, website, launch] });

      await screen.findByTestId(link(launch.id));

      expect(screen.getByTestId(addChild(website.id))).toBeInTheDocument();
      expect(screen.queryByTestId(addChild(launch.id))).not.toBeInTheDocument();
    });
  });

  describe("when I collapse a project", () => {
    it("Then its children are taken off the list", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      renderProjects({ projects: [work, website] });

      await user.click(await screen.findByTestId(toggle(work.id)));

      await waitFor(() =>
        expect(screen.queryByTestId(link(website.id))).not.toBeInTheDocument()
      );
      expect(screen.getByTestId(link(work.id))).toBeInTheDocument();
    });

    it("Then opening it again brings them back", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      renderProjects({ projects: [work, website] });

      await user.click(await screen.findByTestId(toggle(work.id)));
      await waitFor(() =>
        expect(screen.queryByTestId(link(website.id))).not.toBeInTheDocument()
      );
      await user.click(screen.getByTestId(toggle(work.id)));

      expect(await screen.findByTestId(link(website.id))).toBeInTheDocument();
    });
  });

  describe("when I rename a project", () => {
    it("Then the new name is stored", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const { projectRepository } = renderProjects({ projects: [work] });

      await user.click(await screen.findByTestId(rowMenu(work.id)));
      await user.click(await screen.findByTestId(renameItem(work.id)));
      await user.clear(await screen.findByTestId(renameInput(work.id)));
      await user.type(screen.getByTestId(renameInput(work.id)), "Job");
      await user.keyboard("{Enter}");

      await waitFor(() =>
        expect(projectRepository.rename).toHaveBeenCalledWith({
          id: work.id,
          name: "Job",
        })
      );
    });
  });

  describe("when I move a project", () => {
    it("Then it is filed under the one I chose", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const stray = makeProject({ name: "Stray" });
      const { projectRepository } = renderProjects({
        projects: [work, stray],
      });

      await user.click(await screen.findByTestId(rowMenu(stray.id)));
      await user.click(await screen.findByTestId(moveTo(stray.id, work.id)));

      await waitFor(() =>
        expect(projectRepository.move).toHaveBeenCalledWith({
          id: stray.id,
          parentId: work.id,
        })
      );
    });

    /**
     * Offered only where it would be allowed, rather than greyed out: the menu
     * asks the same question the service does, so it can never offer a move
     * that would then be refused.
     */
    it("Then a target that would need a fourth level is not offered", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const launch = makeProject({ name: "Launch", parentId: website.id });
      renderProjects({ projects: [work, website, launch] });

      await user.click(await screen.findByTestId(rowMenu(website.id)));

      await screen.findByTestId(moveSection(website.id));
      expect(
        screen.queryByTestId(moveTo(website.id, launch.id))
      ).not.toBeInTheDocument();
    });
  });

  describe("when I delete a project", () => {
    async function confirmDelete(
      user: ReturnType<typeof setupUser>,
      id: string
    ) {
      await user.click(await screen.findByTestId(rowMenu(id)));
      await user.click(await screen.findByTestId(deleteItem(id)));
      await user.click(await screen.findByTestId(deleteConfirm));
    }

    it("Then it is removed", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const { projectRepository } = renderProjects({ projects: [work] });

      await confirmDelete(user, work.id);

      await waitFor(() =>
        expect(projectRepository.delete).toHaveBeenCalledWith(work.id)
      );
    });

    it("Then its children move up rather than going with it", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const { projectRepository } = renderProjects({
        projects: [work, website],
      });

      await confirmDelete(user, work.id);

      await waitFor(() =>
        expect(projectRepository.move).toHaveBeenCalledWith({
          id: website.id,
          parentId: undefined,
        })
      );
    });

    it("Then the todos filed under it go back to the inbox", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const todo = makeTodo({ done: false, projectId: work.id });
      const todoRepository = inMemoryTodoRepository([todo]);
      const projectRepository = inMemoryProjectRepository([work]);

      renderWithContainer(
        <SidebarProvider>
          <SidebarProjects />
        </SidebarProvider>,
        {
          diContainer: createTestContainer(todoRepository, projectRepository),
          route: "/",
        }
      );

      await confirmDelete(user, work.id);

      await waitFor(() =>
        expect(todoRepository.clearProjectEverywhere).toHaveBeenCalledWith(
          work.id
        )
      );
    });

    it("Then cancelling keeps it", async () => {
      const user = setupUser();
      const work = makeProject({ name: "Work" });
      const { projectRepository } = renderProjects({ projects: [work] });

      await user.click(await screen.findByTestId(rowMenu(work.id)));
      await user.click(await screen.findByTestId(deleteItem(work.id)));
      await user.click(await screen.findByTestId(deleteCancel));

      await waitFor(() =>
        expect(screen.getByTestId(link(work.id))).toBeInTheDocument()
      );
      expect(projectRepository.delete).not.toHaveBeenCalled();
    });
  });
});
