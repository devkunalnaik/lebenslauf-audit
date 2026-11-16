# Lebenslauf-Audit

Lebenslauf-Audit is a privacy-first MVP for comparing a candidate's CV with a target job description. It produces an evidence-oriented alignment report, calls out requirements with no CV support, and offers grounded rewrites of relevant CV statements.

The app runs locally with a deterministic analyzer and seeded in-memory storage by default. PostgreSQL persistence and OpenAI Chat Completions analysis are optional.

## What it does

- Accepts a candidate label, target role, CV text, and job description.
- Redacts common email, phone, street-address, and postal-code/city patterns from CV text before analysis.
- Compares job requirements with CV evidence, identifies gaps and overlapping transferable skills, and suggests bullet rewrites grounded in CV text.
- Saves the generated report and shows recent audits in the browser.
- Uses local memory by default, PostgreSQL when configured, and the deterministic analyzer when AI is not configured or its response is unavailable or invalid.

This is a career decision-support tool, not a hiring recommendation, legal assessment, or substitute for human review.

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6 |
| API | Node.js, Express 4, TypeScript |
| Request and response validation | Zod 3 |
| Persistent storage | PostgreSQL, accessed using `pg` |
| Local storage | Seeded in-memory repository implementing the same repository interface |
| Tests | Vitest 2 and Supertest |
| AI integration | OpenAI Chat Completions JSON response format (optional) |

The root `package.json` defines npm workspaces for `client` and `server`. `tsx` runs the TypeScript API directly during development and database tasks; TypeScript compiles the server for builds.

## Requirements

- Node.js 20 or newer
- npm
- Optional: PostgreSQL database
- Optional: OpenAI API key

## Quick start

From the repository root:

```sh
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Express API listens on port 4000; Vite proxies `/api` and `/health` to it. With no `DATABASE_URL` or `OPENAI_API_KEY`, the app starts in seeded memory mode and uses the fallback analyzer.

To try the form immediately, choose **Load sample** in the UI.

### Environment variables

`.env.example` lists the supported variables:

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `4000` | Express API port |
| `DATABASE_URL` | No | unset | PostgreSQL connection string. When set, the API checks the connection at startup and uses PostgreSQL. |
| `OPENAI_API_KEY` | No | unset | Enables OpenAI Chat Completions analysis. Keep this secret on the server. |
| `AI_MODEL` | No | `gpt-4o-mini` | Model name sent to the OpenAI Chat Completions API. |

The server loads dotenv files relative to the server workspace. To use the root example file, copy it to `server/.env`:

```sh
# macOS / Linux
cp .env.example server/.env

# PowerShell
Copy-Item .env.example server/.env
```

Set `DATABASE_URL` in `server/.env` to enable PostgreSQL. Run the migration and optional sample seed before starting the API:

```sh
npm run db:migrate
npm run db:seed
```

Without a `.env` file, you can also provide environment variables directly in your shell. The API can use `DATABASE_URL` without `OPENAI_API_KEY`, or use AI analysis with in-memory storage if only `OPENAI_API_KEY` is set.

When AI is enabled, the server sends the redacted CV and job description to the OpenAI API using the Chat Completions JSON response format. Provider errors, timeouts, malformed JSON, schema-invalid results, and rejected unsupported numeric claims fall back to local analysis.

## Commands

Run commands from the repository root:

| Command | Purpose |
| --- | --- |
| `npm install` | Install root and workspace dependencies |
| `npm run dev` | Run the Express API and Vite frontend together |
| `npm test` | Run Vitest and Supertest tests |
| `npm run build` | Type-check and compile the server, type-check the client, and build the Vite bundle |
| `npm run db:migrate` | Create the PostgreSQL `audits` table and index |
| `npm run db:seed` | Insert the idempotent PostgreSQL sample audit |

The build outputs the server to `server/dist` and the client bundle to `client/dist`. This MVP does not include a production web-server or static-file hosting configuration; deploy the API and frontend bundle using your chosen hosting setup.

## Project layout

```text
.
├── client/
│   ├── index.html
│   ├── vite.config.ts             # React plugin and API/health dev proxies
│   └── src/
│       ├── App.tsx                # Audit form, history, and report UI
│       ├── main.tsx               # React entry point
│       └── styles.css
├── server/
│   └── src/
│       ├── app.ts                 # Express routes and centralized errors
│       ├── index.ts               # Startup, DB check, and repository selection
│       ├── types.ts               # Domain and API types
│       ├── validation.ts          # Zod request and report schemas
│       ├── redactor.ts            # Deterministic CV PII scrubber
│       ├── fallbackAnalyzer.ts    # Local requirement matcher and suggestions
│       ├── aiAuditor.ts           # Optional LLM analysis and fallback handling
│       ├── repository.ts          # Shared persistence interface
│       ├── memoryRepository.ts    # Seeded in-memory implementation
│       ├── postgresRepository.ts  # PostgreSQL implementation
│       ├── app.test.ts            # API, redaction, validation, analyzer tests
│       └── db/
│           ├── schema.sql
│           ├── seed.sql
│           ├── migrate.ts
│           └── seed.ts
├── scripts/
│   └── dev.mjs                   # Starts API and frontend together
├── .env.example
├── package.json
└── README.md
```

## Application architecture

1. The React client submits JSON to `POST /api/audits`.
2. Express validates the payload with Zod and enforces a 100 KB JSON body limit.
3. The server redacts candidate CV contact details and passes only the redacted CV plus the job description to the configured analyzer.
4. The analyzer returns the common audit report shape. AI output is checked against `AuditResultSchema`; unavailable or invalid output uses the deterministic analyzer.
5. The selected repository stores the audit. Raw CV and job-description text are not included in the persisted record.
6. The client renders the report and refreshes the recent-audits list.

`AuditRepository` is shared by the memory and PostgreSQL implementations. The API routes do not need to know which storage backend is active.

## API

### `GET /health`

Returns the server status and selected storage mode:

```json
{
  "status": "ok",
  "storage": "memory"
}
```

`storage` is either `memory` or `postgres`. If PostgreSQL is configured but unreachable, startup fails its connection check rather than silently switching to memory.

### `POST /api/audits`

Request body:

```json
{
  "candidate_label": "Jordan Lee",
  "target_role": "Frontend Engineer",
  "cv_text": "Frontend engineer with React and TypeScript experience.",
  "job_description": "Requirements:\n- React experience\n- TypeScript"
}
```

All four fields are required non-empty strings after trimming. Limits are 120 characters for `candidate_label`, 160 for `target_role`, 50,000 for `cv_text`, and 30,000 for `job_description`. Unknown request fields are rejected. Successful requests return `201 Created` with `{ "audit": ... }`.

The audit includes:

- `id`, `candidate_label`, `target_role`, and ISO `created_at`
- `alignment_verdict`: `STRONG_FIT`, `PARTIAL_FIT`, or `STRETCH_FIT`
- `summary`
- `matched_requirements`
- `transferable_skills`
- `missing_requirements`
- `suggested_bullets`
- `analysis_mode`: `ai` or `fallback`
- `redactions_applied`: counts for `emails`, `phone_numbers`, `addresses`, and `total`

Validation errors return `400` with an `error` and a `details` array containing field paths and messages. Malformed JSON also returns `400`.

### `GET /api/audits`

Returns `{ "audits": [...] }`, sorted newest first.

### `GET /api/audits/:id`

Returns `{ "audit": ... }`, or `404` with `{ "error": "Audit not found" }`.

## Analysis behavior

### Deterministic fallback

The fallback analyzer extracts short requirements from job-description lines or sentences, tokenizes the text, and compares requirement terms to CV terms. Short requirements must match all relevant terms; longer requirements use a token-overlap threshold. A local list of known skills is used to report skills that appear in both texts.

The verdict is heuristic: at least 70% matched requirements is `STRONG_FIT`; at least 35% is `PARTIAL_FIT`; otherwise it is `STRETCH_FIT`. If no requirements are extracted, the implementation returns `STRONG_FIT` but its summary warns that there was not enough information for a reliable comparison. The fallback is deterministic, not semantic: paraphrases, unusual formatting, and requirement boundaries can be misclassified.

Suggested bullets are selected from CV statements with term overlap to matched requirements. The fallback does not write new accomplishments or add unsupported measurements.

### Optional AI

When `OPENAI_API_KEY` is set, the analyzer uses a system prompt that prohibits inventing skills, experience, degrees, achievements, or language levels and asks it to put unsupported requirements under `missing_requirements`. The result must satisfy the strict Zod report schema; numeric claims not found in the supplied evidence are rejected. Any failure to use or validate the AI response invokes the fallback analyzer.

These are guardrails, not a guarantee of factual correctness. AI output may still misinterpret non-numeric claims and must be reviewed by a person.

## Storage behavior

### Memory mode

When `DATABASE_URL` is unset, the server uses `MemoryRepository`. It starts with a sample audit and keeps new reports only for the lifetime of the process. Restarting the server clears newly created audits and restores the sample.

### PostgreSQL mode

When `DATABASE_URL` is set, the server checks the connection at startup and uses `PostgresRepository`. `db/schema.sql` creates the `audits` table with a JSONB report and a descending `created_at` index. The sample seed uses a stable ID and can be run repeatedly.

The database stores candidate and role labels, the generated report, and redaction counts. It does **not** store the raw CV or job description.

## Privacy and security considerations

- Redaction is performed before the analyzer is called. It uses deterministic patterns for email addresses, phone-like numbers, street addresses, and common postal-code-plus-city patterns.
- Redaction is heuristic and can miss or over-redact data. Review the redacted text flow and do not treat it as a complete anonymization guarantee.
- Only the CV text is scrubbed. The job description is passed unchanged to the analyzer; check it for personal or confidential data before enabling AI mode.
- In AI mode, the redacted CV and job description are sent to OpenAI. Use this only when the provider and your organization's data policies permit it. The API key remains server-side.
- `candidate_label` and `target_role` are persisted with audit reports and may be identifying. Use pseudonymous labels where appropriate.
- The MVP has no authentication, authorization, tenant separation, rate limiting, or production hosting configuration. Do not expose a shared deployment containing personal reports without adding those controls.
- The tool is not a hiring decision, legal assessment, or substitute for an informed human review.

## Tests

The Vitest/Supertest suite covers successful audit creation, selected storage health response, retrieval and 404 behavior, required-field and strict-payload validation, PII redaction counts, fallback requirement matching and grounded suggestions, and fallback when AI output is malformed.

```sh
npm test
npm run build
```
