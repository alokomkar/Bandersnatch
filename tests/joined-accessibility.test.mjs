import assert from "node:assert/strict";
import test from "node:test";
import { joinAccessibilityEvidence } from "../src/accessibility/joined-report.mjs";

const makePlatform = (platform, outcome) => ({
  platform,
  observedOutcome: outcome,
  evidenceBoundary: { programmaticAnnouncementObserved: true },
  evidence: ["find_control", "assert_accessible_name", "assert_focus_logical", "assert_announcement"]
    .map(intent => ({ intent, status: "passed" })),
});

test("guards all three joined accessibility verdicts", () => {
  const android = makePlatform("android", "discounted_total_1799_visible");
  const consistent = joinAccessibilityEvidence(android, makePlatform("web", "discounted_total_1799_visible"));
  assert.equal(consistent.verdict, "consistent");
  assert.equal(consistent.completion, "independent");
  const inconsistent = joinAccessibilityEvidence(android, makePlatform("web", "original_total_1999_visible"));
  assert.equal(inconsistent.verdict, "inconsistent");
  assert.equal(inconsistent.firstDivergence, "assert_discount_visible");
  const incomparable = joinAccessibilityEvidence(android, makePlatform("web", null));
  assert.equal(incomparable.verdict, "incomparable");
  assert.equal(incomparable.completion, "blocked");
});
