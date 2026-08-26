import { Tables, type AppIDB } from "@/backend/adapter/indexed-db/indexed-db";
import type {
  ProjectEntity,
  ProjectRepository,
} from "@/backend/project-service";

export class ProjectRepositoryIndexedDB implements ProjectRepository {
  private db: AppIDB;

  constructor(db: AppIDB) {
    this.db = db;
  }

  listAll = async () => {
    const projects = await this.db.getAll(Tables.Project);

    // Alphabetical, so the picker does not reorder itself as projects are
    // added — insertion order would move a name the moment another arrives.
    return projects.sort((a, b) => a.name.localeCompare(b.name));
  };

  create = async (project: ProjectEntity) => {
    await this.db.add(Tables.Project, project);
  };

  rename = async ({ id, name }: { id: string; name: string }) => {
    await this.write(id, (project) => ({ ...project, name }));
  };

  move = async ({
    id,
    parentId,
  }: {
    id: string;
    parentId: string | undefined;
  }) => {
    await this.write(id, (project) => ({ ...project, parentId }));
  };

  delete = async (id: string) => {
    await this.db.delete(Tables.Project, id);
  };

  /**
   * Read-modify-write in one transaction. A project that is no longer there is
   * left alone rather than recreated — the same way renaming a vanished label
   * is a no-op.
   */
  private write = async (
    id: string,
    change: (project: ProjectEntity) => ProjectEntity
  ) => {
    const transaction = this.db.transaction(Tables.Project, "readwrite");
    const stored = await transaction.store.get(id);

    if (stored !== undefined) await transaction.store.put(change(stored));

    await transaction.done;
  };

  /**
   * Case-insensitive: "garden" and "Garden" are the same project to a reader,
   * and offering both in one picker is a bug, not a feature.
   */
  findByName = async (name: string) => {
    const wanted = name.trim().toLocaleLowerCase();

    return (await this.db.getAll(Tables.Project)).find(
      (project) => project.name.toLocaleLowerCase() === wanted
    );
  };
}
