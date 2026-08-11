import { screen } from "@testing-library/react";
import { setupUser, waitFor, type User } from "@/test/user";
import { describe, expect, it } from "vitest";

import type { LabelEntity } from "@/backend/label-service";
import type { TodoEntity } from "@/backend/todo-service";
import { LabelsPage } from "@/pages/labels/labels-page";
import type { ProjectEntity } from "@/backend/project-service";
import {
  createTestContainer,
  inMemoryLabelRepository,
  inMemoryProjectRepository,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeLabel, makeProject, makeTodo } from "@/test/todo-factory";

function renderPage(
  labels: LabelEntity[] = [],
  todos: TodoEntity[] = [],
  projects: ProjectEntity[] = []
) {
  const labelRepository = inMemoryLabelRepository(labels);
  const todoRepository = inMemoryTodoRepository(todos);

  return {
    ...renderWithContainer(<LabelsPage />, {
      diContainer: createTestContainer(
        todoRepository,
        inMemoryProjectRepository(projects),
        labelRepository
      ),
      route: "/labels",
    }),
    labelRepository,
    todoRepository,
  };
}

const addLabel = async (user: User, name: string) => {
  await user.type(screen.getByTestId("labels.page.create.input"), name);
  await user.click(screen.getByTestId("labels.page.create.button"));
};

const openDelete = async (user: User, label: LabelEntity) =>
  user.click(
    await screen.findByTestId(`labels.page.${label.id}.delete.button`)
  );

describe("labels page", () => {
  describe("when the page loads", () => {
    it("Then every label is listed", async () => {
      const label = makeLabel({ name: "Frontend" });
      renderPage([label]);

      expect(
        await screen.findByTestId(`labels.page.${label.id}.name`)
      ).toHaveTextContent("Frontend");
    });

    it("Then a workspace with no labels says so", async () => {
      renderPage();

      expect(
        await screen.findByTestId("labels.page.empty")
      ).toBeInTheDocument();
    });

    it("Then each label says how many todos carry it", async () => {
      const label = makeLabel();
      renderPage(
        [label],
        [
          makeTodo({ done: false, labelIds: [label.id] }),
          makeTodo({ done: true, labelIds: [label.id] }),
        ]
      );

      expect(
        await screen.findByTestId(`labels.page.${label.id}.usage`)
      ).toHaveTextContent("On 2 todos, 1 open");
    });
  });

  describe("when I add a label", () => {
    it("Then it is created under the name I typed", async () => {
      const user = setupUser();
      const { labelRepository } = renderPage();

      await addLabel(user, "Frontend");

      await waitFor(() =>
        expect(labelRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Frontend" })
        )
      );
    });

    it("Then it appears in the list without a reload", async () => {
      const user = setupUser();
      renderPage();

      await addLabel(user, "Frontend");

      expect(await screen.findByText("Frontend")).toBeInTheDocument();
    });

    it("Then the field empties, ready for the next one", async () => {
      const user = setupUser();
      renderPage();

      await addLabel(user, "Frontend");

      await waitFor(() =>
        expect(screen.getByTestId("labels.page.create.input")).toHaveValue("")
      );
    });

    it("Then a blank name creates nothing", async () => {
      const user = setupUser();
      const { labelRepository } = renderPage();

      await user.click(screen.getByTestId("labels.page.create.button"));

      expect(labelRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("when I rename a label", () => {
    const startRename = async (user: User, label: LabelEntity) =>
      user.click(
        await screen.findByTestId(`labels.page.${label.id}.rename.button`)
      );

    it("Then the new name is stored", async () => {
      const user = setupUser();
      const label = makeLabel({ name: "Frontend" });
      const { labelRepository } = renderPage([label]);

      await startRename(user, label);
      const field = await screen.findByTestId(
        `labels.page.${label.id}.rename.input`
      );
      await user.clear(field);
      await user.type(field, "UI");
      await user.click(
        screen.getByTestId(`labels.page.${label.id}.rename.save`)
      );

      await waitFor(() =>
        expect(labelRepository.rename).toHaveBeenCalledWith({
          id: label.id,
          name: "UI",
        })
      );
    });

    it("Then escaping leaves it as it was", async () => {
      const user = setupUser();
      const label = makeLabel({ name: "Frontend" });
      const { labelRepository } = renderPage([label]);

      await startRename(user, label);
      await user.type(
        await screen.findByTestId(`labels.page.${label.id}.rename.input`),
        "UI"
      );
      await user.keyboard("{Escape}");

      expect(labelRepository.rename).not.toHaveBeenCalled();
      expect(
        await screen.findByTestId(`labels.page.${label.id}.name`)
      ).toHaveTextContent("Frontend");
    });
  });

  describe("when I delete a label", () => {
    it("Then it asks before anything is destroyed", async () => {
      const user = setupUser();
      const label = makeLabel();
      const { labelRepository } = renderPage([label]);

      await openDelete(user, label);

      expect(
        await screen.findByTestId("labels.page.delete.dialog")
      ).toBeInTheDocument();
      expect(labelRepository.delete).not.toHaveBeenCalled();
    });

    it("Then it says how many todos it is about to come off", async () => {
      const user = setupUser();
      const label = makeLabel();
      renderPage([label], [makeTodo({ labelIds: [label.id] })]);

      await openDelete(user, label);

      expect(
        await screen.findByTestId("labels.page.delete.dialog")
      ).toHaveTextContent("It comes off 1 todo");
    });

    it("Then confirming removes it", async () => {
      const user = setupUser();
      const label = makeLabel();
      const { labelRepository } = renderPage([label]);

      await openDelete(user, label);
      await user.click(await screen.findByTestId("labels.page.delete.confirm"));

      await waitFor(() =>
        expect(labelRepository.delete).toHaveBeenCalledWith(label.id)
      );
    });

    it("Then it also comes off every todo carrying it", async () => {
      const user = setupUser();
      const label = makeLabel();
      const { todoRepository } = renderPage(
        [label],
        [makeTodo({ labelIds: [label.id] })]
      );

      await openDelete(user, label);
      await user.click(await screen.findByTestId("labels.page.delete.confirm"));

      await waitFor(() =>
        expect(todoRepository.removeLabelEverywhere).toHaveBeenCalledWith(
          label.id
        )
      );
    });

    it("Then cancelling keeps it", async () => {
      const user = setupUser();
      const label = makeLabel();
      const { labelRepository } = renderPage([label]);

      await openDelete(user, label);
      await user.click(await screen.findByTestId("labels.page.delete.cancel"));

      expect(labelRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("when I pull todos into a label", () => {
    const open = async (user: User, label: LabelEntity) =>
      user.click(
        await screen.findByTestId(`labels.page.${label.id}.assign.button`)
      );

    const tick = async (user: User, todo: TodoEntity) =>
      user.click(
        await screen.findByTestId(`labels.assign.todo.${todo.id}.checkbox`)
      );

    const isOffered = (todo: TodoEntity) =>
      screen.queryByTestId(`labels.assign.todo.${todo.id}.checkbox`) !== null;

    it("Then every todo in the workspace is on offer", async () => {
      const user = setupUser();
      const label = makeLabel();
      const todo = makeTodo({ title: "Read the docs" });
      renderPage([label], [todo]);

      await open(user, label);

      expect(
        await screen.findByTestId(`labels.assign.todo.${todo.id}.checkbox`)
      ).toBeInTheDocument();
    });

    it("Then the ones already carrying it start ticked", async () => {
      const user = setupUser();
      const label = makeLabel();
      const carrying = makeTodo({ labelIds: [label.id] });
      renderPage([label], [carrying]);

      await open(user, label);

      expect(
        await screen.findByTestId(`labels.assign.todo.${carrying.id}.checkbox`)
      ).toBeChecked();
    });

    it("Then ticking two and saving puts the label on both", async () => {
      const user = setupUser();
      const label = makeLabel();
      const one = makeTodo({ labelIds: [] });
      const two = makeTodo({ labelIds: [] });
      const { todoRepository } = renderPage([label], [one, two]);

      await open(user, label);
      await tick(user, one);
      await tick(user, two);
      await user.click(screen.getByTestId("labels.assign.save"));

      await waitFor(() =>
        expect(todoRepository.updateLabels).toHaveBeenCalledWith({
          id: one.id,
          labelIds: [label.id],
        })
      );
      expect(todoRepository.updateLabels).toHaveBeenCalledWith({
        id: two.id,
        labelIds: [label.id],
      });
    });

    it("Then the labels a todo already had are kept", async () => {
      const user = setupUser();
      const label = makeLabel();
      const other = makeLabel();
      const todo = makeTodo({ labelIds: [other.id] });
      const { todoRepository } = renderPage([label, other], [todo]);

      await open(user, label);
      await tick(user, todo);
      await user.click(screen.getByTestId("labels.assign.save"));

      await waitFor(() =>
        expect(todoRepository.updateLabels).toHaveBeenCalledWith({
          id: todo.id,
          labelIds: [other.id, label.id],
        })
      );
    });

    it("Then unticking one takes the label off it", async () => {
      const user = setupUser();
      const label = makeLabel();
      const carrying = makeTodo({ labelIds: [label.id] });
      const { todoRepository } = renderPage([label], [carrying]);

      await open(user, label);
      await tick(user, carrying);
      await user.click(screen.getByTestId("labels.assign.save"));

      await waitFor(() =>
        expect(todoRepository.updateLabels).toHaveBeenCalledWith({
          id: carrying.id,
          labelIds: [],
        })
      );
    });

    it("Then cancelling writes nothing", async () => {
      const user = setupUser();
      const label = makeLabel();
      const todo = makeTodo({ labelIds: [] });
      const { todoRepository } = renderPage([label], [todo]);

      await open(user, label);
      await tick(user, todo);
      await user.click(screen.getByTestId("labels.assign.cancel"));

      expect(todoRepository.updateLabels).not.toHaveBeenCalled();
    });

    it("Then the page says how many todos carry it afterwards", async () => {
      const user = setupUser();
      const label = makeLabel();
      const todo = makeTodo({ done: false, labelIds: [] });
      renderPage([label], [todo]);

      await open(user, label);
      await tick(user, todo);
      await user.click(screen.getByTestId("labels.assign.save"));

      await waitFor(() =>
        expect(
          screen.getByTestId(`labels.page.${label.id}.usage`)
        ).toHaveTextContent("On 1 todo")
      );
    });

    describe("when I take the lot at once", () => {
      const selectAll = () =>
        screen.getByTestId("labels.assign.selectall.checkbox");

      it("Then select all ticks every todo on offer", async () => {
        const user = setupUser();
        const label = makeLabel();
        const one = makeTodo({ labelIds: [] });
        const two = makeTodo({ labelIds: [] });
        const { todoRepository } = renderPage([label], [one, two]);

        await open(user, label);
        await user.click(
          await screen.findByTestId("labels.assign.selectall.checkbox")
        );
        await user.click(screen.getByTestId("labels.assign.save"));

        await waitFor(() =>
          expect(todoRepository.updateLabels).toHaveBeenCalledWith({
            id: one.id,
            labelIds: [label.id],
          })
        );
        expect(todoRepository.updateLabels).toHaveBeenCalledWith({
          id: two.id,
          labelIds: [label.id],
        });
      });

      it("Then it takes only what the search is showing", async () => {
        const user = setupUser();
        const label = makeLabel();
        const docs = makeTodo({ title: "Read the docs", labelIds: [] });
        const ship = makeTodo({ title: "Ship it", labelIds: [] });
        const { todoRepository } = renderPage([label], [docs, ship]);

        await open(user, label);
        await user.type(
          await screen.findByTestId("labels.assign.search.input"),
          "docs"
        );
        await waitFor(() => expect(isOffered(ship)).toBe(false));
        await user.click(selectAll());
        await user.click(screen.getByTestId("labels.assign.save"));

        await waitFor(() =>
          expect(todoRepository.updateLabels).toHaveBeenCalledWith({
            id: docs.id,
            labelIds: [label.id],
          })
        );
        expect(todoRepository.updateLabels).not.toHaveBeenCalledWith(
          expect.objectContaining({ id: ship.id })
        );
      });

      it("Then it reads as ticked once everything on offer is", async () => {
        const user = setupUser();
        const label = makeLabel();
        const todo = makeTodo({ labelIds: [label.id] });
        renderPage([label], [todo]);

        await open(user, label);

        expect(
          await screen.findByTestId("labels.assign.selectall.checkbox")
        ).toBeChecked();
      });

      it("Then pressing it again lets the lot go", async () => {
        const user = setupUser();
        const label = makeLabel();
        const carrying = makeTodo({ labelIds: [label.id] });
        const { todoRepository } = renderPage([label], [carrying]);

        await open(user, label);
        await user.click(
          await screen.findByTestId("labels.assign.selectall.checkbox")
        );
        await user.click(screen.getByTestId("labels.assign.save"));

        await waitFor(() =>
          expect(todoRepository.updateLabels).toHaveBeenCalledWith({
            id: carrying.id,
            labelIds: [],
          })
        );
      });
    });

    describe("when I search for the todos to pull in", () => {
      it("Then the title I type narrows the list", async () => {
        const user = setupUser();
        const label = makeLabel();
        const docs = makeTodo({ title: "Read the docs" });
        const ship = makeTodo({ title: "Ship it" });
        renderPage([label], [docs, ship]);

        await open(user, label);
        await user.type(
          await screen.findByTestId("labels.assign.search.input"),
          "docs"
        );

        await waitFor(() => expect(isOffered(ship)).toBe(false));
        expect(isOffered(docs)).toBe(true);
      });

      it("Then a project narrows it too", async () => {
        const user = setupUser();
        const label = makeLabel();
        const project = makeProject({ name: "Garden" });
        const filed = makeTodo({ projectId: project.id });
        const loose = makeTodo({ projectId: undefined });
        renderPage([label], [filed, loose], [project]);

        await open(user, label);
        await user.click(screen.getByTestId("labels.assign.project.select"));
        await user.click(
          await screen.findByTestId(`labels.assign.project.${project.id}`)
        );

        await waitFor(() => expect(isOffered(loose)).toBe(false));
        expect(isOffered(filed)).toBe(true);
      });

      it("Then a search matching nothing says so", async () => {
        const user = setupUser();
        const label = makeLabel();
        renderPage([label], [makeTodo({ title: "Read the docs" })]);

        await open(user, label);
        await user.type(
          await screen.findByTestId("labels.assign.search.input"),
          "zzz"
        );

        expect(
          await screen.findByTestId("labels.assign.empty")
        ).toBeInTheDocument();
      });

      it("Then a todo hidden by the search keeps the tick I gave it", async () => {
        const user = setupUser();
        const label = makeLabel();
        const docs = makeTodo({ title: "Read the docs", labelIds: [] });
        const ship = makeTodo({ title: "Ship it", labelIds: [] });
        const { todoRepository } = renderPage([label], [docs, ship]);

        await open(user, label);
        await tick(user, docs);
        await user.type(
          await screen.findByTestId("labels.assign.search.input"),
          "ship"
        );
        await waitFor(() => expect(isOffered(docs)).toBe(false));
        await user.click(screen.getByTestId("labels.assign.save"));

        await waitFor(() =>
          expect(todoRepository.updateLabels).toHaveBeenCalledWith({
            id: docs.id,
            labelIds: [label.id],
          })
        );
      });
    });
  });
});
