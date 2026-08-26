import { screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { LabelPage } from "@/pages/label/label-page";
import {
  createTestContainer,
  inMemoryLabelRepository,
  inMemoryTodoRepository,
  mockProjectRepository,
  renderWithContainer,
} from "@/test/container";
import { makeLabel, makeTodo } from "@/test/todo-factory";

const pageTitle = "label.page.title";
const notFound = "not-found";
const todoTitle = (id: string) => `home.todo.${id}.title`;

/**
 * The page reads its id from the path, so it has to be mounted behind a real
 * route rather than rendered bare — `useParams()` is empty otherwise.
 */
function renderLabelPage({
  labels = [],
  todos = [],
  visiting,
}: {
  labels?: ReturnType<typeof makeLabel>[];
  todos?: ReturnType<typeof makeTodo>[];
  visiting: string;
}) {
  return renderWithContainer(
    <Routes>
      <Route path="/label/:id" element={<LabelPage />} />
    </Routes>,
    {
      diContainer: createTestContainer(
        inMemoryTodoRepository(todos),
        mockProjectRepository(),
        inMemoryLabelRepository(labels)
      ),
      route: `/label/${visiting}`,
    }
  );
}

describe("label page", () => {
  describe("when the url points at a stored label", () => {
    it("Then the label is named on the page", async () => {
      const bug = makeLabel({ name: "Bug" });
      renderLabelPage({ labels: [bug], visiting: bug.id });

      expect(await screen.findByTestId(pageTitle)).toHaveTextContent("Bug");
    });

    it("Then the todos carrying it are listed", async () => {
      const bug = makeLabel({ name: "Bug" });
      const carrying = makeTodo({ done: false, labelIds: [bug.id] });
      renderLabelPage({
        labels: [bug],
        todos: [carrying],
        visiting: bug.id,
      });

      expect(
        await screen.findByTestId(todoTitle(carrying.id))
      ).toBeInTheDocument();
    });

    it("Then a todo carrying another label is left out", async () => {
      const bug = makeLabel({ name: "Bug" });
      const ux = makeLabel({ name: "UX" });
      const carrying = makeTodo({ done: false, labelIds: [bug.id] });
      const other = makeTodo({ done: false, labelIds: [ux.id] });
      renderLabelPage({
        labels: [bug, ux],
        todos: [carrying, other],
        visiting: bug.id,
      });

      await screen.findByTestId(todoTitle(carrying.id));
      expect(screen.queryByTestId(todoTitle(other.id))).not.toBeInTheDocument();
    });

    it("Then a todo carrying no label at all is left out too", async () => {
      const bug = makeLabel({ name: "Bug" });
      const carrying = makeTodo({ done: false, labelIds: [bug.id] });
      const bare = makeTodo({ done: false, labelIds: [] });
      renderLabelPage({
        labels: [bug],
        todos: [carrying, bare],
        visiting: bug.id,
      });

      await screen.findByTestId(todoTitle(carrying.id));
      expect(screen.queryByTestId(todoTitle(bare.id))).not.toBeInTheDocument();
    });
  });

  describe("when the url points at a label that is not there", () => {
    it("Then the not-found page stands in for it", async () => {
      renderLabelPage({ labels: [makeLabel()], visiting: "gone" });

      expect(await screen.findByTestId(notFound)).toBeInTheDocument();
    });
  });

  it("when I open a todo from a label, Then the url carries its id", async () => {
    const user = setupUser();
    const bug = makeLabel({ name: "Bug" });
    const todo = makeTodo({ done: false, labelIds: [bug.id] });
    const { currentLocation } = renderLabelPage({
      labels: [bug],
      todos: [todo],
      visiting: bug.id,
    });

    await user.click(await screen.findByTestId(todoTitle(todo.id)));

    await waitFor(() =>
      expect(currentLocation()).toBe(`/label/${bug.id}?todo=${todo.id}`)
    );
  });
});
