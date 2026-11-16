import express, { type ErrorRequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import type { Audit, HealthResult, RedactedText } from "./types.js";
import type { AuditRepository } from "./repository.js";
import { CreateAuditSchema } from "./validation.js";
import { redactPii } from "./redactor.js";
import { aiAuditor } from "./aiAuditor.js";

interface AppOptions {
  repository: AuditRepository;
  storage: HealthResult["storage"];
  analyze?: (redacted: RedactedText, jobDescription: string) => Promise<ReturnType<typeof aiAuditor> extends Promise<infer T> ? T : never>;
}

export function createApp({ repository, storage, analyze = aiAuditor }: AppOptions) {
  const app = express();
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", storage } satisfies HealthResult);
  });

  app.post("/api/audits", async (request, response, next) => {
    try {
      const input = CreateAuditSchema.parse(request.body);
      const redacted = redactPii(input.cv_text);
      const analysis = await analyze(redacted, input.job_description);
      const audit: Audit = {
        id: randomUUID(),
        candidate_label: input.candidate_label,
        target_role: input.target_role,
        ...analysis,
        redactions_applied: redacted.redactionsApplied,
        created_at: new Date().toISOString()
      };
      await repository.createAudit(audit);
      response.status(201).json({ audit });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/audits", async (_request, response, next) => {
    try {
      response.json({ audits: await repository.listAudits() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/audits/:id", async (request, response, next) => {
    try {
      const audit = await repository.getAudit(request.params.id);
      if (!audit) {
        response.status(404).json({ error: "Audit not found" });
        return;
      }
      response.json({ audit });
    } catch (error) {
      next(error);
    }
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "Validation failed",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }
    if (error instanceof SyntaxError && "body" in error) {
      response.status(400).json({ error: "Malformed JSON request body" });
      return;
    }
    console.error("Request failed", error);
    response.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);
  return app;
}
