INSERT INTO audits (
  id, candidate_label, target_role, report, created_at
)
SELECT
  '00000000-0000-4000-8000-000000000001',
  'Sample candidate',
  'Frontend Engineer',
  '{
    "alignment_verdict": "PARTIAL_FIT",
    "summary": "Sample report: compare a CV with a target role to identify evidence and gaps.",
    "matched_requirements": ["React experience"],
    "transferable_skills": ["React", "TypeScript"],
    "missing_requirements": ["Production cloud deployment experience"],
    "suggested_bullets": ["Built accessible React interfaces using TypeScript."],
    "analysis_mode": "fallback",
    "redactions_applied": {"emails": 0, "phone_numbers": 0, "addresses": 0, "total": 0}
  }'::jsonb,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM audits WHERE id = '00000000-0000-4000-8000-000000000001'
);
