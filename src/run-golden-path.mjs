import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { compileTranscript, approvePlan, validatePlan } from "./contracts.mjs";
import { comparePlatformResults } from "./comparator.mjs";
import { mockSarvamTranscript, transcribeWithSarvam } from "./adapters/sarvam.mjs";
import { createPlatformRunners } from "./adapters/platforms.mjs";
import { writeReport } from "./report.mjs";

const args = new Set(process.argv.slice(2));
const live = args.has("--live");
const audioArgIndex = process.argv.indexOf("--audio");
const audioPath = audioArgIndex >= 0 ? process.argv[audioArgIndex + 1] : null;
if (live && !audioPath) throw new Error("Live mode requires --audio <path>.");

const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
const outputDir = resolve("artifacts", runId);
await mkdir(outputDir, { recursive: true });

const transcription = live
  ? await transcribeWithSarvam({ audioPath: resolve(audioPath) })
  : mockSarvamTranscript();
const compilation = compileTranscript(transcription.transcript);
if (!compilation.ok) throw new Error(compilation.errors.join(" "));
const plan = validatePlan(approvePlan(compilation.plan));
await writeFile(resolve(outputDir, "approved-plan.json"), JSON.stringify(plan, null, 2));

const runners = createPlatformRunners({ outputDir, seedWebMismatch: true });
const [android, web] = await Promise.all([runners.android(plan), runners.web(plan)]);
await writeFile(resolve(outputDir, "android-result.json"), JSON.stringify(android, null, 2));
await writeFile(resolve(outputDir, "web-result.json"), JSON.stringify(web, null, 2));

const comparison = comparePlatformResults(android, web);
await writeFile(resolve(outputDir, "comparison.json"), JSON.stringify(comparison, null, 2));
const reportPath = await writeReport({
  path: resolve(outputDir, "report.html"),
  transcription, plan, android, web, comparison,
});

console.log(JSON.stringify({
  runId,
  evidenceMode: live ? "mixed-live-voice-mock-runners" : "mock",
  verdict: comparison.verdict,
  firstDivergence: comparison.firstDivergence,
  reportPath,
}, null, 2));
