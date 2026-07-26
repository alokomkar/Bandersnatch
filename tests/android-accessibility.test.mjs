import assert from "node:assert/strict";
import test from "node:test";
import { access, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runAndroidAccessibilityCheck } from "../src/adapters/android-accessibility.mjs";

test("captures Android nodes, focus order, and an external announcement event", {
  skip: !process.env.ANDROID_SERIAL,
}, async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "bandersnatch-android-accessibility-"));
  try {
    const result = await runAndroidAccessibilityCheck({ outputDir });
    assert.equal(result.completion, "independent");
    assert.deepEqual(result.evidence.map(item => [item.intent, item.status]), [
      ["find_control", "passed"],
      ["assert_accessible_name", "passed"],
      ["assert_focus_logical", "passed"],
      ["assert_announcement", "passed"],
    ]);
    assert.deepEqual(result.evidence[2].focusOrder, ["open_cart", "coupon_input", "apply_coupon"]);
    assert.equal(result.evidence[3].announcementProof, "programmatic");
    assert.equal(result.evidenceBoundary.screenReaderHeard, "not_tested");
    await Promise.all(Object.values(result.artifacts).map(path => access(path)));
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
