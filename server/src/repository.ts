import type { Audit } from "./types.js";

export interface AuditRepository {
  listAudits(): Promise<Audit[]>;
  getAudit(id: string): Promise<Audit | undefined>;
  createAudit(audit: Audit): Promise<void>;
}
