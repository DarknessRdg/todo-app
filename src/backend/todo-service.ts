import { uuidV7 } from "@/lib/uuid";
import { zodAsValidator } from "@/lib/validator";
import type { IValidator } from "@/validators/validators";
import * as z from "zod";

const createTodoZodScheme = z.object({
  title: z.string().nonempty({ error: "title-required" }),
  dueDate: z.date().optional(),
  description: z.string().optional(),
});

const todoZodScheme = createTodoZodScheme.extend({
  id: z.string().nonempty({ error: "id-required" }),
  done: z.boolean(),
  createdAt: z.date(),
});

export type TodoEntity = z.infer<typeof todoZodScheme>;
export type CreateTodoEntity = z.infer<typeof createTodoZodScheme>;

export interface TodoRepository {
  listAll(): Promise<TodoEntity[]>;
  create(todo: TodoEntity): Promise<void>;
  delete(id: string): Promise<void>;
  updateDone(params: { id: string; done: boolean }): Promise<void>;
  count(): Promise<number>;
  getById(id: string): Promise<TodoEntity | undefined>;
}

export class TodoService {
  private repository: TodoRepository;
  private readonly todoEntityValidator: IValidator<TodoEntity>;
  private readonly createTodoEntityValidator: IValidator<CreateTodoEntity>;

  constructor(params: { repository: TodoRepository }) {
    this.repository = params.repository;
    this.todoEntityValidator = zodAsValidator(todoZodScheme);
    this.createTodoEntityValidator = zodAsValidator(createTodoZodScheme);
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
      ...partial,
    });

    return validation.onValidAsync(async (todo) => {
      await this.repository.create(todo);
    });
  };

  updateDone = async (params: { id: string; done: boolean }) => {
    return this.repository.updateDone(params);
  };

  count = async () => this.repository.count();

  validateField = (obj: CreateTodoEntity, field: keyof CreateTodoEntity) =>
    this.createTodoEntityValidator.validateField(obj, field);

  byId = (id: string) => this.repository.getById(id);
}
