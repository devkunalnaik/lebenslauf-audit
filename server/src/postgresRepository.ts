import type { Pool } from "pg";
import type { Audit } from "./types.js";
import type { AuditRepository } from "./repository.js";

interface AuditRow {
  id: string;
  candidate_label: string;
  target_role: string;
  report: Omit<Audit, "id" | "candidate_label" | "target_role" | "created_at">;
  created_at: Date | string;
}

function fromRow(row: AuditRow): Audit {
  return {
    id: row.id,
    candidate_label: row.candidate_label,
    target_role: row.target_role,
    ...row.report,
    created_at: new Date(row.created_at).toISOString()
  };
}

export class PostgresRepository implements AuditRepository {
  constructor(private readonly pool: Pool) {}

  async listAudits(): Promise<Audit[]> {
    const result = await this.pool.query<AuditRow>(
      "SELECT id, candidate_label, target_role, report, created_at FROM audits ORDER BY created_at DESC"
    );
    return result.rows.map(fromRow);
  }

  async getAudit(id: string): Promise<Audit | undefined> {
    const result = await this.pool.query<AuditRow>(
      "SELECT id, candidate_label, target_role, report, created_at FROM audits WHERE id = $1",
      [id]
    );
    return result.rows[0] ? fromRow(result.rows[0]) : undefined;
  }

  async createAudit(audit: Audit): Promise<void> {
    const { id, candidate_label, target_role, created_at, ...report } = audit;
    await this.pool.query(
      "INSERT INTO audits (id, candidate_label, target_role, report, created_at) VALUES ($1, $2, $3, $4, $5)",
      [id, candidate_label, target_role, JSON.stringify(report), created_at]
    );
  }
}
