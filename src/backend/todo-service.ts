import type { RichTextDoc } from "@/lib/rich-text";
import { uuidV7 } from "@/lib/uuid";
import { zodAsValidator } from "@/lib/validator";
import type { IValidator } from "@/validators/validators";
import * as z from "zod";

const subtaskZodScheme = z.object({
  id: z.string().nonempty({ error: "subtask-id-required" }),
  title: z.string().trim().nonempty({ error: "subtask-title-required" }),
  done: z.boolean(),
});

const createTodoZodScheme = z.object({
  title: z.string().nonempty({ error: "title-required" }),
  dueDate: z.date().optional(),
  /**
   * The description, as Markdown. This is the record of truth: portable,
   * readable, and what the app falls back to whenever the parsed copy beside it
   * is missing.
   */
  description: z.string().optional(),
  /**
   * The same description, pre-parsed by the editor, so showing it does not mean
   * parsing the markdown again — most of what a description costs to display.
   *
   * A cache, not a second source of truth. Written only together with
   * `description`, so the two cannot drift apart; absent on rows that predate
   * it and on anything restored from a markdown backup, which simply parse the
   * markdown until their next save. Kept opaque — the shape belongs to the
   * editor, and the domain stays free of it.
   */
  descriptionDoc: z.record(z.string(), z.unknown()).optional(),
  /** Which project it belongs to. Unset means the inbox — no project yet. */
  projectId: z.string().optional(),
});

const todoZodScheme = createTodoZodScheme.extend({
  id: z.string().nonempty({ error: "id-required" }),
  done: z.boolean(),
  createdAt: z.date(),
  // When it was completed. Absent while the todo is open, and cleared again if
  // it is reopened — kept separate from `dueDate`, which the user chooses.
  doneAt: z.date().optional(),
  // Rows written before subtasks existed have no such field, so the default
  // keeps them valid instead of failing to load.
  subtasks: z.array(subtaskZodScheme).default([]),
  /**
   * The labels on this todo, by id rather than by name: renaming a label is
   * then one write, and can never leave half the todos saying the old thing.
   * Defaulted for the same reason as `subtasks` — rows predate the field.
   */
  labelIds: z.array(z.string()).default([]),
});

export type SubtaskEntity = z.infer<typeof subtaskZodScheme>;
export type TodoEntity = z.infer<typeof todoZodScheme>;
export type CreateTodoEntity = z.infer<typeof createTodoZodScheme>;

export interface TodoRepository {
  listAll(): Promise<TodoEntity[]>;
  create(todo: TodoEntity): Promise<void>;
  delete(id: string): Promise<void>;
  updateDone(params: { id: string; done: boolean }): Promise<void>;
  updateTitle(params: { id: string; title: string }): Promise<void>;
  updateProject(params: {
    id: string;
    projectId: string | undefined;
  }): Promise<void>;
  updateDueDate(params: {
    id: string;
    dueDate: Date | undefined;
  }): Promise<void>;
  updateDescription(params: {
    id: string;
    description: string;
    descriptionDoc: RichTextDoc | undefined;
  }): Promise<void>;
  updateLabels(params: { id: string; labelIds: string[] }): Promise<void>;
  /** Takes one label off every todo carrying it — what deleting it means. */
  removeLabelEverywhere(labelId: string): Promise<void>;
  count(): Promise<number>;
  getById(id: string): Promise<TodoEntity | undefined>;
  addSubtask(params: { id: string; subtask: SubtaskEntity }): Promise<void>;
  updateSubtaskDone(params: {
    id: string;
    subtaskId: string;
    done: boolean;
  }): Promise<void>;
  deleteSubtask(params: { id: string; subtaskId: string }): Promise<void>;
}

export class TodoService {
  private repository: TodoRepository;
  private readonly todoEntityValidator: IValidator<TodoEntity>;
  private readonly createTodoEntityValidator: IValidator<CreateTodoEntity>;
  private readonly subtaskEntityValidator: IValidator<SubtaskEntity>;

  constructor(params: { repository: TodoRepository }) {
    this.repository = params.repository;
    this.todoEntityValidator = zodAsValidator(todoZodScheme);
    this.createTodoEntityValidator = zodAsValidator(createTodoZodScheme);
    this.subtaskEntityValidator = zodAsValidator(subtaskZodScheme);
  }

  listAll = () => this.repository.listAll();

  delete = (id: string) => {
    return this.repository.delete(id);
  };

  create = async (partial: CreateTodoEntity) => {
    const validation = this.todoEntityValidator.validateAll({
      done: false,
      id: uuidV7(),
      createdAt: new Date(),
      subtasks: [],
      labelIds: [],
      ...partial,
    });

    return validation.onValidAsync(async (todo) => {
      await this.repository.create(todo);
    });
  };

  updateDone = async (params: { id: string; done: boolean }) => {
    return this.repository.updateDone(params);
  };

  /**
   * A todo must always have a name, so a retitle is validated the same way the
   * original title was — a blank one is refused rather than persisted, which
   * would leave the row unidentifiable in the list.
   */
  updateTitle = async ({ id, title }: { id: string; title: string }) => {
    // Trimmed here, not by the schema: `IValidator` reports errors on the
    // object it was handed and never returns zod's transformed output, so a
    // `.trim()` in the scheme would guard the rule without cleaning the value.
    const validation = this.createTodoEntityValidator.validateAll({
      title: title.trim(),
    });

    return validation.onValidAsync(async (valid) => {
      await this.repository.updateTitle({ id, title: valid.title });
    });
  };

  /** Setting a due date, or clearing the one it had. */
  updateDueDate = async (params: { id: string; dueDate: Date | undefined }) => {
    return this.repository.updateDueDate(params);
  };

  /** Moving a todo between projects, or out of one entirely. */
  updateProject = async (params: {
    id: string;
    projectId: string | undefined;
  }) => {
    return this.repository.updateProject(params);
  };

  /**
   * Saves a description in both spellings at once.
   *
   * Both always, never one: writing the markdown while leaving an older parsed
   * copy in place would leave the fast path showing text the todo no longer
   * says. A caller with no doc to offer passes `undefined`, which clears the
   * stored one rather than stranding it.
   */
  updateDescription = async (params: {
    id: string;
    description: string;
    descriptionDoc: RichTextDoc | undefined;
  }) => {
    return this.repository.updateDescription(params);
  };

  /**
   * Sets which labels a todo carries. Deduplicated, because carrying the same
   * label twice means nothing and would draw the chip twice.
   */
  updateLabels = async (params: { id: string; labelIds: string[] }) => {
    return this.repository.updateLabels({
      id: params.id,
      labelIds: [...new Set(params.labelIds)],
    });
  };

  /**
   * The other half of deleting a label. The label store and the todo store are
   * separate, so removing the label leaves its id behind on every todo that
   * carried it; this is what the caller runs to clean those up.
   */
  removeLabelEverywhere = async (labelId: string) => {
    return this.repository.removeLabelEverywhere(labelId);
  };

  count = async () => this.repository.count();

  /**
   * Subtasks are owned by their todo: the id is minted here, and an untitled
   * one is rejected rather than persisted as a blank row.
   */
  addSubtask = async ({ id, title }: { id: string; title: string }) => {
    // Trimmed here, not by the schema: `IValidator` reports errors on the
    // object it was handed and never returns zod's transformed output, so a
    // `.trim()` in the scheme would guard the rule without cleaning the value.
    const validation = this.subtaskEntityValidator.validateAll({
      id: uuidV7(),
      title: title.trim(),
      done: false,
    });

    return validation.onValidAsync(async (subtask) => {
      await this.repository.addSubtask({ id, subtask });
    });
  };

  updateSubtaskDone = async (params: {
    id: string;
    subtaskId: string;
    done: boolean;
  }) => {
    return this.repository.updateSubtaskDone(params);
  };

  deleteSubtask = async (params: { id: string; subtaskId: string }) => {
    return this.repository.deleteSubtask(params);
  };

  validateField = (obj: CreateTodoEntity, field: keyof CreateTodoEntity) =>
    this.createTodoEntityValidator.validateField(obj, field);

  byId = (id: string) => this.repository.getById(id);
}
