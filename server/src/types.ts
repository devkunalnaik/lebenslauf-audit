export type AlignmentVerdict = "STRONG_FIT" | "PARTIAL_FIT" | "STRETCH_FIT";
export type AnalysisMode = "ai" | "fallback";

export interface RedactionsApplied {
  emails: number;
  phone_numbers: number;
  addresses: number;
  total: number;
}

export interface RedactedText {
  redactedText: string;
  redactionsApplied: RedactionsApplied;
}

export interface AuditInput {
  candidate_label: string;
  target_role: string;
  cv_text: string;
  job_description: string;
}

export interface AuditAnalysis {
  alignment_verdict: AlignmentVerdict;
  summary: string;
  matched_requirements: string[];
  transferable_skills: string[];
  missing_requirements: string[];
  suggested_bullets: string[];
  analysis_mode: AnalysisMode;
}

export interface Audit extends AuditAnalysis {
  id: string;
  candidate_label: string;
  target_role: string;
  redactions_applied: RedactionsApplied;
  created_at: string;
}

export interface AuditResult {
  audit: Audit;
}

export interface AuditListResult {
  audits: Audit[];
}

export interface HealthResult {
  status: "ok";
  storage: "memory" | "postgres";
}
