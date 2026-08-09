import { screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { ProjectSelect } from "@/components/project-select";
import {
  createTestContainer,
  inMemoryProjectRepository,
  mockTodoRepository,
  renderWithContainer,
} from "@/test/container";
import { makeProject } from "@/test/todo-factory";

const picker = "project.select";
const none = "project.select.none";
const option = (id: string) => `project.select.option.${id}`;
const newName = "project.select.create.input";
const newSubmit = "project.select.create.button";

function renderPicker({
  projects = [],
  value,
}: {
  projects?: ReturnType<typeof makeProject>[];
  value?: string;
} = {}) {
  const projectRepository = inMemoryProjectRepository(projects);
  const onChange = vi.fn<(projectId: string | undefined) => void>();

  return {
    ...renderWithContainer(
      <ProjectSelect testId={picker} value={value} onChange={onChange} />,
      {
        diContainer: createTestContainer(
          mockTodoRepository(),
          projectRepository
        ),
      }
    ),
    onChange,
    projectRepository,
  };
}

describe("project select", () => {
  describe("when I open it", () => {
    it("Then every stored project is offered", async () => {
      const user = setupUser();
      const garden = makeProject({ name: "Garden" });
      renderPicker({ projects: [garden] });

      await user.click(screen.getByTestId(picker));

      expect(await screen.findByTestId(option(garden.id))).toHaveTextContent(
        "Garden"
      );
    });
  });

  describe("when I pick a project", () => {
    it("Then it is reported as the chosen one", async () => {
      const user = setupUser();
      const garden = makeProject({ name: "Garden" });
      const { onChange } = renderPicker({ projects: [garden] });

      await user.click(screen.getByTestId(picker));
      await user.click(await screen.findByTestId(option(garden.id)));

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(garden.id));
    });

    it("Then its name is what the trigger shows", async () => {
      const garden = makeProject({ name: "Garden" });
      renderPicker({ projects: [garden], value: garden.id });

      await waitFor(() =>
        expect(screen.getByTestId(picker)).toHaveTextContent("Garden")
      );
    });
  });

  it("when I choose no project, Then nothing is reported as chosen", async () => {
    const user = setupUser();
    const garden = makeProject({ name: "Garden" });
    const { onChange } = renderPicker({ projects: [garden], value: garden.id });

    await user.click(screen.getByTestId(picker));
    await user.click(await screen.findByTestId(none));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(undefined));
  });

  describe("when I create a project without leaving the picker", () => {
    it("Then it is persisted with the name I typed", async () => {
      const user = setupUser();
      const { projectRepository } = renderPicker();

      await user.click(screen.getByTestId(picker));
      await user.type(await screen.findByTestId(newName), "Garden");
      await user.click(screen.getByTestId(newSubmit));

      await waitFor(() =>
        expect(projectRepository.create.mock.calls[0][0]).toMatchObject({
          name: "Garden",
        })
      );
    });

    it("Then it becomes the chosen one, with no second step", async () => {
      const user = setupUser();
      const { onChange, projectRepository } = renderPicker();

      await user.click(screen.getByTestId(picker));
      await user.type(await screen.findByTestId(newName), "Garden");
      await user.click(screen.getByTestId(newSubmit));

      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const created = projectRepository.create.mock.calls[0][0];
      expect(onChange).toHaveBeenCalledWith(created.id);
    });

    it("Then a blank name creates nothing", async () => {
      const user = setupUser();
      const { projectRepository } = renderPicker();

      await user.click(screen.getByTestId(picker));
      await user.type(await screen.findByTestId(newName), "   ");
      await user.click(screen.getByTestId(newSubmit));

      await waitFor(() =>
        expect(screen.getByTestId(newName)).toBeInTheDocument()
      );
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it("Then a name already taken selects that one instead of duplicating it", async () => {
      const user = setupUser();
      const garden = makeProject({ name: "Garden" });
      const { onChange, projectRepository } = renderPicker({
        projects: [garden],
      });

      await user.click(screen.getByTestId(picker));
      await user.type(await screen.findByTestId(newName), "Garden");
      await user.click(screen.getByTestId(newSubmit));

      await waitFor(() => expect(onChange).toHaveBeenCalledWith(garden.id));
      expect(projectRepository.create).not.toHaveBeenCalled();
    });
  });
});
