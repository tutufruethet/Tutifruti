import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project, ProjectSummary } from "@/lib/schema";
import { parseProject } from "@/lib/schema/migrate";
import { StorageError, summarize, type ProjectRepository } from "./repository";

interface SitePlanDB extends DBSchema {
  projects: { key: string; value: Project; indexes: { updatedAt: string } };
  summaries: { key: string; value: ProjectSummary };
}

const DB_NAME = "siteplan";
const DB_VERSION = 1;

/** Persistência local no navegador. Guarda o projeto inteiro e um resumo para a lista. */
export class IndexedDbRepository implements ProjectRepository {
  private db: Promise<IDBPDatabase<SitePlanDB>> | null = null;

  private open() {
    this.db ??= openDB<SitePlanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("projects", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        db.createObjectStore("summaries", { keyPath: "id" });
      },
    }).catch((e) => {
      this.db = null;
      throw new StorageError("Não foi possível abrir o armazenamento local do navegador.", e);
    });
    return this.db;
  }

  async list() {
    const db = await this.open();
    const all = await db.getAll("summaries");
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string) {
    const db = await this.open();
    const raw = await db.get("projects", id);
    if (!raw) return null;
    // Valida ao ler: dados antigos passam pelas migrações.
    const parsed = parseProject(raw);
    if (!parsed.ok) throw new StorageError(`${parsed.error} ${parsed.details.join("; ")}`);
    return parsed.project;
  }

  async save(project: Project) {
    const db = await this.open();
    try {
      const tx = db.transaction(["projects", "summaries"], "readwrite");
      await Promise.all([tx.objectStore("projects").put(project), tx.objectStore("summaries").put(summarize(project)), tx.done]);
    } catch (e) {
      const quota = e instanceof DOMException && e.name === "QuotaExceededError";
      throw new StorageError(quota ? "O armazenamento do navegador está cheio." : "Não foi possível salvar o projeto.", e);
    }
  }

  async remove(id: string) {
    const db = await this.open();
    const tx = db.transaction(["projects", "summaries"], "readwrite");
    await Promise.all([tx.objectStore("projects").delete(id), tx.objectStore("summaries").delete(id), tx.done]);
  }
}

let instance: ProjectRepository | null = null;

/** Ponto único de troca: para usar um backend, devolva aqui outra implementação de ProjectRepository. */
export function getRepository(): ProjectRepository {
  instance ??= new IndexedDbRepository();
  return instance;
}
