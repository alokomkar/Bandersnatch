# Bandersnatch Accessibility Pilot — Implementation Plan

## Locked pilot

A multilingual accessibility or exploratory tester—not a customer-support caller—is the product user. Voice is valuable because it enables hands-busy test authoring and independent use by blind or low-vision testers.

A blind or low-vision Hindi-speaking tester speaks the `SAVE10` coupon journey, reviews and approves it without sighted assistance, runs it on Android and Web, receives accessibility-tree evidence, and hears a deterministic Hindi verdict through Sarvam Bulbul v3.

Voice Experience remains the only scored Sarvam parameter. Saaras v3 is the input edge and Bulbul v3 is the output edge; using both does not create a second scored parameter.

## Evidence boundary

Bandersnatch must keep these claims separate:

- **Accessibility-tree evidence:** name, role, state, reachability, focus order, post-action focus, and announcement events captured by an adapter.
- **Programmatic announcement:** the platform emitted an accessibility event or updated a live region.
- **Heard through a screen reader:** a tester or dedicated screen-reader instrumentation confirmed the spoken result.

An accessibility event alone is not proof that TalkBack or another screen reader actually spoke the text.

## Implementation phases

### A1 — Contract and spoken verdict

Status: **Acceptance-tested.**

Deliver:

- locked accessibility intents: `find_control`, `assert_accessible_name`, `assert_focus_logical`, and `assert_announcement`;
- one normalized Android/Web accessibility evidence envelope;
- `independent`, `assisted`, and `blocked` completion classification;
- deterministic Hindi verdict templates;
- server-side Bulbul v3 adapter with adjustable pace.

Acceptance test:

> Unit tests prove all three completion classifications and all three cross-platform verdicts, and a live Bulbul request produces playable Hindi audio using the existing event key.

Scope cut: retain the text verdict if TTS is unavailable. Do not add translation or generated explanations.

### A2 — Web accessibility evidence

Status: **Acceptance-tested and merged.**

Deliver:

- role and accessible-name checks for the coupon fixture;
- keyboard reachability and focus-order capture;
- post-action focus evidence;
- `aria-live`/status announcement evidence;
- screenshots and raw evidence references.

Acceptance test:

> Playwright completes the coupon journey without pointer input and records the expected name, role, focus sequence, and result announcement.

Scope cut: Chromium and the controlled fixture only.

### A3 — Android accessibility evidence

Status: **Acceptance-tested and merged.**

Deliver:

- accessibility-node name, role/class, state, and resource ID capture;
- reachability and focus-order evidence;
- post-action accessibility event capture;
- explicit `programmatic_announcement` versus `screen_reader_heard` status.

Acceptance test:

> The Android fixture completes with accessibility selectors and records the expected coupon result in the accessibility tree and event stream.

Scope cut: one connected Android device and the controlled fixture. Actual TalkBack audio capture remains unclaimed unless separately verified.

### A4 — Joined accessible report

Status: **Acceptance-tested locally; merge pending.** All three joined verdict paths render aligned Android/Web evidence, equivalent Hindi text and live Bulbul audio, keyboard-operable playback speed, and an explicit screen-reader evidence boundary.

Deliver:

- Android/Web evidence aligned by intent;
- guarded consistency and completion classifications;
- keyboard- and screen-reader-operable report;
- Hindi text equivalent plus play, pause, replay, and pace controls for the spoken verdict.

Acceptance test:

> The report exposes the same verdict in text and audio, preserves focus, and never labels missing evidence as a pass.

Scope cut: deterministic verdict templates only.

### A5 — Repetition and demo hardening

Status: **Acceptance-tested locally; external demo checks remain.** Five English baseline recordings are media-validated, three consecutive end-to-end runs each produced correct `consistent`, `inconsistent`, and `incomparable` reports with playable Hindi audio, and the three public fixture URLs return HTTP 200. Another-device verification, real screen-reader acceptance, and two timed human rehearsals remain.

Deliver:

- record the English, non-voice baseline first for `consistent`, `inconsistent`, and `incomparable`;
- repeat those fixed cases with voice authoring only after the baseline footage is accepted;
- success, deliberate mismatch, and missing-evidence cases;
- deterministic reset and fallback recording;
- three repeated runs;
- public URL verification from another device;
- two timed three-minute rehearsals.

Acceptance test:

> A blind or low-vision tester can speak, approve, run, and hear the bounded coupon verdict without sighted assistance.

Local repeat evidence:

- `2026-07-26T07-14-42-149Z`
- `2026-07-26T07-15-13-908Z`
- `2026-07-26T07-15-39-359Z`

Each run produced Android node/event evidence once, three Web modes, three guarded joined verdicts, and three live Bulbul audio files. Public-link verification, a real screen-reader user acceptance pass, and two human-timed rehearsals must remain unchecked until performed.

Recording contract:

> `DEMO_RECORDING_PLAN.md` is the source of truth for case order, expected evidence, filenames, and claims. Video capture itself is handled in the separate recording task.

## Sarvam access

The existing `SARVAM_API_KEY` is sufficient for the tested Saaras v3 speech-to-text and Bulbul v3 text-to-speech endpoints. The pilot uses `hi-IN`, speaker `shubh`, and pace `0.5–2.0`.

No translation API is required for A1–A5 because verdicts are selected from reviewed Hindi templates. Translation becomes a separate access and quality decision only if arbitrary generated explanations enter scope.

## Stop conditions

- If a platform cannot expose stable accessibility evidence, classify the run `blocked`; do not infer from pixels.
- If focus or announcement evidence is unavailable, cut those checks rather than claiming independence.
- If live TTS fails twice, use the matching Hindi text and a verified fallback recording.
- Do not add arbitrary journeys, a broad accessibility scanner, automated fixes, iOS, or browser breadth during this pilot.
