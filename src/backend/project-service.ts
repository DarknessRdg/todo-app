import { canAddChild, canMoveProject } from "@/lib/project-tree";
import { uuidV7 } from "@/lib/uuid";
import { zodAsValidator } from "@/lib/validator";
import type { IValidator } from "@/validators/validators";
import * as z from "zod";

const projectZodScheme = z.object({
  id: z.string().nonempty({ error: "project-id-required" }),
  name: z.string().trim().nonempty({ error: "project-name-required" }),
  /**
   * The project this one is filed under. Absent means the top level.
   *
   * How *deep* the tree may go is deliberately not a rule here: it depends on
   * every other project, and a schema only ever sees one. The service asks
   * `@/lib/project-tree` instead, which is also what the sidebar asks to decide
   * what to offer.
   */
  parentId: z.string().optional(),
});

export type ProjectEntity = z.infer<typeof projectZodScheme>;

export interface ProjectRepository {
  listAll(): Promise<ProjectEntity[]>;
  create(project: ProjectEntity): Promise<void>;
  findByName(name: string): Promise<ProjectEntity | undefined>;
  rename(params: { id: string; name: string }): Promise<void>;
  /** Files a project under another, or takes it back to the top level. */
  move(params: { id: string; parentId: string | undefined }): Promise<void>;
  delete(id: string): Promise<void>;
}

export class ProjectService {
  private repository: ProjectRepository;
  private readonly projectValidator: IValidator<ProjectEntity>;

  constructor(params: { repository: ProjectRepository }) {
    this.repository = params.repository;
    this.projectValidator = zodAsValidator(projectZodScheme);
  }

  listAll = () => this.repository.listAll();

  /**
   * Creates a project and hands it back, so a caller that made one inline can
   * select it without re-reading the list.
   *
   * A name already in use returns the existing project rather than a second one
   * under the same name: the picker offers "create new" next to the names it
   * already lists, so asking for one that is right there is a slip, not an
   * instruction to duplicate it. Names stay unique across the whole tree rather
   * than per parent, so a name always means one project wherever it is read.
   *
   * Refuses to file one under a project that is already as deep as the tree
   * goes. The sidebar hides that affordance, but the rule lives here — a stale
   * render or a future importer would otherwise walk straight past it.
   */
  create = async (params: {
    name: string;
    parentId?: string;
  }): Promise<ProjectEntity | undefined> => {
    // Trimmed here, not by the schema: `IValidator` reports errors on the
    // object it was handed and never returns zod's transformed output, so a
    // `.trim()` in the scheme would guard the rule without cleaning the value.
    const validation = this.projectValidator.validateAll({
      id: uuidV7(),
      name: params.name.trim(),
      parentId: params.parentId,
    });

    if (!validation.isValid) return undefined;

    const existing = await this.repository.findByName(validation.obj.name);
    if (existing !== undefined) return existing;

    if (params.parentId !== undefined) {
      const projects = await this.repository.listAll();
      if (!canAddChild(projects, params.parentId)) return undefined;
    }

    await this.repository.create(validation.obj);

    return validation.obj;
  };

  /**
   * Renames one. `false` when the name is blank or already belongs to another
   * project — the same answer `LabelService.rename` gives, and for the same
   * reason: the caller has a field to put an error beside.
   */
  rename = async (params: { id: string; name: string }): Promise<boolean> => {
    const name = params.name.trim();
    if (name === "") return false;

    const existing = await this.repository.findByName(name);
    if (existing !== undefined && existing.id !== params.id) return false;

    await this.repository.rename({ id: params.id, name });

    return true;
  };

  /**
   * Files a project under another, subtree and all.
   *
   * Refused whole when it does not fit — see `canMoveProject`. Never flattened
   * and never partly applied: a move that quietly dropped a level would lose
   * the arrangement the reader built without saying so.
   */
  move = async (params: {
    id: string;
    parentId: string | undefined;
  }): Promise<boolean> => {
    const projects = await this.repository.listAll();
    if (!canMoveProject(projects, params)) return false;

    await this.repository.move(params);

    return true;
  };

  /**
   * Removes a project, promoting its children to its own parent.
   *
   * Not a cascade. Deleting "Work" is about the folder, not about everything
   * anyone ever filed in it, and taking the subtree with it would destroy work
   * the reader never named. Promoting can only ever shrink depth, so the
   * three-level rule needs no check here.
   *
   * The todos filed under it are *not* this service's to move — the caller
   * clears them through `TodoService`, because the two stores are separate and
   * neither can write the other's. See `useProjectDelete`.
   */
  delete = async (id: string): Promise<void> => {
    const projects = await this.repository.listAll();
    const going = projects.find((project) => project.id === id);
    if (going === undefined) return;

    for (const child of projects.filter((p) => p.parentId === id)) {
      await this.repository.move({
        id: child.id,
        parentId: going.parentId,
      });
    }

    await this.repository.delete(id);
  };
}
