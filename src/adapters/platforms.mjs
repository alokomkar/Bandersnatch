import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const outcomes = {
  open_cart: "cart_visible",
  enter_coupon: "coupon_SAVE10_entered",
  apply_coupon: "coupon_accepted",
  assert_discount_visible: "discounted_total_1799_visible",
};

async function writeEvidence(outputDir, platform, step, index) {
  const path = join(outputDir, `${platform}-${index + 1}-${step.intent}.txt`);
  await writeFile(path, `${platform.toUpperCase()} evidence\nintent=${step.intent}\noutcome=${step.observedOutcome}\nmode=mock\n`);
  return path;
}

async function mockRun(platform, plan, outputDir, { seedWebMismatch = true } = {}) {
  await mkdir(outputDir, { recursive: true });
  const steps = [];
  for (const [index, planStep] of plan.steps.entries()) {
    let observedOutcome = outcomes[planStep.intent];
    if (platform === "web" && seedWebMismatch && planStep.intent === "assert_discount_visible") {
      observedOutcome = "original_total_1999_visible";
    }
    const step = {
      intent: planStep.intent,
      status: "passed",
      durationMs: 320 + index * 140 + (platform === "android" ? 180 : 0),
      observedOutcome,
      visibleText: planStep.intent === "assert_discount_visible"
        ? [platform === "web" && seedWebMismatch ? "₹1,999" : "₹1,799"]
        : [],
      evidenceMode: "mock",
    };
    step.artifacts = { screenshot: await writeEvidence(outputDir, platform, step, index) };
    steps.push(step);
  }
  return {
    platform,
    runner: platform === "android" ? "maestro-mcp" : "playwright-mcp",
    evidenceMode: "mock",
    stateEquivalent: true,
    steps,
  };
}

export function createPlatformRunners({ outputDir, seedWebMismatch = true }) {
  return {
    android: (plan) => mockRun("android", plan, outputDir, { seedWebMismatch }),
    web: (plan) => mockRun("web", plan, outputDir, { seedWebMismatch }),
  };
}
