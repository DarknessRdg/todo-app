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
const dueButton = "home.todo.create.duedate.button";
const dueToday = "home.todo.create.duedate.today";

function renderNewInput({
  projects = [],
  projectId,
  dueDate,
}: {
  projects?: ReturnType<typeof makeProject>[];
  /** The project a page pins the capture bar to, as the project page does. */
  projectId?: string;
  /** The date a page pins it to, as the today page does. */
  dueDate?: Date;
} = {}) {
  const repository = mockTodoRepository();

  return {
    ...renderWithContainer(<NewInput projectId={projectId} dueDate={dueDate} />, {
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
  /**
   * The page's own promise, not a default: `/today` says what you capture there
   * is due today, so it pins the date the way the project page pins a project.
   */
  describe("when I set a priority before capturing", () => {
    it("Then the todo is created carrying it", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId("home.todo.create.priority"));
      await user.click(
        await screen.findByTestId("home.todo.create.priority.high")
      );
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(repository.create).toHaveBeenCalled());
      expect(created(repository).priority).toBe("high");
    });

    it("Then leaving it alone creates one carrying none", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(repository.create).toHaveBeenCalled());
      expect(created(repository).priority).toBeUndefined();
    });
  });

  describe("when the page pins a due date", () => {
    it("Then what I capture carries it", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const pinned = new Date();
      const { repository } = renderNewInput({ dueDate: pinned });

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(repository.create).toHaveBeenCalled());
      expect(created(repository).dueDate?.toDateString()).toBe(
        pinned.toDateString()
      );
    });
  });

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

    /**
     * A date nobody chose is still a promise the todo makes — it turns up in
     * Today, and in Overdue the morning after, on the strength of a default.
     * Capture stays a title and nothing else until the reader says otherwise.
     */
    it("Then it is captured with no due date, none having been picked", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(repository.create).toHaveBeenCalled());
      expect(created(repository).dueDate).toBeUndefined();
    });

    it("Then the date I pick is what it is captured with", async () => {
      const user = setupUser();
      const { title } = makeCreateTodo();
      const { repository } = renderNewInput();

      await user.type(screen.getByTestId(input), title);
      await user.click(screen.getByTestId(dueButton));
      await user.click(await screen.findByTestId(dueToday));
      await user.click(screen.getByTestId(submit));

      await waitFor(() => expect(repository.create).toHaveBeenCalled());
      expect(created(repository).dueDate?.toDateString()).toBe(
        new Date().toDateString()
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
