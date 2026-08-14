import { uuidV7 } from "@/lib/uuid";
import { zodAsValidator } from "@/lib/validator";
import type { IValidator } from "@/validators/validators";
import * as z from "zod";

const projectZodScheme = z.object({
  id: z.string().nonempty({ error: "project-id-required" }),
  name: z.string().trim().nonempty({ error: "project-name-required" }),
});

export type ProjectEntity = z.infer<typeof projectZodScheme>;

export interface ProjectRepository {
  listAll(): Promise<ProjectEntity[]>;
  create(project: ProjectEntity): Promise<void>;
  findByName(name: string): Promise<ProjectEntity | undefined>;
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
   * instruction to duplicate it.
   */
  create = async (name: string): Promise<ProjectEntity | undefined> => {
    // Trimmed here, not by the schema: `IValidator` reports errors on the
    // object it was handed and never returns zod's transformed output, so a
    // `.trim()` in the scheme would guard the rule without cleaning the value.
    const validation = this.projectValidator.validateAll({
      id: uuidV7(),
      name: name.trim(),
    });

    if (!validation.isValid) return undefined;

    const existing = await this.repository.findByName(validation.obj.name);
    if (existing !== undefined) return existing;

    await this.repository.create(validation.obj);

    return validation.obj;
  };
}
