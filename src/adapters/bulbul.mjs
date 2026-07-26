const ENDPOINT = "https://api.sarvam.ai/text-to-speech";

export async function synthesizeHindiVerdict({
  text,
  apiKey = process.env.SARVAM_API_KEY,
  pace = 1,
  speaker = "shubh",
  timeoutMs = 20_000,
  fetchImpl = fetch,
}) {
  if (!apiKey) throw new Error("SARVAM_API_KEY is required for live text-to-speech.");
  if (!String(text ?? "").trim()) throw new Error("Text-to-speech requires a non-empty verdict.");
  if (!Number.isFinite(pace) || pace < 0.5 || pace > 2) throw new Error("Bulbul pace must be between 0.5 and 2.0.");

  const response = await fetchImpl(ENDPOINT, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_language_code: "hi-IN",
      speaker,
      pace,
      model: "bulbul:v3",
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message ?? body?.message ?? `Sarvam request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  const audioBase64 = body.audios?.[0];
  if (!audioBase64) throw new Error("Sarvam response did not contain audio.");

  return {
    provider: "sarvam",
    evidenceMode: "live",
    model: "bulbul:v3",
    languageCode: "hi-IN",
    speaker,
    pace,
    requestId: body.request_id ?? null,
    audioBase64,
  };
}
