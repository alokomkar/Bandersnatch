import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyAccessibleCompletion,
  hindiSpokenVerdict,
  normalizeAccessibilityEvidence,
} from "../src/accessibility/contracts.mjs";
import { synthesizeHindiVerdict } from "../src/adapters/bulbul.mjs";

test("classifies independent, assisted, and blocked completion without inflating evidence", () => {
  assert.equal(classifyAccessibleCompletion({
    executionCompleted: true, allAssertionsPassed: true,
  }), "independent");
  assert.equal(classifyAccessibleCompletion({
    executionCompleted: true, allAssertionsPassed: true, sightedAssistanceUsed: true,
  }), "assisted");
  assert.equal(classifyAccessibleCompletion({
    executionCompleted: true, allAssertionsPassed: true, criticalEvidenceMissing: true,
  }), "blocked");
});

test("keeps programmatic announcements distinct from confirmed screen-reader speech", () => {
  const evidence = normalizeAccessibilityEvidence({
    platform: "web",
    intent: "assert_announcement",
    status: "passed",
    announcement: "Coupon applied. Total ₹1,799.",
    announcementProof: "programmatic",
  });
  assert.equal(evidence.announcementProof, "programmatic");
  assert.notEqual(evidence.announcementProof, "screen_reader_heard");
});

test("provides deterministic Hindi speech for every verdict and completion state", () => {
  for (const verdict of ["consistent", "inconsistent", "incomparable"]) {
    for (const completion of ["independent", "assisted", "blocked"]) {
      assert.match(hindiSpokenVerdict({ verdict, completion }), /[ऀ-ॿ]/u);
    }
  }
});

test("calls Bulbul v3 with the locked Hindi settings", async () => {
  let request;
  const result = await synthesizeHindiVerdict({
    text: hindiSpokenVerdict({ verdict: "consistent", completion: "independent" }),
    apiKey: "test-key",
    pace: 0.8,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ audios: ["UklGRg=="], request_id: "test-request" }) };
    },
  });
  assert.equal(request.url, "https://api.sarvam.ai/text-to-speech");
  assert.equal(request.body.model, "bulbul:v3");
  assert.equal(request.body.target_language_code, "hi-IN");
  assert.equal(request.body.speaker, "shubh");
  assert.equal(request.body.pace, 0.8);
  assert.equal(result.audioBase64, "UklGRg==");
});

test("rejects unsupported Bulbul pace", async () => {
  await assert.rejects(
    () => synthesizeHindiVerdict({ text: "परीक्षण", apiKey: "test-key", pace: 2.1 }),
    /between 0.5 and 2.0/,
  );
});
