import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { approvePlan, compileTranscript, validatePlan } from "../src/contracts.mjs";
import { comparePlatformResults } from "../src/comparator.mjs";
import { createPlatformRunners } from "../src/adapters/platforms.mjs";
import { runWebPlanWithPlaywright } from "../src/adapters/playwright-web.mjs";

const transcript = "Open the cart, enter coupon SAVE10, apply the coupon, and verify that the discounted total is visible.";
const plan = validatePlan(approvePlan(compileTranscript(transcript).plan));

async function withOutputDir(callback) {
  const outputDir = await mkdtemp(join(tmpdir(), "bandersnatch-web-"));
  try {
    await callback(outputDir);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

test("real Web evidence covers consistent, mismatched, and missing outcomes", async () => {
  await withOutputDir(async outputDir => {
    const android = await createPlatformRunners({ outputDir, seedWebMismatch: false }).android(plan);

    const success = await runWebPlanWithPlaywright(plan, { outputDir, mode: "success" });
    assert.equal(success.evidenceMode, "live");
    assert.equal(success.steps.length, 4);
    assert.equal(success.steps[3].observedOutcome, "discounted_total_1799_visible");
    assert.equal(comparePlatformResults(android, success).verdict, "consistent");

    const mismatch = await runWebPlanWithPlaywright(plan, { outputDir, mode: "mismatch" });
    const mismatchComparison = comparePlatformResults(android, mismatch);
    assert.equal(mismatchComparison.verdict, "inconsistent");
    assert.equal(mismatchComparison.firstDivergence, "assert_discount_visible");

    const missing = await runWebPlanWithPlaywright(plan, { outputDir, mode: "missing" });
    assert.equal(missing.steps[3].observedOutcome, null);
    assert.equal(comparePlatformResults(android, missing).verdict, "incomparable");
  });
});
