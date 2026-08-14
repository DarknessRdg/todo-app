import { describe, expect, it } from "vitest";

import type { ProjectService } from "@/backend/project-service";
import { Dependencies } from "@/di-container";
import {
  createTestContainer,
  mockProjectRepository,
  type MockProjectRepository,
} from "@/test/container";
import { makeProject } from "@/test/todo-factory";

function serviceWith(repository: MockProjectRepository) {
  return createTestContainer(undefined, repository).get<ProjectService>(
    Dependencies.ProjectService
  );
}

describe("ProjectService", () => {
  describe("when I create a project", () => {
    it("Then it is persisted with the name I gave", async () => {
      const repository = mockProjectRepository();

      await serviceWith(repository).create("Garden");

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create.mock.calls[0][0]).toMatchObject({
        name: "Garden",
      });
    });

    it("Then it is given an id of its own", async () => {
      const repository = mockProjectRepository();

      await serviceWith(repository).create("Garden");

      expect(repository.create.mock.calls[0][0].id).not.toBe("");
    });

    it("Then it is handed back, so the caller can select it at once", async () => {
      const repository = mockProjectRepository();

      const created = await serviceWith(repository).create("Garden");

      expect(created).toMatchObject({ name: "Garden" });
    });

    it("Then the name is stored trimmed", async () => {
      const repository = mockProjectRepository();

      await serviceWith(repository).create("   Garden   ");

      expect(repository.create.mock.calls[0][0].name).toBe("Garden");
    });

    it("Then an empty name is rejected instead of persisted", async () => {
      const repository = mockProjectRepository();

      const created = await serviceWith(repository).create("");

      expect(repository.create).not.toHaveBeenCalled();
      expect(created).toBeUndefined();
    });

    it("Then a name of only whitespace is rejected too", async () => {
      const repository = mockProjectRepository();

      const created = await serviceWith(repository).create("   ");

      expect(repository.create).not.toHaveBeenCalled();
      expect(created).toBeUndefined();
    });
  });

  describe("when I create a project whose name is already taken", () => {
    it("Then no second project is written under that name", async () => {
      const existing = makeProject({ name: "Garden" });
      const repository = mockProjectRepository();
      repository.findByName.mockResolvedValue(existing);

      await serviceWith(repository).create("Garden");

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("Then the one already there is handed back", async () => {
      const existing = makeProject({ name: "Garden" });
      const repository = mockProjectRepository();
      repository.findByName.mockResolvedValue(existing);

      const created = await serviceWith(repository).create("Garden");

      expect(created).toEqual(existing);
    });
  });

  it("when I list projects, Then what the repository holds comes back", async () => {
    const stored = [makeProject(), makeProject()];
    const repository = mockProjectRepository();
    repository.listAll.mockResolvedValue(stored);

    expect(await serviceWith(repository).listAll()).toEqual(stored);
  });
});
