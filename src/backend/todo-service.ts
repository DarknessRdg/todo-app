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
  description: z.string().optional(),
});

const todoZodScheme = createTodoZodScheme.extend({
  id: z.string().nonempty({ error: "id-required" }),
  done: z.boolean(),
  createdAt: z.date(),
  // Rows written before subtasks existed have no such field, so the default
  // keeps them valid instead of failing to load.
  subtasks: z.array(subtaskZodScheme).default([]),
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
  updateDescription(params: { id: string; description: string }): Promise<void>;
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

  updateDescription = async (params: { id: string; description: string }) => {
    return this.repository.updateDescription(params);
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
