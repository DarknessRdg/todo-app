import { OpenDb, type AppIDB } from "@/backend/adpter/indexed-db/indexed-db";
import { TodoRepositoryIndexedDB } from "@/backend/adpter/indexed-db/todo-repository";
import { TodoService, type TodoRepository } from "@/backend/todo-service";
import { Container } from "inversify";

export async function createDIContainer() {
  const container = new Container({ defaultScope: "Singleton" });

  await resolve(container);

  return container;
}

const PrivateDependencies = {
  TodoRepository: Symbol.for("TodoServiceRepository"),
  AppIDB: Symbol.for("AppIDB"),
};

export const Dependencies = {
  TodoService: Symbol.for("TodoService"),
};

async function resolve(container: Container) {
  container
    .bind<AppIDB>(PrivateDependencies.AppIDB)
    .toConstantValue(await OpenDb());

  container
    .bind<TodoRepository>(PrivateDependencies.TodoRepository)
    .toConstantValue(new TodoRepositoryIndexedDB(container.get(PrivateDependencies.AppIDB)));

  container.bind<TodoService>(Dependencies.TodoService).toConstantValue(
    new TodoService({
      repository: container.get(PrivateDependencies.TodoRepository),
    })
  );
}
