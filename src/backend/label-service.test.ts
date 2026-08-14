import { describe, expect, it, vi } from "vitest";

import { LabelService, type LabelRepository } from "@/backend/label-service";
import { makeLabel } from "@/test/todo-factory";

function mockRepository(
  overrides: Partial<LabelRepository> = {}
): LabelRepository {
  return {
    listAll: vi.fn<LabelRepository["listAll"]>().mockResolvedValue([]),
    create: vi.fn<LabelRepository["create"]>().mockResolvedValue(undefined),
    rename: vi.fn<LabelRepository["rename"]>().mockResolvedValue(undefined),
    delete: vi.fn<LabelRepository["delete"]>().mockResolvedValue(undefined),
    findByName: vi
      .fn<LabelRepository["findByName"]>()
      .mockResolvedValue(undefined),
    ...overrides,
  };
}

const serviceWith = (repository: LabelRepository) =>
  new LabelService({ repository });

describe("LabelService", () => {
  describe("when I create a label", () => {
    it("Then it is stored under the name I gave", async () => {
      const repository = mockRepository();
      const service = serviceWith(repository);

      await service.create("Frontend");

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Frontend" })
      );
    });

    it("Then it is handed back, so the caller can use it without re-reading", async () => {
      const service = serviceWith(mockRepository());

      const created = await service.create("Frontend");

      expect(created?.name).toBe("Frontend");
    });

    it("Then surrounding spaces are trimmed off the name", async () => {
      const repository = mockRepository();

      await serviceWith(repository).create("  Frontend  ");

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Frontend" })
      );
    });

    it("Then a blank name creates nothing", async () => {
      const repository = mockRepository();

      const created = await serviceWith(repository).create("   ");

      expect(created).toBeUndefined();
      expect(repository.create).not.toHaveBeenCalled();
    });

    describe("when a label by that name already exists", () => {
      const existing = makeLabel({ name: "Frontend" });

      it("Then the one that is there is handed back", async () => {
        const repository = mockRepository({
          findByName: vi.fn().mockResolvedValue(existing),
        });

        expect(await serviceWith(repository).create("Frontend")).toEqual(
          existing
        );
      });

      it("Then no second label is stored under the same name", async () => {
        const repository = mockRepository({
          findByName: vi.fn().mockResolvedValue(existing),
        });

        await serviceWith(repository).create("Frontend");

        expect(repository.create).not.toHaveBeenCalled();
      });
    });
  });

  describe("when I rename a label", () => {
    const label = makeLabel({ name: "Frontend" });

    it("Then the new name is stored", async () => {
      const repository = mockRepository();

      await serviceWith(repository).rename({ id: label.id, name: "UI" });

      expect(repository.rename).toHaveBeenCalledWith({
        id: label.id,
        name: "UI",
      });
    });

    it("Then a blank name is refused, so a label cannot lose its name", async () => {
      const repository = mockRepository();

      const renamed = await serviceWith(repository).rename({
        id: label.id,
        name: "  ",
      });

      expect(renamed).toBe(false);
      expect(repository.rename).not.toHaveBeenCalled();
    });

    it("Then taking a name another label already has is refused", async () => {
      const repository = mockRepository({
        findByName: vi.fn().mockResolvedValue(makeLabel({ name: "UI" })),
      });

      const renamed = await serviceWith(repository).rename({
        id: label.id,
        name: "UI",
      });

      expect(renamed).toBe(false);
      expect(repository.rename).not.toHaveBeenCalled();
    });

    it("Then renaming it to what it is already called is allowed", async () => {
      const repository = mockRepository({
        findByName: vi.fn().mockResolvedValue(label),
      });

      const renamed = await serviceWith(repository).rename({
        id: label.id,
        name: "Frontend",
      });

      expect(renamed).toBe(true);
      expect(repository.rename).toHaveBeenCalled();
    });
  });

  it("when I delete a label, Then it is removed", async () => {
    const repository = mockRepository();
    const label = makeLabel();

    await serviceWith(repository).delete(label.id);

    expect(repository.delete).toHaveBeenCalledWith(label.id);
  });

  it("when I list labels, Then the store's own order is kept", async () => {
    const labels = [makeLabel(), makeLabel()];
    const repository = mockRepository({
      listAll: vi.fn().mockResolvedValue(labels),
    });

    expect(await serviceWith(repository).listAll()).toEqual(labels);
  });
});
