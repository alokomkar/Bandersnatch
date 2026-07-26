import assert from "node:assert/strict";
import test from "node:test";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runWebAccessibilityCheck } from "../src/adapters/playwright-accessibility.mjs";

test("completes the Web coupon journey by keyboard and captures bounded accessibility evidence", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "bandersnatch-web-accessibility-"));
  try {
    const result = await runWebAccessibilityCheck({ outputDir });
    assert.equal(result.interactionMode, "keyboard");
    assert.equal(result.completion, "independent");
    assert.deepEqual(
      result.evidence.map(item => [item.intent, item.status]),
      [
        ["find_control", "passed"],
        ["assert_accessible_name", "passed"],
        ["assert_focus_logical", "passed"],
        ["assert_announcement", "passed"],
      ],
    );
    assert.deepEqual(result.evidence[2].focusOrder, ["Cart · 1", "Coupon code", "Apply"]);
    assert.equal(result.evidence[2].postActionFocus, "Apply");
    assert.equal(result.evidence[3].announcement, "Coupon SAVE10 applied");
    assert.equal(result.evidence[3].announcementProof, "programmatic");
    assert.equal(result.evidenceBoundary.screenReaderHeard, "not_tested");
    await access(result.artifacts.screenshot);
    const rawEvidence = JSON.parse(await readFile(result.artifacts.rawEvidence, "utf8"));
    assert.equal(rawEvidence.completion, "independent");
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
