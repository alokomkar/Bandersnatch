import { writeFile } from "node:fs/promises";

const escape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export async function writeReport({ path, transcription, review, plan, android, web, comparison }) {
  const rows = comparison.rows ?? plan.steps.map((step, index) => ({
    intent: step.intent,
    android: android.steps?.[index],
    web: web.steps?.[index],
    consistent: false,
  }));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Bandersnatch M1 Report</title>
<style>
body{font:15px system-ui;margin:0;background:#f3f1ea;color:#18201c}main{max-width:1000px;margin:40px auto;padding:0 22px}
.card{background:#fffdf7;border:1px solid #d8d6ce;border-radius:18px;padding:22px;margin:16px 0}
.meta{font:12px monospace;color:#68716c}.mock{color:#9a6200}.live{color:#1f684c}h1{font-size:42px;letter-spacing:-.05em}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd;font-size:13px}
.yes{color:#1f684c;font-weight:700}.no{color:#b94235;font-weight:700}
</style></head><body><main>
<div class="meta">BANDERSNATCH · M1 GOLDEN PATH · ${escape(new Date().toISOString())}</div>
<h1>${escape(comparison.verdict.toUpperCase())}</h1>
<p>${escape(comparison.reason)}</p>
<section class="card"><b>Evidence status</b>
<p class="${transcription.evidenceMode}">Voice: ${escape(transcription.evidenceMode)} · Android: ${escape(android.evidenceMode)} · Web: ${escape(web.evidenceMode)}</p>
${transcription.evidenceMode === "mock" ? "<p><b>Not acceptance-tested:</b> this run uses labeled mock adapters and must not be presented as live proof.</p>" : ""}
</section>
<section class="card"><b>Original transcript</b><p>${escape(review?.originalTranscript ?? transcription.transcript)}</p>
${review?.correctionApplied ? `<b>Approved correction</b><p>${escape(review.reviewedTranscript)}</p>` : ""}
<div class="meta">${escape(transcription.model)} · ${escape(transcription.mode)} · detected ${escape(transcription.languageCode)}${transcription.languageProbability == null ? "" : ` · confidence ${escape(Math.round(transcription.languageProbability * 100))}%`}</div></section>
<section class="card"><table><thead><tr><th>Intent</th><th>Android</th><th>Web</th><th>Consistency</th></tr></thead><tbody>
${rows.map((row) => `<tr><td>${escape(row.intent)}</td><td>${escape(row.android?.observedOutcome ?? "missing")}</td><td>${escape(row.web?.observedOutcome ?? "missing")}</td><td class="${row.consistent ? "yes" : "no"}">${row.consistent ? "Consistent" : "Divergent"}</td></tr>`).join("")}
</tbody></table></section>
<section class="card"><b>First divergence</b><p>${escape(comparison.firstDivergence ?? "None")}</p>
<div class="meta">Measured outcomes determine the verdict. Any cause explanation remains advisory.</div></section>
</main></body></html>`;
  await writeFile(path, html);
  return path;
}
