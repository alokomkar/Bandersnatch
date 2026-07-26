import { compileTranscript } from "./contracts.mjs";

export function reviewTranscript(transcription, correctedTranscript = null) {
  const originalTranscript = String(transcription?.transcript ?? "").trim();
  const reviewedTranscript = correctedTranscript == null
    ? originalTranscript
    : String(correctedTranscript).trim();
  const compilation = compileTranscript(reviewedTranscript);

  return {
    status: compilation.ok ? "ready_for_approval" : "needs_correction",
    originalTranscript,
    reviewedTranscript,
    correctionApplied: reviewedTranscript !== originalTranscript,
    errors: compilation.errors,
    plan: compilation.plan,
  };
}
