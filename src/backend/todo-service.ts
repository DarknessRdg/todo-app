export interface TodoEntity {
  id: string;
  name: string;
  createdAt: Date;
  done: boolean;
}

export interface TodoRepository {
  listAll(): Promise<TodoEntity[]>;
}

export class TodoService {
  private repository: TodoRepository;
  constructor({ repository }: { repository: TodoRepository }) {
    this.repository = repository;
  }

  listAll = () => this.repository.listAll();
}
