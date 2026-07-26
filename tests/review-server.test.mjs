import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createReviewServer } from "../src/review-server.mjs";

const validTranscript = "Open the cart, enter coupon SAVE10, apply the coupon, and verify that the discounted total is visible.";

async function withServer(callback) {
  const server = createReviewServer().listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("review API blocks malformed input and unlocks a corrected plan", async () => {
  await withServer(async baseUrl => {
    const malformed = { transcript: "Please inspect checkout.", evidenceMode: "manual" };
    const blockedResponse = await fetch(`${baseUrl}/api/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcription: malformed }),
    });
    const blocked = await blockedResponse.json();
    assert.equal(blocked.status, "needs_correction");
    assert.equal(blocked.plan, null);

    const readyResponse = await fetch(`${baseUrl}/api/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcription: malformed, correctedTranscript: validTranscript }),
    });
    const ready = await readyResponse.json();
    assert.equal(ready.status, "ready_for_approval");
    assert.equal(ready.correctionApplied, true);

    const runResponse = await fetch(`${baseUrl}/api/approve-run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ review: ready }),
    });
    const run = await runResponse.json();
    assert.equal(runResponse.status, 200);
    assert.equal(run.plan.approved, true);
    assert.equal(run.comparison.verdict, "inconsistent");
  });
});
