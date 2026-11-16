import { useCallback, useEffect, useState, type FormEvent } from "react";

type Verdict = "STRONG_FIT" | "PARTIAL_FIT" | "STRETCH_FIT";
interface Audit {
  id: string;
  candidate_label: string;
  target_role: string;
  alignment_verdict: Verdict;
  summary: string;
  matched_requirements: string[];
  transferable_skills: string[];
  missing_requirements: string[];
  suggested_bullets: string[];
  analysis_mode: "ai" | "fallback";
  redactions_applied: { emails: number; phone_numbers: number; addresses: number; total: number };
  created_at: string;
}

const SAMPLE_CV = `Jordan Lee
Frontend engineer with 5 years of experience building accessible web products.
Built React interfaces and delivered TypeScript components for a subscription platform.
Worked with designers and product managers in an agile team.
Improved page load time by 28% through code splitting and image optimization.
Tools: React, TypeScript, JavaScript, Git, and CSS.
Contact: jordan.lee@example.com | +1 415 555 0199
12 Market Street, 94105 San Francisco`;

const SAMPLE_JOB = `Frontend Engineer
Requirements:
- 3+ years building production React applications
- Strong TypeScript and JavaScript skills
- Experience collaborating in agile product teams
- Kubernetes operations experience`;

const emptyForm = {
  candidate_label: "",
  target_role: "",
  cv_text: "",
  job_description: ""
};

function ListSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="report-section">
      <h3>{title}</h3>
      {items.length ? (
        <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
      ) : <p className="muted">{empty}</p>}
    </section>
  );
}

export default function App() {
  const [form, setForm] = useState(emptyForm);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [current, setCurrent] = useState<Audit | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [requestError, setRequestError] = useState("");

  const loadAudits = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/audits");
      if (!response.ok) throw new Error("Could not load previous audits.");
      const body = await response.json() as { audits: Audit[] };
      setAudits(body.audits);
      setRequestError("");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not load previous audits.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { void loadAudits(); }, [loadAudits]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setValidationError("");
  }

  async function submitAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    setRequestError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const body = await response.json() as { audit?: Audit; error?: string; details?: Array<{ field: string; message: string }> };
      if (response.status === 400) {
        setValidationError(body.details?.map((detail) => detail.message).join(" ") ?? body.error ?? "Check the form fields.");
        return;
      }
      if (!response.ok || !body.audit) throw new Error(body.error ?? "Audit request failed. Please try again.");
      setCurrent(body.audit);
      setAudits((previous) => [body.audit!, ...previous]);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Audit request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function selectAudit(id: string) {
    setRequestError("");
    try {
      const response = await fetch(`/api/audits/${id}`);
      if (!response.ok) throw new Error("Could not load this audit.");
      const body = await response.json() as { audit: Audit };
      setCurrent(body.audit);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Could not load this audit.");
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Lebenslauf-Audit home"><span className="brand-mark">L</span> Lebenslauf<span className="brand-light">-Audit</span></a>
        <span className="privacy-note"><span className="privacy-dot" /> Privacy-first by design</span>
      </header>

      <section className="intro">
        <p className="eyebrow">CAREER CLARITY, WITHOUT THE GUESSWORK</p>
        <h1>Make your next move<br /><em>with the full picture.</em></h1>
        <p className="intro-copy">See how your experience maps to the role—and where your story could be stronger.</p>
      </section>

      <div className="workspace">
        <section className="form-card">
          <div className="card-heading">
            <div><p className="eyebrow">01 / YOUR MATERIALS</p><h2>Start an audit</h2></div>
            <button type="button" className="sample-button" onClick={() => setForm({
              candidate_label: "Jordan Lee",
              target_role: "Frontend Engineer",
              cv_text: SAMPLE_CV,
              job_description: SAMPLE_JOB
            })}>↗ Load sample</button>
          </div>
          <form onSubmit={submitAudit}>
            <div className="field-row">
              <label>Candidate label<input required maxLength={120} value={form.candidate_label} onChange={(event) => updateField("candidate_label", event.target.value)} placeholder="e.g. Jordan Lee" /></label>
              <label>Target role<input required maxLength={160} value={form.target_role} onChange={(event) => updateField("target_role", event.target.value)} placeholder="e.g. Product Designer" /></label>
            </div>
            <label>Job description<textarea required maxLength={30000} rows={7} value={form.job_description} onChange={(event) => updateField("job_description", event.target.value)} placeholder="Paste the role description and requirements..." /></label>
            <label className="cv-label">Your CV<textarea required maxLength={50000} rows={9} value={form.cv_text} onChange={(event) => updateField("cv_text", event.target.value)} placeholder="Paste your CV text here..." /></label>
            <div className="form-footer">
              <p>Your CV is scrubbed for contact details before analysis.</p>
              <button className="submit-button" type="submit" disabled={submitting}>{submitting ? "Auditing..." : "Run audit"} <span>→</span></button>
            </div>
            {validationError && <p className="inline-error" role="alert">{validationError}</p>}
          </form>
        </section>

        <aside className="history-card">
          <p className="eyebrow">02 / YOUR HISTORY</p>
          <h2>Past audits <span className="count">{audits.length}</span></h2>
          {loadingHistory ? <p className="muted history-state">Loading your audits...</p> :
            audits.length === 0 ? <p className="muted history-state">No audits yet. Your next step starts here.</p> :
              <ul className="history-list">{audits.map((audit) => (
                <li key={audit.id}>
                  <button type="button" onClick={() => void selectAudit(audit.id)} className={current?.id === audit.id ? "history-item active" : "history-item"}>
                    <span className="history-role">{audit.target_role}</span>
                    <span className="history-meta">{audit.candidate_label} · {new Date(audit.created_at).toLocaleDateString()}</span>
                  </button>
                </li>
              ))}</ul>}
        </aside>
      </div>

      {requestError && <p className="request-error" role="alert">{requestError}</p>}

      {current && <section className="report-card" aria-live="polite">
        <div className="report-top">
          <div><p className="eyebrow">AUDIT REPORT / {current.candidate_label}</p><h2>{current.target_role}</h2></div>
          <div className="report-badges">
            <span className={`verdict-badge ${current.alignment_verdict.toLowerCase()}`}>{current.alignment_verdict.replace("_", " ")}</span>
            <span className={`mode-badge ${current.analysis_mode}`}>{current.analysis_mode === "ai" ? "AI analysis" : "Fallback analysis"}</span>
          </div>
        </div>
        <p className="summary">{current.summary}</p>
        <div className="redaction-strip">
          <span className="shield">◇</span>
          <span><strong>{current.redactions_applied.total} personal detail{current.redactions_applied.total === 1 ? "" : "s"} removed</strong>
            <small>{current.redactions_applied.emails} email · {current.redactions_applied.phone_numbers} phone · {current.redactions_applied.addresses} address</small>
          </span>
        </div>
        <div className="report-grid">
          <ListSection title="Evidence match" items={current.matched_requirements} empty="No direct evidence matches identified." />
          <ListSection title="Transferable skills" items={current.transferable_skills} empty="No specific transferable skills identified." />
          <ListSection title="Gaps to address" items={current.missing_requirements} empty="No missing requirements identified." />
          <ListSection title="Grounded bullet ideas" items={current.suggested_bullets} empty="Add CV evidence matching a role requirement to see suggestions." />
        </div>
        <p className="disclaimer">This audit is a decision-support tool, not a hiring recommendation. Verify each suggestion against your experience.</p>
      </section>}

      <footer><span>LEBENSLAUF-AUDIT</span><span>Your documents stay yours.</span></footer>
    </main>
  );
}
