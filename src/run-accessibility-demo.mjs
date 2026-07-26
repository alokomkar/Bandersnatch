import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runAndroidAccessibilityCheck } from "./adapters/android-accessibility.mjs";
import { runWebAccessibilityCheck } from "./adapters/playwright-accessibility.mjs";
import { synthesizeHindiVerdict } from "./adapters/bulbul.mjs";
import { loadLocalEnv } from "./env.mjs";
import { joinAccessibilityEvidence, writeJoinedAccessibilityReport } from "./accessibility/joined-report.mjs";

await loadLocalEnv();
const serial = process.env.ANDROID_SERIAL;
if (!serial) throw new Error("ANDROID_SERIAL is required.");
const runId = new Date().toISOString().replaceAll(/[:.]/g, "-");
const root = resolve("artifacts", "accessibility-demo", runId);
await mkdir(root, { recursive: true });
const android = await runAndroidAccessibilityCheck({
  outputDir: resolve(root, "android"),
  serial,
  adbPath: process.env.ADB_PATH ?? "adb",
});
const cases = [];
for (const mode of ["success", "mismatch", "missing"]) {
  const caseDir = resolve(root, mode);
  await mkdir(caseDir, { recursive: true });
  const web = await runWebAccessibilityCheck({ outputDir: resolve(caseDir, "web"), mode });
  const joined = joinAccessibilityEvidence(android, web);
  let audioPath = null;
  try {
    const speech = await synthesizeHindiVerdict({ text: joined.hindiVerdict });
    audioPath = resolve(caseDir, "hindi-verdict.wav");
    await writeFile(audioPath, Buffer.from(speech.audioBase64, "base64"));
  } catch (error) {
    joined.audioFallbackReason = error.message;
  }
  const reportPath = resolve(caseDir, "report.html");
  await writeJoinedAccessibilityReport({ path: reportPath, joined, android, web, audioPath });
  await writeFile(resolve(caseDir, "joined-evidence.json"), `${JSON.stringify(joined, null, 2)}\n`);
  cases.push({ mode, verdict: joined.verdict, completion: joined.completion, reportPath, audioPath });
}
const indexPath = resolve(root, "index.html");
await writeFile(indexPath, `<!doctype html><meta charset="utf-8"><title>Bandersnatch accessibility cases</title><h1>Bandersnatch accessibility cases</h1><ol>${cases.map(item => `<li><a href="${item.mode}/report.html">${item.mode}: ${item.verdict}</a></li>`).join("")}</ol>`);
console.log(JSON.stringify({ runId, root, indexPath, cases }, null, 2));
