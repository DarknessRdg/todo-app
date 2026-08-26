/**
 * Projects as a shallow tree, and the rules about how deep it may go.
 *
 * Kept away from the service so the rules can be tested as rules — the sidebar
 * asks the same questions to decide what to offer, and the service asks them to
 * decide what to allow. One answer, two callers, so the control and the rule
 * cannot drift apart.
 *
 * Domain-free on purpose: it reads the shape it needs rather than importing
 * `ProjectEntity`, the same way `todo-filter.ts` does.
 */

/**
 * Root, child, grandchild — and no further.
 *
 * A folder tree that keeps going stops being navigable in a sidebar long before
 * it stops being expressible, and every level costs the reader an indent they
 * have to hold in their head. Three is enough to file work under a client under
 * a year, which is the deepest anyone reached for.
 */
export const MaxProjectDepth = 3;

/** What the rules read. A project with no `parentId` sits at the top level. */
export type TreeProject = {
  id: string;
  name: string;
  parentId?: string | undefined;
};

export type ProjectNode<T extends TreeProject> = T & {
  /** 1 for a root, so it reads as "which level am I on". */
  depth: number;
  children: ProjectNode<T>[];
};

/**
 * The roots, each carrying its children, siblings alphabetical at every level —
 * matching the flat ordering the repositories already return.
 *
 * A project whose parent is not in the set is treated as a **root** rather than
 * dropped. That is what makes deleting a project survivable: it is several
 * writes that are not one transaction, and a half-finished one leaves projects
 * pointing at something gone. Showing them at the top level is wrong-looking;
 * hiding them looks exactly like data loss.
 *
 * A project caught in a parent cycle is left out entirely — there is no level
 * to draw it on, and a corrupted store must not hang the sidebar.
 */
export function buildProjectTree<T extends TreeProject>(
  projects: readonly T[]
): ProjectNode<T>[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  const nodes = new Map<string, ProjectNode<T>>();
  const roots: ProjectNode<T>[] = [];

  for (const project of projects) {
    const depth = depthOf(byId, project.id);
    if (depth === undefined) continue;

    nodes.set(project.id, { ...project, depth, children: [] });
  }

  for (const node of nodes.values()) {
    const parent =
      node.parentId === undefined ? undefined : nodes.get(node.parentId);

    if (parent === undefined) roots.push(node);
    else parent.children.push(node);
  }

  sortByName(roots);
  for (const node of nodes.values()) sortByName(node.children);

  return roots;
}

function sortByName<T extends TreeProject>(nodes: ProjectNode<T>[]) {
  nodes.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Which level a project sits on, counting from 1 — or `undefined` when the
 * parent chain loops.
 *
 * The walk carries a visited set rather than trusting the data. A cycle should
 * be impossible, but it is one lost write away, and an unguarded walk does not
 * fail loudly: it hangs the sidebar on every render with nothing to show why.
 */
export function projectDepth(
  projects: readonly TreeProject[],
  id: string
): number | undefined {
  return depthOf(new Map(projects.map((p) => [p.id, p])), id);
}

function depthOf(
  byId: Map<string, TreeProject>,
  id: string
): number | undefined {
  const seen = new Set<string>();
  let at = byId.get(id);
  let depth = 0;

  while (at !== undefined) {
    if (seen.has(at.id)) return undefined;
    seen.add(at.id);
    depth += 1;

    // An unknown parent is a root, so the walk stops here rather than looking
    // for a project that is not there.
    at = at.parentId === undefined ? undefined : byId.get(at.parentId);
  }

  return depth === 0 ? undefined : depth;
}

/** Everything filed under a project, however deep. */
export function descendantIds(
  projects: readonly TreeProject[],
  id: string
): string[] {
  const children = new Map<string, string[]>();
  for (const project of projects) {
    if (project.parentId === undefined) continue;
    children.set(project.parentId, [
      ...(children.get(project.parentId) ?? []),
      project.id,
    ]);
  }

  const found: string[] = [];
  const queue = [...(children.get(id) ?? [])];
  const seen = new Set<string>([id]);

  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined || seen.has(next)) continue;

    seen.add(next);
    found.push(next);
    queue.push(...(children.get(next) ?? []));
  }

  return found;
}

/** How many levels a project's own subtree occupies. 1 for a leaf. */
export function subtreeHeight(
  projects: readonly TreeProject[],
  id: string
): number {
  const base = projectDepth(projects, id);
  if (base === undefined) return 1;

  const depths = descendantIds(projects, id).map(
    (child) => projectDepth(projects, child) ?? base
  );

  return Math.max(base, ...depths) - base + 1;
}

/**
 * Whether a *new* project may be filed under this one. The top level always
 * can; a project already on the deepest level cannot.
 */
export function canAddChild(
  projects: readonly TreeProject[],
  parentId: string | undefined
): boolean {
  if (parentId === undefined) return true;

  const depth = projectDepth(projects, parentId);

  return depth !== undefined && depth < MaxProjectDepth;
}

/**
 * Whether a project may be filed under another, subtree and all.
 *
 * Refused whole rather than partly applied: a move that does not fit is not
 * flattened, not trimmed, and not half-done. Four things are refused — moving a
 * project onto itself, under something it already contains, under a project
 * that is not there, and any move whose subtree would need a fourth level.
 */
export function canMoveProject(
  projects: readonly TreeProject[],
  { id, parentId }: { id: string; parentId: string | undefined }
): boolean {
  if (id === parentId) return false;
  if (projectDepth(projects, id) === undefined) return false;

  // Promoting can only ever shrink depth, so the top level is always safe.
  if (parentId === undefined) return true;

  const parentDepth = projectDepth(projects, parentId);
  if (parentDepth === undefined) return false;
  if (descendantIds(projects, id).includes(parentId)) return false;

  return parentDepth + subtreeHeight(projects, id) <= MaxProjectDepth;
}
