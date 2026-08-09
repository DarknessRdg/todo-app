import { OpenDb, type AppIDB } from "@/backend/adapter/indexed-db/indexed-db";
import { ProjectRepositoryIndexedDB } from "@/backend/adapter/indexed-db/project-repository";
import { TodoRepositoryIndexedDB } from "@/backend/adapter/indexed-db/todo-repository";
import { ProjectService, type ProjectRepository } from "@/backend/project-service";
import { TodoService, type TodoRepository } from "@/backend/todo-service";
import { Container } from "inversify";

export async function createDIContainer() {
  const container = new Container({ defaultScope: "Singleton" });

  await resolve(container);

  return container;
}

const PrivateDependencies = {
  TodoRepository: Symbol.for("TodoServiceRepository"),
  ProjectRepository: Symbol.for("ProjectServiceRepository"),
  AppIDB: Symbol.for("AppIDB"),
};

export const Dependencies = {
  TodoService: Symbol.for("TodoService"),
  ProjectService: Symbol.for("ProjectService"),
};

async function resolve(container: Container) {
  container
    .bind<AppIDB>(PrivateDependencies.AppIDB)
    .toConstantValue(await OpenDb());

  container
    .bind<TodoRepository>(PrivateDependencies.TodoRepository)
    .toConstantValue(
      new TodoRepositoryIndexedDB(container.get(PrivateDependencies.AppIDB))
    );

  container
    .bind<ProjectRepository>(PrivateDependencies.ProjectRepository)
    .toConstantValue(
      new ProjectRepositoryIndexedDB(container.get(PrivateDependencies.AppIDB))
    );

  container.bind<TodoService>(Dependencies.TodoService).toConstantValue(
    new TodoService({
      repository: container.get(PrivateDependencies.TodoRepository),
    })
  );

  container.bind<ProjectService>(Dependencies.ProjectService).toConstantValue(
    new ProjectService({
      repository: container.get(PrivateDependencies.ProjectRepository),
    })
  );
}
