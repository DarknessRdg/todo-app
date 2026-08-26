import { describe, expect, it } from "vitest";

import type { ProjectService } from "@/backend/project-service";
import { Dependencies } from "@/di-container";
import {
  createTestContainer,
  inMemoryProjectRepository,
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

      await serviceWith(repository).create({ name: "Garden" });

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create.mock.calls[0][0]).toMatchObject({
        name: "Garden",
      });
    });

    it("Then it is given an id of its own", async () => {
      const repository = mockProjectRepository();

      await serviceWith(repository).create({ name: "Garden" });

      expect(repository.create.mock.calls[0][0].id).not.toBe("");
    });

    it("Then it is handed back, so the caller can select it at once", async () => {
      const repository = mockProjectRepository();

      const created = await serviceWith(repository).create({ name: "Garden" });

      expect(created).toMatchObject({ name: "Garden" });
    });

    it("Then the name is stored trimmed", async () => {
      const repository = mockProjectRepository();

      await serviceWith(repository).create({ name: "   Garden   " });

      expect(repository.create.mock.calls[0][0].name).toBe("Garden");
    });

    it("Then an empty name is rejected instead of persisted", async () => {
      const repository = mockProjectRepository();

      const created = await serviceWith(repository).create({ name: "" });

      expect(repository.create).not.toHaveBeenCalled();
      expect(created).toBeUndefined();
    });

    it("Then a name of only whitespace is rejected too", async () => {
      const repository = mockProjectRepository();

      const created = await serviceWith(repository).create({ name: "   " });

      expect(repository.create).not.toHaveBeenCalled();
      expect(created).toBeUndefined();
    });
  });

  describe("when I create a project whose name is already taken", () => {
    it("Then no second project is written under that name", async () => {
      const existing = makeProject({ name: "Garden" });
      const repository = mockProjectRepository();
      repository.findByName.mockResolvedValue(existing);

      await serviceWith(repository).create({ name: "Garden" });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it("Then the one already there is handed back", async () => {
      const existing = makeProject({ name: "Garden" });
      const repository = mockProjectRepository();
      repository.findByName.mockResolvedValue(existing);

      const created = await serviceWith(repository).create({ name: "Garden" });

      expect(created).toEqual(existing);
    });
  });

  it("when I list projects, Then what the repository holds comes back", async () => {
    const stored = [makeProject(), makeProject()];
    const repository = mockProjectRepository();
    repository.listAll.mockResolvedValue(stored);

    expect(await serviceWith(repository).listAll()).toEqual(stored);
  });

  /**
   * Three levels: root, child, grandchild. The rule itself lives in
   * `@/lib/project-tree` and is tested there; these specs are about the service
   * refusing to write what the rule refuses — the sidebar hides the affordance,
   * but a stale render must not be able to walk past it.
   */
  describe("when I file a project under another", () => {
    it("Then it is persisted with that parent", async () => {
      const work = makeProject({ name: "Work" });
      const repository = inMemoryProjectRepository([work]);

      await serviceWith(repository).create({
        name: "Website",
        parentId: work.id,
      });

      expect(repository.create.mock.calls[0][0].parentId).toBe(work.id);
    });

    it("Then one under a project already three deep is refused", async () => {
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const launch = makeProject({ name: "Launch", parentId: website.id });
      const repository = inMemoryProjectRepository([work, website, launch]);

      const created = await serviceWith(repository).create({
        name: "Too deep",
        parentId: launch.id,
      });

      expect(created).toBeUndefined();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("when I rename a project", () => {
    it("Then the new name is persisted", async () => {
      const garden = makeProject({ name: "Garden" });
      const repository = inMemoryProjectRepository([garden]);

      const renamed = await serviceWith(repository).rename({
        id: garden.id,
        name: "Allotment",
      });

      expect(renamed).toBe(true);
      expect(repository.rename).toHaveBeenCalledWith({
        id: garden.id,
        name: "Allotment",
      });
    });

    it("Then a name another project already uses is refused", async () => {
      const garden = makeProject({ name: "Garden" });
      const work = makeProject({ name: "Work" });
      const repository = inMemoryProjectRepository([garden, work]);

      const renamed = await serviceWith(repository).rename({
        id: garden.id,
        name: "Work",
      });

      expect(renamed).toBe(false);
      expect(repository.rename).not.toHaveBeenCalled();
    });

    it("Then a blank name is refused, so a project cannot be left nameless", async () => {
      const garden = makeProject({ name: "Garden" });
      const repository = inMemoryProjectRepository([garden]);

      expect(
        await serviceWith(repository).rename({ id: garden.id, name: "   " })
      ).toBe(false);
    });
  });

  describe("when I move a project", () => {
    it("Then it is reparented", async () => {
      const work = makeProject({ name: "Work" });
      const stray = makeProject({ name: "Stray" });
      const repository = inMemoryProjectRepository([work, stray]);

      const moved = await serviceWith(repository).move({
        id: stray.id,
        parentId: work.id,
      });

      expect(moved).toBe(true);
      expect(repository.move).toHaveBeenCalledWith({
        id: stray.id,
        parentId: work.id,
      });
    });

    it("Then a move that would need a fourth level is refused whole", async () => {
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const launch = makeProject({ name: "Launch", parentId: website.id });
      const repository = inMemoryProjectRepository([work, website, launch]);

      const moved = await serviceWith(repository).move({
        id: website.id,
        parentId: launch.id,
      });

      expect(moved).toBe(false);
      expect(repository.move).not.toHaveBeenCalled();
    });

    it("Then a move under its own descendant is refused", async () => {
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const repository = inMemoryProjectRepository([work, website]);

      expect(
        await serviceWith(repository).move({
          id: work.id,
          parentId: website.id,
        })
      ).toBe(false);
    });
  });

  describe("when I delete a project", () => {
    it("Then it is removed", async () => {
      const work = makeProject({ name: "Work" });
      const repository = inMemoryProjectRepository([work]);

      await serviceWith(repository).delete(work.id);

      expect(repository.delete).toHaveBeenCalledWith(work.id);
    });

    /**
     * Not a cascade: deleting the folder must not destroy what was filed in it.
     * Promoting can only shrink depth, so nothing can overflow the three levels.
     */
    it("Then its children move up to its own parent", async () => {
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const launch = makeProject({ name: "Launch", parentId: website.id });
      const repository = inMemoryProjectRepository([work, website, launch]);

      await serviceWith(repository).delete(website.id);

      expect(repository.move).toHaveBeenCalledWith({
        id: launch.id,
        parentId: work.id,
      });
    });

    it("Then deleting a root leaves its children at the top level", async () => {
      const work = makeProject({ name: "Work" });
      const website = makeProject({ name: "Website", parentId: work.id });
      const repository = inMemoryProjectRepository([work, website]);

      await serviceWith(repository).delete(work.id);

      expect(repository.move).toHaveBeenCalledWith({
        id: website.id,
        parentId: undefined,
      });
    });

    it("Then a project that is not there is left alone", async () => {
      const repository = inMemoryProjectRepository([]);

      await serviceWith(repository).delete("gone");

      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
