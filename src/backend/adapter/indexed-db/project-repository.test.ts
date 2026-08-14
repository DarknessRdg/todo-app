import "fake-indexeddb/auto";

import { deleteDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";

import { OpenDb } from "@/backend/adapter/indexed-db/indexed-db";
import { ProjectRepositoryIndexedDB } from "@/backend/adapter/indexed-db/project-repository";
import { makeProject } from "@/test/todo-factory";

const DatabaseName = "darknessRdg/todo-web-app";

/** Every connection opened here, so none is left to block the teardown. */
const connections: Awaited<ReturnType<typeof OpenDb>>[] = [];

afterEach(async () => {
  for (const db of connections) db.close();
  connections.length = 0;
  await deleteDB(DatabaseName);
});

async function repositoryWith(projects: ReturnType<typeof makeProject>[] = []) {
  const db = await OpenDb();
  connections.push(db);

  const repository = new ProjectRepositoryIndexedDB(db);
  for (const project of projects) await repository.create(project);

  return repository;
}

describe("ProjectRepositoryIndexedDB", () => {
  it("when the database is created, Then it holds no projects until I add one", async () => {
    const repository = await repositoryWith();

    expect(await repository.listAll()).toEqual([]);
  });

  describe("when I create a project", () => {
    it("Then it is stored", async () => {
      const repository = await repositoryWith();
      const garden = makeProject({ name: "Garden" });

      await repository.create(garden);

      expect(await repository.listAll()).toContainEqual(garden);
    });
  });

  describe("when I list projects", () => {
    it("Then they come back in alphabetical order, not insertion order", async () => {
      const repository = await repositoryWith([
        makeProject({ name: "Zebra" }),
        makeProject({ name: "Alpha" }),
      ]);

      const names = (await repository.listAll()).map((project) => project.name);

      expect(names.indexOf("Alpha")).toBeLessThan(names.indexOf("Zebra"));
    });
  });

  describe("when I look a project up by name", () => {
    it("Then the one stored under it is found", async () => {
      const garden = makeProject({ name: "Garden" });
      const repository = await repositoryWith([garden]);

      expect(await repository.findByName("Garden")).toEqual(garden);
    });

    it("Then a different casing finds the same one, so the list cannot hold both", async () => {
      const garden = makeProject({ name: "Garden" });
      const repository = await repositoryWith([garden]);

      expect(await repository.findByName("gArDeN")).toEqual(garden);
    });

    it("Then a name nobody used comes back empty", async () => {
      const repository = await repositoryWith();

      expect(await repository.findByName("Nothing here")).toBeUndefined();
    });
  });
});
