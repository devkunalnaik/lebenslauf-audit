import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { MemoryRepository } from "./memoryRepository.js";
import { redactPii } from "./redactor.js";
import { analyzeFallback } from "./fallbackAnalyzer.js";
import { createAiAuditor } from "./aiAuditor.js";

const repository = () => new MemoryRepository([]);

afterEach(() => vi.restoreAllMocks());

describe("audit API", () => {
  it("reports selected storage and creates a PII-redacted audit", async () => {
    const repo = repository();
    const app = createApp({ repository: repo, storage: "memory" });
    const response = await request(app).post("/api/audits").send({
      candidate_label: "Alex",
      target_role: "Frontend developer",
      cv_text: "React developer. Email alex@example.com, phone +1 415 555 0199.",
      job_description: "Required: React development experience."
    });

    expect(response.status).toBe(201);
    expect(response.body.audit.redactions_applied).toMatchObject({
      emails: 1, phone_numbers: 1, total: 2
    });
    expect(response.body.audit.analysis_mode).toBe("fallback");
    expect((await repo.listAudits())).toHaveLength(1);
    expect((await request(app).get("/health")).body).toEqual({ status: "ok", storage: "memory" });
  });

  it("validates fields and rejects unexpected payload keys", async () => {
    const app = createApp({ repository: repository(), storage: "memory" });
    const response = await request(app).post("/api/audits").send({
      candidate_label: " ",
      target_role: "Engineer",
      cv_text: "CV",
      job_description: "Role",
      extra: true
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
    expect(response.body.details.length).toBeGreaterThanOrEqual(2);
  });

  it("returns a saved audit or a 404 for an unknown id", async () => {
    const app = createApp({ repository: repository(), storage: "memory" });
    const created = await request(app).post("/api/audits").send({
      candidate_label: "Casey",
      target_role: "Analyst",
      cv_text: "SQL analyst with reporting experience.",
      job_description: "SQL reporting experience required."
    });
    const id = created.body.audit.id;
    expect((await request(app).get(`/api/audits/${id}`)).body.audit.id).toBe(id);
    expect((await request(app).get("/api/audits/not-found")).status).toBe(404);
  });
});

describe("privacy and analysis", () => {
  it("scrubs emails, phone numbers, street addresses, and postal-city patterns", () => {
    const result = redactPii("a@b.com +1 415 555 0199, 12 Main Street, 94105 San Francisco; Postal 10115 Berlin");
    expect(result.redactionsApplied).toEqual({
      emails: 1, phone_numbers: 1, addresses: 2, total: 4
    });
    expect(result.redactedText).not.toContain("a@b.com");
    expect(result.redactedText).not.toContain("Main Street");
    expect(result.redactedText).not.toContain("San Francisco");
    expect(result.redactedText).not.toContain("10115 Berlin");
  });

  it("keeps unsupported requirements missing and suggestions grounded in CV text", () => {
    const result = analyzeFallback(
      "Built React interfaces and delivered TypeScript components.",
      "- React experience\n- Kubernetes operations experience"
    );
    expect(result.matched_requirements).toContain("React experience");
    expect(result.missing_requirements).toContain("Kubernetes operations experience");
    expect(result.suggested_bullets).toContain("Built React interfaces and delivered TypeScript components.");
    expect(result.analysis_mode).toBe("fallback");
  });

  it("falls back when AI output is malformed", async () => {
    const auditor = createAiAuditor({
      apiKey: "test-key",
      fetcher: vi.fn(async () => new Response(JSON.stringify({
        choices: [{ message: { content: "not json" } }]
      }), { status: 200 }))
    });
    const result = await auditor(redactPii("React developer"), "React required");
    expect(result.analysis_mode).toBe("fallback");
  });
});
