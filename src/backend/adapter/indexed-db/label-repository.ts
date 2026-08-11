import { Tables, type AppIDB } from "@/backend/adapter/indexed-db/indexed-db";
import type { LabelEntity, LabelRepository } from "@/backend/label-service";

export class LabelRepositoryIndexedDB implements LabelRepository {
  private db: AppIDB;

  constructor(db: AppIDB) {
    this.db = db;
  }

  listAll = async () => {
    const labels = await this.db.getAll(Tables.Label);

    // Alphabetical, so a picker does not reorder itself as labels are added —
    // insertion order would move a name the moment another arrives.
    return labels.sort((a, b) => a.name.localeCompare(b.name));
  };

  create = async (label: LabelEntity) => {
    await this.db.add(Tables.Label, label);
  };

  rename = async ({ id, name }: { id: string; name: string }) => {
    const label = await this.db.get(Tables.Label, id);
    // Gone between the read and the write: nothing to rename, and putting it
    // back would resurrect a label the user deleted.
    if (label === undefined) return;

    await this.db.put(Tables.Label, { ...label, name });
  };

  delete = async (id: string) => {
    await this.db.delete(Tables.Label, id);
  };

  /**
   * Case-insensitive: "bug" and "Bug" are the same label to a reader, and
   * offering both in one picker is a bug, not a feature.
   */
  findByName = async (name: string) => {
    const wanted = name.trim().toLocaleLowerCase();

    return (await this.db.getAll(Tables.Label)).find(
      (label) => label.name.toLocaleLowerCase() === wanted
    );
  };
}
