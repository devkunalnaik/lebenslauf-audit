import type { AuditAnalysis, AlignmentVerdict } from "./types.js";

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into",
  "is", "it", "of", "on", "or", "our", "the", "their", "to", "with", "you", "your",
  "we", "will", "within", "about", "across", "this", "that", "years", "year",
  "experience", "required", "preferred", "ability", "work", "working", "role",
  "candidate", "including", "such", "have", "has", "using", "used"
]);

const SKILL_TERMS = [
  "typescript", "javascript", "react", "node.js", "node", "python", "java", "sql",
  "postgresql", "postgres", "aws", "azure", "docker", "kubernetes", "excel",
  "project management", "data analysis", "machine learning", "communication",
  "leadership", "customer service", "agile", "git", "html", "css", "express"
];

function tokens(value: string): string[] {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}+#.]+/gu) ?? [])
    .map((token) => token.replace(/[.,]+$/g, ""))
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function requirementsFrom(jobDescription: string): string[] {
  const lines = jobDescription.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = lines.flatMap((line) => {
    const cleaned = line.replace(/^(?:[-*•]|\d+[.)])\s*/, "").trim();
    if (cleaned.length < 8) return [];
    if (/^(requirements?|qualifications?|what you(?:'|’)ll do|responsibilities|about us)\s*:?\s*$/i.test(cleaned)) return [];
    return [cleaned.replace(/[.;]+$/, "")];
  });
  const source = candidates.length > 1 ? candidates : jobDescription.split(/(?<=[.!?])\s+/);
  const unique = new Set<string>();
  for (const item of source) {
    const clean = item.trim().replace(/[.;]+$/, "");
    if (tokens(clean).length >= 1 && clean.length <= 240) unique.add(clean);
  }
  return [...unique].slice(0, 30);
}

function requirementMatches(requirement: string, cvTokens: Set<string>): boolean {
  const terms = tokens(requirement);
  if (terms.length === 0) return false;
  const found = terms.filter((term) => cvTokens.has(term)).length;
  return terms.length <= 2 ? found === terms.length : found / terms.length >= 0.6 && found >= 2;
}

function verdictFor(matchCount: number, requirementCount: number): AlignmentVerdict {
  if (requirementCount === 0 || matchCount / requirementCount >= 0.7) return "STRONG_FIT";
  if (matchCount / requirementCount >= 0.35) return "PARTIAL_FIT";
  return "STRETCH_FIT";
}

function groundedSuggestions(cvText: string, matches: string[]): string[] {
  if (matches.length === 0) return [];
  const cvSentences = cvText.split(/[\r\n]+|(?<=[.!?])\s+/)
    .map((line) => line.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ""))
    .filter((line) => line.length >= 20 && line.length <= 500);
  const ranked = cvSentences.map((sentence, index) => {
    const cvWords = new Set(tokens(sentence));
    const overlap = Math.max(...matches.map((requirement) => {
      const terms = tokens(requirement);
      return terms.filter((term) => cvWords.has(term)).length;
    }), 0);
    return { sentence, index, overlap };
  }).filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.index - b.index);
  return ranked.slice(0, 3).map((item) => item.sentence);
}

export function analyzeFallback(cvText: string, jobDescription: string): AuditAnalysis {
  const requirements = requirementsFrom(jobDescription);
  const cvTokenSet = new Set(tokens(cvText));
  const matchedRequirements = requirements.filter((requirement) => requirementMatches(requirement, cvTokenSet));
  const missingRequirements = requirements.filter((requirement) => !matchedRequirements.includes(requirement));
  const cvLower = cvText.toLocaleLowerCase();
  const transferableSkills = SKILL_TERMS.filter((skill) => {
    const inCv = new RegExp(`(^|[^\\p{L}\\p{N}])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "iu").test(cvLower);
    const inJob = new RegExp(`(^|[^\\p{L}\\p{N}])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`, "iu").test(jobDescription);
    return inCv && inJob;
  }).slice(0, 12);
  const verdict = verdictFor(matchedRequirements.length, requirements.length);
  const summary = requirements.length === 0
    ? "The job description did not contain enough distinct requirements for a reliable comparison."
    : `${matchedRequirements.length} of ${requirements.length} identified requirements have supporting keyword evidence in the CV. Treat this deterministic comparison as a starting point, not a hiring decision.`;

  return {
    alignment_verdict: verdict,
    summary,
    matched_requirements: matchedRequirements,
    transferable_skills: transferableSkills,
    missing_requirements: missingRequirements,
    suggested_bullets: groundedSuggestions(cvText, matchedRequirements),
    analysis_mode: "fallback"
  };
}
