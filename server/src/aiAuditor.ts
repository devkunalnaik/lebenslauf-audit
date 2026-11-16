import { AuditResultSchema } from "./validation.js";
import { analyzeFallback } from "./fallbackAnalyzer.js";
import type { AuditAnalysis, RedactedText } from "./types.js";

interface AiAuditorOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  fetcher?: typeof fetch;
}

const SYSTEM_PROMPT = `You are a careful CV-to-job-description alignment auditor.
Use only the supplied redacted CV and job description as evidence. Never invent or infer skills, tools, years of experience, degrees, certifications, achievements, or language levels.
List job requirements that are not supported by the CV in missing_requirements. Keep matched_requirements evidence-based. Transferable skills must be explicitly supported by the CV. Suggested bullets must be faithful rewrites of CV evidence and must not add facts.
Return only a JSON object with exactly these keys: alignment_verdict (STRONG_FIT, PARTIAL_FIT, or STRETCH_FIT), summary, matched_requirements (string array), transferable_skills (string array), missing_requirements (string array), suggested_bullets (string array).`;

function includesUnsupportedNumbers(output: unknown, evidence: string): boolean {
  const evidenceNumbers = new Set(evidence.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? []);
  const serialized = JSON.stringify(output);
  const claims = serialized.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? [];
  return claims.some((claim) => !evidenceNumbers.has(claim));
}

export function createAiAuditor(options: AiAuditorOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  return async (redacted: RedactedText, jobDescription: string): Promise<AuditAnalysis> => {
    if (!options.apiKey) return analyzeFallback(redacted.redactedText, jobDescription);
    try {
      const response = await fetcher(options.endpoint ?? "https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: options.model ?? "gpt-4o-mini",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify({ redacted_cv: redacted.redactedText, job_description: jobDescription }) }
          ]
        }),
        signal: AbortSignal.timeout(20_000)
      });
      if (!response.ok) return analyzeFallback(redacted.redactedText, jobDescription);
      const payload: unknown = await response.json();
      const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })
        .choices?.[0]?.message?.content;
      if (typeof content !== "string") return analyzeFallback(redacted.redactedText, jobDescription);
      const parsed = AuditResultSchema.safeParse(JSON.parse(content));
      if (!parsed.success || includesUnsupportedNumbers(parsed.data, `${redacted.redactedText}\n${jobDescription}`)) {
        return analyzeFallback(redacted.redactedText, jobDescription);
      }
      return { ...parsed.data, analysis_mode: "ai" };
    } catch {
      return analyzeFallback(redacted.redactedText, jobDescription);
    }
  };
}

export const aiAuditor = createAiAuditor({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.AI_MODEL
});
