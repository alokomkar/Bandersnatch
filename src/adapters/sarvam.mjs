import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

const ENDPOINT = "https://api.sarvam.ai/speech-to-text";

export async function transcribeWithSarvam({ audioPath, apiKey = process.env.SARVAM_API_KEY, timeoutMs = 20_000 }) {
  if (!apiKey) throw new Error("SARVAM_API_KEY is required for live transcription.");
  const metadata = await stat(audioPath);
  if (!metadata.isFile() || metadata.size === 0) throw new Error("Audio file must exist and be non-empty.");

  const audio = await readFile(audioPath);
  const extension = basename(audioPath).split(".").pop()?.toLowerCase();
  const mime = extension === "wav" ? "audio/wav" : extension === "ogg" ? "audio/ogg" : "audio/webm";
  const form = new FormData();
  form.append("file", new Blob([audio], { type: mime }), basename(audioPath));
  form.append("model", "saaras:v3");
  form.append("mode", "translate");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message ?? `Sarvam request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  if (!body.transcript) throw new Error("Sarvam response did not contain a transcript.");

  return {
    provider: "sarvam",
    evidenceMode: "live",
    model: "saaras:v3",
    mode: "translate",
    requestId: body.request_id ?? null,
    transcript: body.transcript,
    languageCode: body.language_code ?? null,
  };
}

export function mockSarvamTranscript() {
  return {
    provider: "sarvam",
    evidenceMode: "mock",
    model: "saaras:v3",
    mode: "translate",
    requestId: "mock-sarvam-request",
    transcript: "Open the cart, enter coupon SAVE10, apply the coupon, and verify that the discounted total is visible.",
    languageCode: "hi-IN",
  };
}
