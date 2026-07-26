import assert from "node:assert/strict";
import test from "node:test";
import { approvePlan, compileTranscript, validatePlan } from "../src/contracts.mjs";
import { comparePlatformResults } from "../src/comparator.mjs";

const transcript = "Open the cart, enter coupon SAVE10, apply the coupon, and verify that the discounted total is visible.";

test("compiles the locked coupon journey and preserves its literal", () => {
  const result = compileTranscript(transcript);
  assert.equal(result.ok, true);
  assert.equal(result.plan.steps[1].value, "SAVE10");
  assert.deepEqual(result.plan.steps.map((step) => step.intent), [
    "open_cart", "enter_coupon", "apply_coupon", "assert_discount_visible",
  ]);
});

test("rejects ambiguous or incomplete instructions", () => {
  const result = compileTranscript("Please check checkout.");
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /coupon code|required intents/i);
});

test("blocks execution before approval", () => {
  const plan = compileTranscript(transcript).plan;
  assert.throws(() => validatePlan(plan), /approved/i);
  assert.doesNotThrow(() => validatePlan(approvePlan(plan)));
});

test("returns consistent, inconsistent, and incomparable verdicts", () => {
  const makeResult = (platform, finalOutcome = "discounted_total_1799_visible") => ({
    platform,
    stateEquivalent: true,
    steps: [
      ["open_cart", "cart_visible"],
      ["enter_coupon", "coupon_SAVE10_entered"],
      ["apply_coupon", "coupon_accepted"],
      ["assert_discount_visible", finalOutcome],
    ].map(([intent, observedOutcome]) => ({ intent, status: "passed", observedOutcome })),
  });
  const android = makeResult("android");
  assert.equal(comparePlatformResults(android, makeResult("web")).verdict, "consistent");
  const mismatch = comparePlatformResults(android, makeResult("web", "original_total_1999_visible"));
  assert.equal(mismatch.verdict, "inconsistent");
  assert.equal(mismatch.firstDivergence, "assert_discount_visible");
  assert.equal(comparePlatformResults(android, { platform: "web", stateEquivalent: false }).verdict, "incomparable");
});
