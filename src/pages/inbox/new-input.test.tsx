import { screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { describe, expect, it } from "vitest";

import { NewInput } from "@/pages/inbox/new-input";
import {
  createTestContainer,
  inMemoryProjectRepository,
  mockTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeCreateTodo, makeProject } from "@/test/todo-factory";

const input = "home.todo.create.input";
const submit = "home.todo.create.submit";

function renderNewInput({
  projects = [],
  projectId,
}: {
  projects?: ReturnType<typeof makeProject>[];
  /** The project a page pins the capture bar to, as the project page does. */
  projectId?: string;
} = {}) {
  const repository = mockTodoRepository();

  return {
    ...renderWithContainer(<NewInput projectId={projectId} />, {
      diContainer: createTestContainer(
        repository,
        inMemoryProjectRepository(projects)
      ),
    }),
    repository,
  };
}

/** The single todo the repository was asked to persist. */
function created(repository: ReturnType<typeof mockTodoRepository>) {
  expect(repository.create).toHaveBeenCalledTimes(1);
  return repository.create.mock.calls[0][0];
}

describe("new todo input", () => {
  describe("when I submit a title", () => {
    it("Then the todo is persisted with that title", async () => {
      const user = setupUser();
      // A pass-through assertion: a generated title proves the value the user
      // typed reached the repository untouched, which a literal would not.
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(created(repository).title).toBe(title));
    });

    it("Then it is persisted as not yet done", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(created(repository).done).toBe(false));
    });

    it("Then it defaults to being due today", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() =>
        expect(created(repository).dueDate?.toDateString()).toBe(
          new Date().toDateString()
        )
      );
    });

    it("Then the field clears, ready for the next capture", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(screen.getByTestId(input)).toHaveValue(""));
    });
  });

  describe("when I submit without a title", () => {
    it("Then nothing is persisted", async () => {
      const user = setupUser();
      const { repository } = renderNewInput();

      await user.click(screen.getByTestId(submit));

      // Give the mutation a chance to run before concluding it did not persist.
      await waitFor(() => expect(screen.getByTestId(input)).toHaveValue(""));
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("when I choose a project for a new todo", () => {
    it("Then the todo is created against it", async () => {
      const user = setupUser();
      const garden = makeProject({ name: "Garden" });
      const { repository } = renderNewInput({ projects: [garden] });

      await user.click(screen.getByTestId("home.todo.create.project"));
      await user.click(
        await screen.findByTestId(
          `home.todo.create.project.option.${garden.id}`
        )
      );

      await user.type(screen.getByTestId(input), "Repot the fig tree");
      await user.click(screen.getByTestId(submit));

      await waitFor(() =>
        expect(repository.create.mock.calls[0][0]).toMatchObject({
          projectId: garden.id,
        })
      );
    });
  });

  describe("when the page pins it to a project", () => {
    const projectPicker = "home.todo.create.project";

    it("Then the project cannot be changed from here", async () => {
      const project = makeProject();
      renderNewInput({ projects: [project], projectId: project.id });

      expect(await screen.findByTestId(projectPicker)).toBeDisabled();
    });

    it("Then the todo is filed under it", async () => {
      const user = setupUser();
      const project = makeProject();
      const { repository } = renderNewInput({
        projects: [project],
        projectId: project.id,
      });

      await user.type(screen.getByTestId(input), "Weed the beds");
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(repository.create).toHaveBeenCalled());
      expect(created(repository).projectId).toBe(project.id);
    });
  });
});
