import { describe, expect, it } from "vitest";

import {
  MaxProjectDepth,
  buildProjectTree,
  canAddChild,
  canMoveProject,
  descendantIds,
  projectDepth,
  subtreeHeight,
  type TreeProject,
} from "@/lib/project-tree";

const project = (id: string, parentId?: string): TreeProject => ({
  id,
  name: id,
  parentId,
});

/** Root → child → grandchild, which is the whole depth budget. */
const family = [
  project("work"),
  project("website", "work"),
  project("launch", "website"),
  project("admin", "work"),
  project("home"),
];

const names = (nodes: { name: string }[]) => nodes.map((node) => node.name);

describe("project tree", () => {
  describe("when I build the tree", () => {
    it("Then each root carries its own children", () => {
      const tree = buildProjectTree(family);

      expect(names(tree)).toEqual(["home", "work"]);
      expect(names(tree[1].children)).toEqual(["admin", "website"]);
    });

    it("Then a root is one deep and its grandchild three", () => {
      const [, work] = buildProjectTree(family);

      expect(work.depth).toBe(1);
      expect(work.children[1].children[0].depth).toBe(3);
    });

    it("Then siblings are alphabetical, level by level", () => {
      const tree = buildProjectTree([
        project("zebra"),
        project("apple"),
        project("yak", "apple"),
        project("bear", "apple"),
      ]);

      expect(names(tree)).toEqual(["apple", "zebra"]);
      expect(names(tree[0].children)).toEqual(["bear", "yak"]);
    });

    /**
     * A half-finished delete is the realistic way this happens, and it is why
     * the delete is safe to attempt at all: the orphan is still the user's
     * project, and hiding it would look like data loss.
     */
    it("Then a project whose parent no longer exists is treated as a root", () => {
      const tree = buildProjectTree([project("orphan", "gone")]);

      expect(names(tree)).toEqual(["orphan"]);
      expect(tree[0].depth).toBe(1);
    });

    it("Then a cycle does not hang the walk", () => {
      const looped = [project("a", "b"), project("b", "a")];

      expect(() => buildProjectTree(looped)).not.toThrow();
      expect(buildProjectTree(looped)).toHaveLength(0);
    });
  });

  describe("when I ask how deep a project is", () => {
    it("Then a root is one", () => {
      expect(projectDepth(family, "work")).toBe(1);
    });

    it("Then a grandchild is three", () => {
      expect(projectDepth(family, "launch")).toBe(3);
    });

    it("Then a project caught in a cycle answers nothing rather than looping", () => {
      const looped = [project("a", "b"), project("b", "a")];

      expect(projectDepth(looped, "a")).toBeUndefined();
    });
  });

  describe("when I measure a subtree", () => {
    it("Then a leaf is one level tall", () => {
      expect(subtreeHeight(family, "launch")).toBe(1);
    });

    it("Then a project with a grandchild is three tall", () => {
      expect(subtreeHeight(family, "work")).toBe(3);
    });

    it("Then its descendants are everything under it, however deep", () => {
      expect(descendantIds(family, "work").sort()).toEqual([
        "admin",
        "launch",
        "website",
      ]);
    });
  });

  describe("when I move a project under another", () => {
    it("Then it is allowed while the subtree still fits", () => {
      expect(
        canMoveProject(family, { id: "admin", parentId: "website" })
      ).toBe(true);
    });

    it("Then it is refused when the subtree would reach a fourth level", () => {
      // `website` is two tall, and `website` under `admin` would start at two.
      expect(
        canMoveProject(family, { id: "website", parentId: "admin" })
      ).toBe(false);
    });

    it("Then it is refused under its own descendant", () => {
      expect(canMoveProject(family, { id: "work", parentId: "launch" })).toBe(
        false
      );
    });

    it("Then it is refused under itself", () => {
      expect(canMoveProject(family, { id: "work", parentId: "work" })).toBe(
        false
      );
    });

    it("Then it is refused under a project that is not there", () => {
      expect(canMoveProject(family, { id: "admin", parentId: "gone" })).toBe(
        false
      );
    });

    /** Promoting can only ever shrink depth, so it is always safe. */
    it("Then moving to the top level is always allowed", () => {
      expect(
        canMoveProject(family, { id: "launch", parentId: undefined })
      ).toBe(true);
    });
  });

  describe("when I ask whether a child can be added", () => {
    it("Then a root can take one", () => {
      expect(canAddChild(family, "work")).toBe(true);
    });

    it("Then a project already at the deepest level cannot", () => {
      expect(projectDepth(family, "launch")).toBe(MaxProjectDepth);
      expect(canAddChild(family, "launch")).toBe(false);
    });

    it("Then the top level always can", () => {
      expect(canAddChild(family, undefined)).toBe(true);
    });
  });
});
