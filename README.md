# Lebenslauf-Audit

A runnable, privacy-first MVP for comparing a CV with a job description. It provides a deterministic local analyzer by default, with an optional OpenAI-compatible analysis endpoint, plus PostgreSQL persistence when configured.

## Requirements

- Node.js 20+
- npm
- Optional PostgreSQL database for persistent storage
- Optional OpenAI API key for LLM-assisted analysis

## Quick start

```sh
npm install
npm run dev
```

Open the Vite URL printed by the client (normally `http://localhost:5173`). The API listens on port 4000. The browser development server proxies `/api` and `/health` to it. Without `DATABASE_URL`, the server starts with a seeded in-memory repository.

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`) and set `DATABASE_URL` to enable PostgreSQL. Run migrations and seed the example audit before starting the server:

```sh
npm run db:migrate
npm run db:seed
```

Set `OPENAI_API_KEY` to enable AI analysis. `AI_MODEL` is optional and defaults to `gpt-4o-mini`; `PORT` defaults to `4000`. AI requests use the OpenAI Chat Completions JSON response interface. Network errors, malformed output, or schema-invalid output fall back to the deterministic analyzer.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Express API and Vite frontend together |
| `npm test` | Run Vitest and Supertest API/privacy/analyzer tests |
| `npm run build` | Type-check/build the server and bundle the client |
| `npm run db:migrate` | Create the PostgreSQL audit table and index |
| `npm run db:seed` | Add one idempotent sample audit |

## API

- `GET /health` → `{ "status": "ok", "storage": "memory" | "postgres" }`
- `POST /api/audits` with `candidate_label`, `target_role`, `cv_text`, and `job_description` → `201 { "audit": ... }`
- `GET /api/audits` → `{ "audits": [...] }`, newest first
- `GET /api/audits/:id` → `{ "audit": ... }` or `404`

The report includes a `STRONG_FIT`, `PARTIAL_FIT`, or `STRETCH_FIT` verdict; evidence matches; transferable skills; missing requirements; grounded bullet suggestions; analysis mode; and redaction counts.

## Privacy, safety, and trade-offs

- The CV is scrubbed for email addresses, phone numbers, street addresses, and common postal-code-plus-city patterns before analysis.
- Raw CV and job-description text are **not persisted**. PostgreSQL stores the candidate/role labels, redaction counts, and resulting audit report. Candidate labels may still be identifying; use a pseudonym where possible.
- Without an AI key, the keyword matcher is deterministic and auditable, but is not semantic and can miss paraphrases or misread requirement boundaries.
- AI mode sends only the redacted CV and job description to the configured provider. Use it only if that provider and your organization's data policies permit it. The LLM is instructed not to invent facts; output is schema-validated and unsupported numeric claims are rejected, but automated analysis cannot guarantee perfect factuality.
- Suggestions reuse CV statements rather than inventing accomplishments. Always verify report details before using them in an application.
- This is a decision-support tool, not a hiring recommendation, legal assessment, or substitute for human review.
