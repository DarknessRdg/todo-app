import { uuidV7 } from "@/lib/uuid";
import { zodAsValidator } from "@/lib/validator";
import type { IValidator } from "@/validators/validators";
import * as z from "zod";

const labelZodScheme = z.object({
  id: z.string().nonempty({ error: "label-id-required" }),
  name: z.string().trim().nonempty({ error: "label-name-required" }),
});

export type LabelEntity = z.infer<typeof labelZodScheme>;

export interface LabelRepository {
  listAll(): Promise<LabelEntity[]>;
  create(label: LabelEntity): Promise<void>;
  rename(params: { id: string; name: string }): Promise<void>;
  delete(id: string): Promise<void>;
  findByName(name: string): Promise<LabelEntity | undefined>;
}

/**
 * Labels, which are a name and nothing else — the same shape as a project, for
 * the same reason: what a label *means* is which todos carry it.
 *
 * A todo holds label ids rather than names, so renaming one is a single write
 * and cannot leave half the todos saying the old thing. Deleting one is two
 * steps that this service owns only half of: it removes the label, and the
 * caller asks `TodoService` to take the id off the todos carrying it.
 */
export class LabelService {
  private repository: LabelRepository;
  private readonly labelValidator: IValidator<LabelEntity>;

  constructor(params: { repository: LabelRepository }) {
    this.repository = params.repository;
    this.labelValidator = zodAsValidator(labelZodScheme);
  }

  listAll = () => this.repository.listAll();

  /**
   * Creates a label and hands it back, so a caller that made one inline can put
   * it straight onto a todo without re-reading the list.
   *
   * A name already in use returns the existing label rather than a second one
   * under the same name — a picker that offers "create" beside the names it is
   * already listing will be asked for a duplicate sooner or later, and two
   * labels reading `Bug` are indistinguishable everywhere they appear.
   */
  create = async (name: string): Promise<LabelEntity | undefined> => {
    // Trimmed here, not by the schema: `IValidator` reports errors on the
    // object it was handed and never returns zod's transformed output.
    const validation = this.labelValidator.validateAll({
      id: uuidV7(),
      name: name.trim(),
    });

    if (!validation.isValid) return undefined;

    const existing = await this.repository.findByName(validation.obj.name);
    if (existing !== undefined) return existing;

    await this.repository.create(validation.obj);

    return validation.obj;
  };

  /**
   * Renames a label, reporting whether it took.
   *
   * Refused when the name is blank, or when *another* label already answers to
   * it. Renaming a label to what it is already called is allowed and does
   * nothing visible — it is what happens when a rename is opened and confirmed
   * unchanged, which should not read as an error.
   */
  rename = async (params: { id: string; name: string }): Promise<boolean> => {
    const name = params.name.trim();

    const validation = this.labelValidator.validateAll({ id: params.id, name });
    if (!validation.isValid) return false;

    const existing = await this.repository.findByName(name);
    if (existing !== undefined && existing.id !== params.id) return false;

    await this.repository.rename({ id: params.id, name });

    return true;
  };

  delete = (id: string) => this.repository.delete(id);
}
