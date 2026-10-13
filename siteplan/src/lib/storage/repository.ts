import type { Project, ProjectSummary } from "@/lib/schema";
import { segmentLabel } from "@/lib/schema/segments";

/**
 * Contrato de persistência. A interface é assíncrona para que o armazenamento local
 * possa ser trocado por uma API remota sem mudar a interface do usuário.
 */
export interface ProjectRepository {
  list(): Promise<ProjectSummary[]>;
  get(id: string): Promise<Project | null>;
  save(project: Project): Promise<void>;
  remove(id: string): Promise<void>;
}

export function summarize(p: Project): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    segment: segmentLabel(p.briefing.business.segment, p.briefing.business.segmentOther),
    pageCount: p.plan?.pages.length ?? 0,
  };
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
