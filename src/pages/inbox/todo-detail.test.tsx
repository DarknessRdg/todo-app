import { fireEvent, screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TodoEntity } from "@/backend/todo-service";
import { TodoDetail } from "@/pages/inbox/todo-detail";
import { useTodoDetails } from "@/pages/inbox/use-todo-details";
import type { LabelEntity } from "@/backend/label-service";
import {
  createTestContainer,
  inMemoryLabelRepository,
  inMemoryProjectRepository,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { readSetting, writeSetting } from "@/lib/settings";
import {
  makeLabel,
  makeProject,
  makeSubtask,
  makeTodo,
} from "@/test/todo-factory";

afterEach(() => localStorage.clear());

const title = "todo.detail.title";
const titleInput = "todo.detail.title.input";
const checkButton = "todo.detail.check.button";
const completedDate = "todo.detail.completed.date";
const projectPicker = "todo.detail.project";
const duePicker = "todo.detail.duedate.button";
const priorityPicker = "todo.detail.priority";
const priorityBadge = "todo.detail.priority.badge";
const priorityOption = (level: string) => `todo.detail.priority.${level}`;
const dueClear = "todo.detail.duedate.clear";
const dueToday = "todo.detail.duedate.today";
const projectOption = (id: string) => `todo.detail.project.option.${id}`;
const readView = "todo.detail.description.read";
const readOnlyToggle = "todo.detail.description.readonly.toggle";
const editor = "todo.detail.description.editor";
const saving = "todo.detail.description.saving";
const saved = "todo.detail.description.saved";
const subtaskCount = "todo.detail.subtask.count";
const addInput = "todo.detail.subtask.add.input";
const addButton = "todo.detail.subtask.add.button";
const row = (id: string) => `todo.detail.subtask.${id}`;
const check = (id: string) => `todo.detail.subtask.${id}.check`;
const deleteButton = (id: string) => `todo.detail.subtask.${id}.delete.button`;
const linkButton = "editor.toolbar.link.button";
const linkUrlInput = "editor.toolbar.link.url.input";
const saveButton = "editor.save.button";
const cancelButton = "editor.cancel.button";
const discardConfirm = "editor.discard.confirm";
const discardDialog = "editor.discard.dialog";
const keepWriting = "editor.discard.keep";

/**
 * `TodoDetail` takes its todo as a prop, so on its own it can never show the
 * result of a mutation. Both real callers (the modal and the page) feed it
 * from `useTodoDetails`, and that query is what invalidation refreshes — so
 * the spec mounts it behind the same subscription rather than a fixed prop.
 */
function SubscribedDetail({ id }: { id: string }) {
  const { todo } = useTodoDetails({ id });

  return todo ? <TodoDetail todo={todo} /> : null;
}

function renderDetail(
  todo: TodoEntity,
  projects: ReturnType<typeof makeProject>[] = [],
  labels: LabelEntity[] = []
) {
  const repository = inMemoryTodoRepository([todo]);
  const projectRepository = inMemoryProjectRepository(projects);
  const labelRepository = inMemoryLabelRepository(labels);

  return {
    ...renderWithContainer(<SubscribedDetail id={todo.id} />, {
      diContainer: createTestContainer(
        repository,
        projectRepository,
        labelRepository
      ),
    }),
    repository,
    projectRepository,
    labelRepository,
  };
}

describe("todo detail", () => {
  describe("when it is shown", () => {
    it("Then the todo's title is on screen", async () => {
      const todo = makeTodo({ title: "Rewire the doorbell" });
      renderDetail(todo);

      expect(await screen.findByTestId(title)).toHaveTextContent(
        "Rewire the doorbell"
      );
    });

    it("Then a todo without a description offers the placeholder", async () => {
      renderDetail(makeTodo({ description: undefined }));

      expect(await screen.findByTestId(readView)).toHaveTextContent(
        "Add a description…"
      );
    });
  });

  describe("when I complete a todo from its detail", () => {
    it("Then it is persisted as done", async () => {
      const user = setupUser();
      const todo = makeTodo({ done: false });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(checkButton));

      await waitFor(() =>
        expect(repository.updateDone).toHaveBeenCalledWith({
          id: todo.id,
          done: true,
        })
      );
    });

    it("Then the detail shows it as done", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ done: false }));

      await user.click(await screen.findByTestId(checkButton));

      await waitFor(() =>
        expect(screen.getByTestId(checkButton)).toBeChecked()
      );
    });

    it("Then its completion date is shown, having had none before", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ done: false, doneAt: undefined }));

      await screen.findByTestId(checkButton);
      expect(screen.queryByTestId(completedDate)).not.toBeInTheDocument();

      await user.click(screen.getByTestId(checkButton));

      expect(await screen.findByTestId(completedDate)).toBeInTheDocument();
    });
  });

  it("when I reopen a done todo from its detail, Then it is persisted as open", async () => {
    const user = setupUser();
    const todo = makeTodo({ done: true });
    const { repository } = renderDetail(todo);

    await user.click(await screen.findByTestId(checkButton));

    await waitFor(() =>
      expect(repository.updateDone).toHaveBeenCalledWith({
        id: todo.id,
        done: false,
      })
    );
  });

  describe("when I set a due date from the detail", () => {
    it("Then the day I choose is persisted", async () => {
      const user = setupUser();
      const todo = makeTodo({ dueDate: undefined });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(duePicker));
      await user.click(await screen.findByTestId(dueToday));

      await waitFor(() => expect(repository.updateDueDate).toHaveBeenCalled());
      const { dueDate } = repository.updateDueDate.mock.calls[0][0];
      expect(dueDate?.toDateString()).toBe(new Date().toDateString());
    });

    it("Then the detail stops inviting a date and shows the one it has", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ dueDate: undefined }));

      await user.click(await screen.findByTestId(duePicker));
      await user.click(await screen.findByTestId(dueToday));

      await waitFor(() =>
        expect(screen.getByTestId(duePicker)).not.toHaveTextContent(
          "Add a date"
        )
      );
    });
  });

  describe("when a todo has no due date", () => {
    it("Then the picker invites me to add one", async () => {
      renderDetail(makeTodo({ dueDate: undefined }));

      expect(await screen.findByTestId(duePicker)).toHaveTextContent(
        "Add a date"
      );
    });

    it("Then there is nothing to clear", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ dueDate: undefined }));

      await user.click(await screen.findByTestId(duePicker));
      await screen.findByTestId(dueToday);

      expect(screen.queryByTestId(dueClear)).not.toBeInTheDocument();
    });
  });

  describe("when I clear a due date", () => {
    it("Then the todo is left with none", async () => {
      const user = setupUser();
      const todo = makeTodo({ dueDate: new Date("2026-09-10T00:00:00.000Z") });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(duePicker));
      await user.click(await screen.findByTestId(dueClear));

      await waitFor(() =>
        expect(repository.updateDueDate).toHaveBeenCalledWith({
          id: todo.id,
          dueDate: undefined,
        })
      );
    });

    it("Then the picker goes back to inviting a date", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ dueDate: new Date("2026-09-10T00:00:00.000Z") }));

      await user.click(await screen.findByTestId(duePicker));
      await user.click(await screen.findByTestId(dueClear));

      await waitFor(() =>
        expect(screen.getByTestId(duePicker)).toHaveTextContent("Add a date")
      );
    });
  });

  describe("when I set a todo's priority", () => {
    it("Then the level I pick is persisted", async () => {
      const user = setupUser();
      const todo = makeTodo({ priority: undefined });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(priorityPicker));
      await user.click(await screen.findByTestId(priorityOption("urgent")));

      await waitFor(() =>
        expect(repository.updatePriority).toHaveBeenCalledWith({
          id: todo.id,
          priority: "urgent",
        })
      );
    });

    it("Then the detail shows the level it now carries", async () => {
      const user = setupUser();
      const { repository } = renderDetail(makeTodo({ priority: undefined }));

      await user.click(await screen.findByTestId(priorityPicker));
      await user.click(await screen.findByTestId(priorityOption("high")));

      await waitFor(() => expect(repository.updatePriority).toHaveBeenCalled());
      expect(await screen.findByTestId(priorityBadge)).toHaveTextContent(
        "High"
      );
    });

    /**
     * Taking the answer back is a real answer — there is no level meaning
     * "none", so clearing it stores nothing rather than a fifth value.
     */
    it("Then clearing it stores no level at all", async () => {
      const user = setupUser();
      const todo = makeTodo({ priority: "high" });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(priorityPicker));
      await user.click(await screen.findByTestId(priorityOption("none")));

      await waitFor(() =>
        expect(repository.updatePriority).toHaveBeenCalledWith({
          id: todo.id,
          priority: undefined,
        })
      );
    });
  });

  describe("when a todo carries no priority", () => {
    it("Then no priority badge is shown", async () => {
      renderDetail(makeTodo({ priority: undefined }));

      await screen.findByTestId(title);

      expect(screen.queryByTestId(priorityBadge)).not.toBeInTheDocument();
    });
  });

  describe("when I move a todo to another project", () => {
    it("Then the move is persisted", async () => {
      const user = setupUser();
      const garden = makeProject({ name: "Garden" });
      const todo = makeTodo({ projectId: undefined });
      const { repository } = renderDetail(todo, [garden]);

      await user.click(await screen.findByTestId(projectPicker));
      await user.click(await screen.findByTestId(projectOption(garden.id)));

      await waitFor(() =>
        expect(repository.updateProject).toHaveBeenCalledWith({
          id: todo.id,
          projectId: garden.id,
        })
      );
    });

    it("Then the detail names the project it moved to", async () => {
      const user = setupUser();
      const garden = makeProject({ name: "Garden" });
      renderDetail(makeTodo({ projectId: undefined }), [garden]);

      await user.click(await screen.findByTestId(projectPicker));
      await user.click(await screen.findByTestId(projectOption(garden.id)));

      await waitFor(() =>
        expect(screen.getByTestId(projectPicker)).toHaveTextContent("Garden")
      );
    });

    it("Then taking it out of every project is persisted too", async () => {
      const user = setupUser();
      const garden = makeProject({ name: "Garden" });
      const todo = makeTodo({ projectId: garden.id });
      const { repository } = renderDetail(todo, [garden]);

      await user.click(await screen.findByTestId(projectPicker));
      await user.click(await screen.findByTestId("todo.detail.project.none"));

      await waitFor(() =>
        expect(repository.updateProject).toHaveBeenCalledWith({
          id: todo.id,
          projectId: undefined,
        })
      );
    });
  });

  describe("when I click the title", () => {
    it("Then it turns into an input holding the current title", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ title: "Rewire the doorbell" }));

      await user.click(await screen.findByTestId(title));

      expect(await screen.findByTestId(titleInput)).toHaveValue(
        "Rewire the doorbell"
      );
    });
  });

  describe("when I retitle a todo and leave the field", () => {
    it("Then the new title is persisted", async () => {
      const user = setupUser();
      const todo = makeTodo({ title: "Rewire the doorbell" });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(title));
      const field = await screen.findByTestId(titleInput);

      await user.clear(field);
      await user.type(field, "Repot the fig tree");
      fireEvent.blur(field);

      await waitFor(() =>
        expect(repository.updateTitle).toHaveBeenCalledWith({
          id: todo.id,
          title: "Repot the fig tree",
        })
      );
    });

    it("Then it goes back to reading as a heading", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ title: "Rewire the doorbell" }));

      await user.click(await screen.findByTestId(title));
      fireEvent.blur(await screen.findByTestId(titleInput));

      await waitFor(() =>
        expect(screen.getByTestId(title)).toBeInTheDocument()
      );
    });

    it("Then an unchanged title is not written back", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ title: "Rewire the doorbell" })
      );

      await user.click(await screen.findByTestId(title));
      fireEvent.blur(await screen.findByTestId(titleInput));

      await waitFor(() =>
        expect(screen.getByTestId(title)).toBeInTheDocument()
      );
      expect(repository.updateTitle).not.toHaveBeenCalled();
    });

    it("Then a blank title is not written back, so the todo keeps its name", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ title: "Rewire the doorbell" })
      );

      await user.click(await screen.findByTestId(title));
      const field = await screen.findByTestId(titleInput);

      await user.clear(field);
      fireEvent.blur(field);

      await waitFor(() =>
        expect(screen.getByTestId(title)).toBeInTheDocument()
      );
      expect(repository.updateTitle).not.toHaveBeenCalled();
      expect(screen.getByTestId(title)).toHaveTextContent(
        "Rewire the doorbell"
      );
    });
  });

  it("when I press enter while retitling, Then it is saved without leaving the field", async () => {
    const user = setupUser();
    const todo = makeTodo({ title: "Rewire the doorbell" });
    const { repository } = renderDetail(todo);

    await user.click(await screen.findByTestId(title));
    const field = await screen.findByTestId(titleInput);

    await user.clear(field);
    await user.type(field, "Repot the fig tree{Enter}");

    await waitFor(() =>
      expect(repository.updateTitle).toHaveBeenCalledWith({
        id: todo.id,
        title: "Repot the fig tree",
      })
    );
  });

  it("when I press escape while retitling, Then the edit is abandoned", async () => {
    const user = setupUser();
    const { repository } = renderDetail(
      makeTodo({ title: "Rewire the doorbell" })
    );

    await user.click(await screen.findByTestId(title));
    const field = await screen.findByTestId(titleInput);

    await user.clear(field);
    await user.type(field, "Something else{Escape}");

    await waitFor(() => expect(screen.getByTestId(title)).toBeInTheDocument());
    expect(repository.updateTitle).not.toHaveBeenCalled();
    expect(screen.getByTestId(title)).toHaveTextContent("Rewire the doorbell");
  });

  describe("when I click the description", () => {
    it("Then it turns into the editor", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));

      expect(await screen.findByTestId(editor)).toBeInTheDocument();
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });
  });

  describe("when I edit the description and save it", () => {
    it("Then the new text is persisted", async () => {
      const user = setupUser();
      const todo = makeTodo({ description: "the old notes" });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.clear(field);
      await user.type(field, "the new notes");
      await user.click(screen.getByTestId(saveButton));

      await waitFor(() =>
        expect(repository.updateDescription).toHaveBeenCalledWith({
          id: todo.id,
          description: "the new notes",
          // Saved beside the markdown so showing this description again does
          // not mean parsing it again.
          descriptionDoc: expect.objectContaining({ type: "doc" }),
        })
      );
    });

    it("Then it goes back to reading", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.click(screen.getByTestId(saveButton));

      expect(await screen.findByTestId(readView)).toBeInTheDocument();
    });

    it("Then an unchanged description is not written back", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "the old notes" })
      );

      await user.click(await screen.findByTestId(readView));
      await screen.findByTestId(editor);
      await user.click(screen.getByTestId(saveButton));

      await waitFor(() =>
        expect(screen.getByTestId(readView)).toBeInTheDocument()
      );
      expect(repository.updateDescription).not.toHaveBeenCalled();
    });

    it("Then it says on screen that the writing was saved", async () => {
      const user = setupUser();
      // The notice takes itself away, and the suite runs that delay at zero —
      // so it has to be held open to be seen at all. Dialled through the
      // environment, which is what `Timing` reads on every access.
      vi.stubEnv("VITE_SAVED_VISIBLE_MS", "5000");
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.click(screen.getByTestId(saveButton));

      expect(await screen.findByTestId(saved)).toBeInTheDocument();
    });

    it("Then the notice takes itself away again", async () => {
      const user = setupUser();
      // Short rather than zero: the notice has to be seen arriving before its
      // leaving means anything — `waitFor` on an absence is satisfied by the
      // first tick, and would pass just as well if it had never appeared.
      vi.stubEnv("VITE_SAVED_VISIBLE_MS", "300");
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.click(screen.getByTestId(saveButton));
      await screen.findByTestId(saved);

      await waitFor(() =>
        expect(screen.queryByTestId(saved)).not.toBeInTheDocument()
      );
    });

    it("Then it says it is saving until the write lands", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "the old notes" })
      );

      // A write that never settles, so the in-flight state can be caught at
      // all — against the in-memory repository it is over within the tick.
      repository.updateDescription.mockReturnValue(new Promise(() => {}));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.click(screen.getByTestId(saveButton));

      expect(await screen.findByTestId(saving)).toBeInTheDocument();
      expect(screen.queryByTestId(saved)).not.toBeInTheDocument();
    });

    it("Then an unchanged description claims no save, having made none", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      await screen.findByTestId(editor);
      await user.click(screen.getByTestId(saveButton));

      await waitFor(() =>
        expect(screen.getByTestId(readView)).toBeInTheDocument()
      );
      expect(screen.queryByTestId(saved)).not.toBeInTheDocument();
    });
  });

  describe("when I cancel out of the description", () => {
    it("Then nothing is written back", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "the old notes" })
      );

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.click(screen.getByTestId(cancelButton));
      await user.click(await screen.findByTestId(discardConfirm));

      await waitFor(() =>
        expect(screen.getByTestId(readView)).toBeInTheDocument()
      );
      expect(repository.updateDescription).not.toHaveBeenCalled();
    });

    it("Then it goes back to reading the text it had before", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.click(screen.getByTestId(cancelButton));
      await user.click(await screen.findByTestId(discardConfirm));

      const read = await screen.findByTestId(readView);
      expect(read).toHaveTextContent("the old notes");
      expect(read).not.toHaveTextContent("and more");
    });

    it("Then keeping the writing leaves the editor open with it", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.click(screen.getByTestId(cancelButton));
      await user.click(await screen.findByTestId(keepWriting));

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("and more")
      );
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });
  });

  /**
   * The real shape of the bug this guards: a description stored as markdown is
   * parsed on the way in, and what comes back out is spelled differently enough
   * that comparing the two called every untouched todo "changed".
   */
  describe("when I open a description and cancel without touching it", () => {
    it("Then it closes without asking, having nothing to throw away", async () => {
      const user = setupUser();
      renderDetail(
        makeTodo({ description: "# Notes\n\n- one\n- two\n\n**bold**" })
      );

      await user.click(await screen.findByTestId(readView));
      await screen.findByTestId(editor);
      await user.click(screen.getByTestId(cancelButton));

      expect(await screen.findByTestId(readView)).toBeInTheDocument();
      expect(screen.queryByTestId(discardDialog)).not.toBeInTheDocument();
    });

    it("Then escape closes it just as quietly", async () => {
      const user = setupUser();
      renderDetail(
        makeTodo({ description: "# Notes\n\n- one\n- two\n\n**bold**" })
      );

      await user.click(await screen.findByTestId(readView));
      await user.click(await screen.findByTestId(editor));
      await user.keyboard("{Escape}");

      expect(await screen.findByTestId(readView)).toBeInTheDocument();
      expect(screen.queryByTestId(discardDialog)).not.toBeInTheDocument();
    });
  });

  describe("when I press escape while editing the description", () => {
    it("Then nothing is written back, the same as cancelling", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "the old notes" })
      );

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.keyboard("{Escape}");
      await user.click(await screen.findByTestId(discardConfirm));

      await waitFor(() =>
        expect(screen.getByTestId(readView)).toBeInTheDocument()
      );
      expect(repository.updateDescription).not.toHaveBeenCalled();
    });

    it("Then the text it had before is what is left on screen", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      await user.keyboard("{Escape}");
      await user.click(await screen.findByTestId(discardConfirm));

      const read = await screen.findByTestId(readView);
      expect(read).not.toHaveTextContent("and more");
    });
  });

  /**
   * The point of the two buttons: a save happens because it was asked for.
   * Focus wandering off — to a toolbar, to another property, to nothing at all
   * — is not that, and closing the editor there would throw away writing the
   * user never said they were done with.
   */
  describe("when I click away from the description editor", () => {
    it("Then it stays open, holding what I wrote", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      fireEvent.blur(field);

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("and more")
      );
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });

    it("Then nothing is written back", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "the old notes" })
      );

      await user.click(await screen.findByTestId(readView));
      const field = await screen.findByTestId(editor);

      await user.type(field, " and more");
      fireEvent.blur(field);

      await waitFor(() =>
        expect(screen.getByTestId(editor)).toHaveTextContent("and more")
      );
      expect(repository.updateDescription).not.toHaveBeenCalled();
    });
  });

  describe("when I reach for the link control while editing the description", () => {
    it("Then the editor stays open instead of dropping back to read mode", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "read the docs" }));

      await user.click(await screen.findByTestId(readView));
      await user.click(await screen.findByTestId(linkButton));

      expect(await screen.findByTestId(linkUrlInput)).toBeInTheDocument();
      expect(screen.getByTestId(editor)).toBeInTheDocument();
      expect(screen.queryByTestId(readView)).not.toBeInTheDocument();
    });

    it("Then nothing is written back just for opening it", async () => {
      const user = setupUser();
      const { repository } = renderDetail(
        makeTodo({ description: "read the docs" })
      );

      await user.click(await screen.findByTestId(readView));
      await user.click(await screen.findByTestId(linkButton));
      await screen.findByTestId(linkUrlInput);

      expect(repository.updateDescription).not.toHaveBeenCalled();
    });
  });

  /**
   * A description is stored twice: as markdown, which is the record, and as the
   * editor's own parsed copy, which is what makes showing it cheap. Which of
   * the two was used is only observable through what ends up on screen, so
   * these two specs deliberately put different text in each.
   */
  describe("when a todo carries a parsed copy of its description", () => {
    it("Then that is what is shown, rather than the markdown being parsed again", async () => {
      renderDetail(
        makeTodo({
          description: "the markdown",
          descriptionDoc: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "the parsed copy" }],
              },
            ],
          },
        })
      );

      expect(await screen.findByTestId(readView)).toHaveTextContent(
        "the parsed copy"
      );
    });
  });

  it("when a todo has only markdown, Then it is shown all the same", async () => {
    renderDetail(
      makeTodo({ description: "the markdown", descriptionDoc: undefined })
    );

    expect(await screen.findByTestId(readView)).toHaveTextContent(
      "the markdown"
    );
  });

  /**
   * Which way round a description opens is a preference — some people come to
   * their todos to read them, some to write in them.
   */
  describe("when I flip the description to reading from the todo itself", () => {
    it("Then clicking it no longer opens the editor", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readOnlyToggle));
      await user.click(screen.getByTestId(readView));

      expect(screen.queryByTestId(editor)).not.toBeInTheDocument();
      expect(screen.getByTestId(readView)).toBeInTheDocument();
    });

    /**
     * The whole point of it being on the todo: a quick look at this one,
     * without going to settings and without changing anything for the next.
     */
    it("Then the setting is left exactly as it was", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readOnlyToggle));

      expect(readSetting("defaultTodoView")).toBe("write");
    });
  });

  describe("when descriptions are set to open ready to read", () => {
    it("Then the toggle says it is reading, without being touched", async () => {
      writeSetting("defaultTodoView", "read");
      renderDetail(makeTodo({ description: "the old notes" }));

      expect(await screen.findByTestId(readOnlyToggle)).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("Then it can still be flipped to writing for this todo", async () => {
      const user = setupUser();
      writeSetting("defaultTodoView", "read");
      renderDetail(makeTodo({ description: "the old notes" }));

      await user.click(await screen.findByTestId(readOnlyToggle));
      await user.click(screen.getByTestId(readView));

      expect(await screen.findByTestId(editor)).toBeInTheDocument();
    });
  });

  it("when descriptions are set to open ready to read, Then clicking one does not put it into the editor", async () => {
    const user = setupUser();
    writeSetting("defaultTodoView", "read");
    renderDetail(makeTodo({ description: "the old notes" }));

    await user.click(await screen.findByTestId(readView));

    expect(screen.queryByTestId(editor)).not.toBeInTheDocument();
  });

  /**
   * Replaces the per-todo toggle that used to sit beside the eyebrow. With
   * nothing on the description to override it, the setting has to reach a todo
   * that is already open — sampling it once on mount would leave the preference
   * looking like it had not been taken.
   */
  it("when the setting changes while a todo is open, Then its description follows", async () => {
    const user = setupUser();
    renderDetail(makeTodo({ description: "the old notes" }));

    await user.click(await screen.findByTestId(readView));
    await screen.findByTestId(editor);

    writeSetting("defaultTodoView", "read");

    await waitFor(() =>
      expect(screen.queryByTestId(editor)).not.toBeInTheDocument()
    );
    expect(screen.getByTestId(readView)).toBeInTheDocument();
  });

  it("when descriptions are left opening ready to write, Then clicking one opens the editor", async () => {
    const user = setupUser();
    renderDetail(makeTodo({ description: "the old notes" }));

    await user.click(await screen.findByTestId(readView));

    expect(await screen.findByTestId(editor)).toBeInTheDocument();
  });

  describe("when I add a subtask", () => {
    it("Then it is persisted against the todo", async () => {
      const user = setupUser();
      const todo = makeTodo({ subtasks: [] });
      const { repository } = renderDetail(todo);

      await user.type(
        await screen.findByTestId(addInput),
        "Break it into steps"
      );
      await user.click(screen.getByTestId(addButton));

      await waitFor(() =>
        expect(repository.addSubtask).toHaveBeenCalledTimes(1)
      );
      expect(repository.addSubtask.mock.calls[0][0]).toMatchObject({
        id: todo.id,
        subtask: { title: "Break it into steps", done: false },
      });
    });

    it("Then it appears in the list", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ subtasks: [] }));

      await user.type(
        await screen.findByTestId(addInput),
        "Break it into steps"
      );
      await user.click(screen.getByTestId(addButton));

      expect(
        await screen.findByText("Break it into steps")
      ).toBeInTheDocument();
    });

    it("Then the field clears, ready for the next one", async () => {
      const user = setupUser();
      renderDetail(makeTodo({ subtasks: [] }));

      await user.type(await screen.findByTestId(addInput), "Draft it");
      await user.click(screen.getByTestId(addButton));

      await waitFor(() => expect(screen.getByTestId(addInput)).toHaveValue(""));
    });

    it("Then pressing enter adds it without reaching for the button", async () => {
      const user = setupUser();
      const { repository } = renderDetail(makeTodo({ subtasks: [] }));

      await user.type(await screen.findByTestId(addInput), "Draft it{Enter}");

      await waitFor(() =>
        expect(repository.addSubtask).toHaveBeenCalledTimes(1)
      );
    });

    it("Then a blank title adds nothing", async () => {
      const user = setupUser();
      const { repository } = renderDetail(makeTodo({ subtasks: [] }));

      await user.type(await screen.findByTestId(addInput), "   {Enter}");

      expect(repository.addSubtask).not.toHaveBeenCalled();
    });
  });

  describe("when I complete a subtask", () => {
    it("Then the change is persisted", async () => {
      const user = setupUser();
      const subtask = makeSubtask({ done: false });
      const todo = makeTodo({ subtasks: [subtask] });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(check(subtask.id)));

      await waitFor(() =>
        expect(repository.updateSubtaskDone).toHaveBeenCalledWith({
          id: todo.id,
          subtaskId: subtask.id,
          done: true,
        })
      );
    });

    it("Then the completed tally goes up", async () => {
      const user = setupUser();
      const first = makeSubtask({ done: false });
      const second = makeSubtask({ done: false });
      renderDetail(makeTodo({ subtasks: [first, second] }));

      expect(await screen.findByTestId(subtaskCount)).toHaveTextContent("0/2");

      await user.click(screen.getByTestId(check(first.id)));

      await waitFor(() =>
        expect(screen.getByTestId(subtaskCount)).toHaveTextContent("1/2")
      );
    });

    it("Then reopening a done one brings the tally back down", async () => {
      const user = setupUser();
      const subtask = makeSubtask({ done: true });
      const todo = makeTodo({ subtasks: [subtask] });
      const { repository } = renderDetail(todo);

      expect(await screen.findByTestId(subtaskCount)).toHaveTextContent("1/1");

      await user.click(screen.getByTestId(check(subtask.id)));

      await waitFor(() =>
        expect(repository.updateSubtaskDone).toHaveBeenCalledWith({
          id: todo.id,
          subtaskId: subtask.id,
          done: false,
        })
      );
      await waitFor(() =>
        expect(screen.getByTestId(subtaskCount)).toHaveTextContent("0/1")
      );
    });
  });

  describe("when I delete a subtask", () => {
    it("Then only that one is removed", async () => {
      const user = setupUser();
      const doomed = makeSubtask({ title: "Doomed" });
      const survivor = makeSubtask({ title: "Survivor" });
      const todo = makeTodo({ subtasks: [doomed, survivor] });
      const { repository } = renderDetail(todo);

      await user.click(await screen.findByTestId(deleteButton(doomed.id)));

      await waitFor(() =>
        expect(repository.deleteSubtask).toHaveBeenCalledWith({
          id: todo.id,
          subtaskId: doomed.id,
        })
      );
      await waitFor(() =>
        expect(screen.queryByTestId(row(doomed.id))).not.toBeInTheDocument()
      );
      expect(screen.getByTestId(row(survivor.id))).toBeInTheDocument();
    });

    it("Then the tally shrinks with it", async () => {
      const user = setupUser();
      const doomed = makeSubtask({ done: true });
      const survivor = makeSubtask({ done: false });
      renderDetail(makeTodo({ subtasks: [doomed, survivor] }));

      expect(await screen.findByTestId(subtaskCount)).toHaveTextContent("1/2");

      await user.click(screen.getByTestId(deleteButton(doomed.id)));

      await waitFor(() =>
        expect(screen.getByTestId(subtaskCount)).toHaveTextContent("0/1")
      );
    });

    it("Then removing the last one takes the tally away entirely", async () => {
      const user = setupUser();
      const only = makeSubtask();
      renderDetail(makeTodo({ subtasks: [only] }));

      await user.click(await screen.findByTestId(deleteButton(only.id)));

      await waitFor(() =>
        expect(screen.queryByTestId(subtaskCount)).not.toBeInTheDocument()
      );
    });
  });

  describe("when I label a todo", () => {
    const labelPicker = "todo.detail.labels";

    const openPicker = async (user: Awaited<ReturnType<typeof setupUser>>) =>
      user.click(await screen.findByTestId(`${labelPicker}.add.button`));

    it("Then the label I pick is put on it", async () => {
      const user = setupUser();
      const label = makeLabel({ name: "Frontend" });
      const { repository } = renderDetail(
        makeTodo({ labelIds: [] }),
        [],
        [label]
      );

      await openPicker(user);
      await user.click(
        await screen.findByTestId(`${labelPicker}.${label.id}.button`)
      );

      await waitFor(() =>
        expect(repository.updateLabels).toHaveBeenCalledWith(
          expect.objectContaining({ labelIds: [label.id] })
        )
      );
    });

    it("Then a label it already carries is drawn as a chip", async () => {
      const label = makeLabel({ name: "Frontend" });
      renderDetail(makeTodo({ labelIds: [label.id] }), [], [label]);

      expect(
        await screen.findByTestId(`${labelPicker}.${label.id}.remove.button`)
      ).toBeInTheDocument();
    });

    it("Then taking one off asks nothing first, as nothing is destroyed", async () => {
      const user = setupUser();
      const label = makeLabel({ name: "Frontend" });
      const { repository } = renderDetail(
        makeTodo({ labelIds: [label.id] }),
        [],
        [label]
      );

      await user.click(
        await screen.findByTestId(`${labelPicker}.${label.id}.remove.button`)
      );

      await waitFor(() =>
        expect(repository.updateLabels).toHaveBeenCalledWith(
          expect.objectContaining({ labelIds: [] })
        )
      );
    });

    describe("when the label I want does not exist yet", () => {
      it("Then it is created from here", async () => {
        const user = setupUser();
        const { labelRepository } = renderDetail(makeTodo({ labelIds: [] }));

        await openPicker(user);
        await user.type(
          await screen.findByTestId(`${labelPicker}.search.input`),
          "Frontend"
        );
        await user.click(
          await screen.findByTestId(`${labelPicker}.create.button`)
        );

        await waitFor(() =>
          expect(labelRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Frontend" })
          )
        );
      });

      it("Then it goes straight onto the todo", async () => {
        const user = setupUser();
        const { repository } = renderDetail(makeTodo({ labelIds: [] }));

        await openPicker(user);
        await user.type(
          await screen.findByTestId(`${labelPicker}.search.input`),
          "Frontend"
        );
        await user.click(
          await screen.findByTestId(`${labelPicker}.create.button`)
        );

        await waitFor(() => expect(repository.updateLabels).toHaveBeenCalled());
      });
    });
  });
});
