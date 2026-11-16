CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY,
  candidate_label TEXT NOT NULL,
  target_role TEXT NOT NULL,
  report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audits_created_at_idx ON audits (created_at DESC);
