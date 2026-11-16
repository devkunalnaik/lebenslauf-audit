import { z } from "zod";

export const CreateAuditSchema = z.object({
  candidate_label: z.string().trim().min(1, "Candidate label is required").max(120),
  target_role: z.string().trim().min(1, "Target role is required").max(160),
  cv_text: z.string().trim().min(1, "CV text is required").max(50_000),
  job_description: z.string().trim().min(1, "Job description is required").max(30_000)
}).strict();

export const RedactionsAppliedSchema = z.object({
  emails: z.number().int().nonnegative(),
  phone_numbers: z.number().int().nonnegative(),
  addresses: z.number().int().nonnegative(),
  total: z.number().int().nonnegative()
}).strict();

export const AuditResultSchema = z.object({
  alignment_verdict: z.enum(["STRONG_FIT", "PARTIAL_FIT", "STRETCH_FIT"]),
  summary: z.string().min(1).max(1000),
  matched_requirements: z.array(z.string().min(1).max(240)).max(30),
  transferable_skills: z.array(z.string().min(1).max(160)).max(30),
  missing_requirements: z.array(z.string().min(1).max(240)).max(30),
  suggested_bullets: z.array(z.string().min(1).max(500)).max(8)
}).strict();

export const AuditSchema = AuditResultSchema.extend({
  id: z.string().uuid(),
  candidate_label: z.string().min(1),
  target_role: z.string().min(1),
  redactions_applied: RedactionsAppliedSchema,
  created_at: z.string().datetime(),
  analysis_mode: z.enum(["ai", "fallback"])
}).strict();

export type CreateAuditInput = z.infer<typeof CreateAuditSchema>;
