import { screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { ProjectPage } from "@/pages/project/project-page";
import {
  createTestContainer,
  inMemoryProjectRepository,
  inMemoryTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeProject, makeTodo } from "@/test/todo-factory";

const pageTitle = "project.page.title";
const notFound = "not-found";
const todoTitle = (id: string) => `home.todo.${id}.title`;

/**
 * The page reads its id from the path, so it has to be mounted behind a real
 * route rather than rendered bare — `useParams()` is empty otherwise.
 */
function renderProjectPage({
  projects = [],
  todos = [],
  visiting,
}: {
  projects?: ReturnType<typeof makeProject>[];
  todos?: ReturnType<typeof makeTodo>[];
  visiting: string;
}) {
  return renderWithContainer(
    <Routes>
      <Route path="/project/:id" element={<ProjectPage />} />
    </Routes>,
    {
      diContainer: createTestContainer(
        inMemoryTodoRepository(todos),
        inMemoryProjectRepository(projects)
      ),
      route: `/project/${visiting}`,
    }
  );
}

describe("project page", () => {
  describe("when the url points at a stored project", () => {
    it("Then the project is named on the page", async () => {
      const garden = makeProject({ name: "Garden" });
      renderProjectPage({ projects: [garden], visiting: garden.id });

      expect(await screen.findByTestId(pageTitle)).toHaveTextContent("Garden");
    });

    it("Then its todos are listed", async () => {
      const garden = makeProject();
      const mine = makeTodo({ projectId: garden.id, done: false });
      renderProjectPage({
        projects: [garden],
        todos: [mine],
        visiting: garden.id,
      });

      expect(await screen.findByTestId(todoTitle(mine.id))).toBeInTheDocument();
    });

    it("Then another project's todos are left out", async () => {
      const garden = makeProject();
      const other = makeProject();
      const mine = makeTodo({ projectId: garden.id, done: false });
      const theirs = makeTodo({ projectId: other.id, done: false });

      renderProjectPage({
        projects: [garden, other],
        todos: [mine, theirs],
        visiting: garden.id,
      });

      await screen.findByTestId(todoTitle(mine.id));

      expect(screen.queryByTestId(todoTitle(theirs.id))).not.toBeInTheDocument();
    });

    it("Then todos belonging to no project are left out too", async () => {
      const garden = makeProject();
      const mine = makeTodo({ projectId: garden.id, done: false });
      const loose = makeTodo({ projectId: undefined, done: false });

      renderProjectPage({
        projects: [garden],
        todos: [mine, loose],
        visiting: garden.id,
      });

      await screen.findByTestId(todoTitle(mine.id));

      expect(screen.queryByTestId(todoTitle(loose.id))).not.toBeInTheDocument();
    });
  });

  describe("when the url points at a project that is not there", () => {
    it("Then the not-found page stands in for it", async () => {
      renderProjectPage({ projects: [makeProject()], visiting: "nope" });

      expect(await screen.findByTestId(notFound)).toBeInTheDocument();
    });

    it("Then the url is left alone, so the id can still be read off it", async () => {
      const { currentLocation } = renderProjectPage({
        projects: [makeProject()],
        visiting: "nope",
      });

      await screen.findByTestId(notFound);

      await waitFor(() => expect(currentLocation()).toBe("/project/nope"));
    });
  });

  describe("when I open a todo from a project", () => {
    it("Then its detail modal opens over the project", async () => {
      const user = setupUser();
      const garden = makeProject();
      const mine = makeTodo({ projectId: garden.id, done: false });

      renderProjectPage({
        projects: [garden],
        todos: [mine],
        visiting: garden.id,
      });

      await user.click(await screen.findByTestId(todoTitle(mine.id)));

      expect(
        await screen.findByTestId(`home.todo.${mine.id}.modal`)
      ).toBeInTheDocument();
    });

    it("Then the url keeps the project it was opened from", async () => {
      const user = setupUser();
      const garden = makeProject();
      const mine = makeTodo({ projectId: garden.id, done: false });

      const { currentLocation } = renderProjectPage({
        projects: [garden],
        todos: [mine],
        visiting: garden.id,
      });

      await user.click(await screen.findByTestId(todoTitle(mine.id)));

      await waitFor(() =>
        expect(currentLocation()).toBe(`/project/${garden.id}?todo=${mine.id}`)
      );
    });
  });
});
