import { randomUUID } from "node:crypto";
import type { Audit } from "./types.js";
import type { AuditRepository } from "./repository.js";

function seedAudits(): Audit[] {
  const createdAt = new Date(Date.now() - 60_000).toISOString();
  return [
    {
      id: randomUUID(),
      candidate_label: "Sample candidate",
      target_role: "Frontend Engineer",
      alignment_verdict: "PARTIAL_FIT",
      summary: "Sample report: compare a CV with a target role to identify evidence and gaps.",
      matched_requirements: ["React experience"],
      transferable_skills: ["React", "TypeScript"],
      missing_requirements: ["Production cloud deployment experience"],
      suggested_bullets: ["Built accessible React interfaces using TypeScript."],
      analysis_mode: "fallback",
      redactions_applied: { emails: 0, phone_numbers: 0, addresses: 0, total: 0 },
      created_at: createdAt
    }
  ];
}

export class MemoryRepository implements AuditRepository {
  private readonly audits = new Map<string, Audit>();

  constructor(seed: Audit[] = seedAudits()) {
    for (const audit of seed) this.audits.set(audit.id, audit);
  }

  async listAudits(): Promise<Audit[]> {
    return [...this.audits.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getAudit(id: string): Promise<Audit | undefined> {
    return this.audits.get(id);
  }

  async createAudit(audit: Audit): Promise<void> {
    this.audits.set(audit.id, audit);
  }
}
