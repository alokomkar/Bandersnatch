# Bandersnatch Demo Recording Plan

## Recording order

Record the product in two layers:

1. **English, non-voice baseline:** start from the reviewed English journey and bypass microphone/Sarvam input. Prove the plan, platform execution, evidence, and verdict first.
2. **Voice-authored version:** repeat the same bounded cases with Saaras v3 input and, for the accessibility pilot, Bulbul v3 output.

The video-capture task is handled separately. This document controls the cases, expected evidence, naming, and acceptance checks.

## Fixed English journey

> Open the cart, enter coupon SAVE10, apply the coupon, and verify that the discounted total is visible and announced.

The literal `SAVE10`, four core journey intents, and four accessibility intents must remain unchanged between recordings.

## Set 1 — English, non-voice recordings

### E1 — Consistent success

| Target | Fixture state | Expected result |
|---|---|---|
| Android | Success | Coupon accepted; total ₹1,799; accessibility result announced programmatically |
| Web | `mode=success` | Coupon accepted; total ₹1,799; `role=status` live-region update |
| Joined verdict | — | `consistent` |

Required footage:

- approved English plan;
- Android execution and evidence;
- Web keyboard-only execution and evidence;
- joined `consistent` verdict;
- explicit `screen reader heard: not tested` boundary.

Filename: `e1-english-consistent-android-web.mp4`

### E2 — Deliberate mismatch

| Target | Fixture state | Expected result |
|---|---|---|
| Android | Success | Coupon accepted; total ₹1,799 |
| Web | `mode=mismatch` | Coupon accepted; total remains ₹1,999 |
| Joined verdict | — | `inconsistent` at the discounted-total intent |

Required footage:

- identical approved plan used for both targets;
- Android and Web measured totals;
- first divergent intent;
- evidence-backed `inconsistent` verdict.

Filename: `e2-english-inconsistent-android-web.mp4`

### E3 — Missing evidence

| Target | Fixture state | Expected result |
|---|---|---|
| Android | Success | Coupon accepted; total ₹1,799 |
| Web | `mode=missing` | Required total evidence absent |
| Joined verdict | — | `incomparable`, never a pass |

Required footage:

- successful Android evidence;
- visibly missing Web evidence;
- guarded `incomparable` verdict;
- recovery/reset control.

Filename: `e3-english-incomparable-android-web.mp4`

## Set 2 — Voice-authored recordings

Repeat E1–E3 without changing the platform fixtures or expected outcomes.

### V1 — Live Hindi/code-mixed input

- Speak the coupon journey through Saaras v3.
- Show automatic language detection metadata.
- Confirm that `SAVE10` is preserved.
- Review and approve the English platform-neutral plan.
- Run the E1 consistent case.
- Play the deterministic Hindi Bulbul v3 verdict.

Filename: `v1-hindi-consistent-live.mp4`

### V2 — Voice-authored mismatch

- Reuse the approved voice-authored plan.
- Run Android success against Web mismatch.
- Show the first divergence.
- Play the deterministic Hindi `inconsistent` verdict.

Filename: `v2-hindi-inconsistent.mp4`

### V3 — Voice-authored missing evidence

- Reuse the approved voice-authored plan.
- Run Android success against Web missing evidence.
- Show why Bandersnatch refuses to guess.
- Play the deterministic Hindi `incomparable` verdict.

Filename: `v3-hindi-incomparable.mp4`

## Evidence labels shown in every recording

- `Implemented`
- `Working locally`
- `Acceptance-tested`
- `Public-link verified`
- `Demo-ready`

Only show a label as complete when that exact state has been verified.

For accessibility evidence, keep these labels separate:

- `Accessibility tree captured`
- `Programmatic announcement observed`
- `Screen reader heard: not tested` or `Screen reader heard: confirmed`

## Recording acceptance checklist

- Reset Android and Web before each take.
- Keep the English journey and `SAVE10` visible.
- Show both platform names throughout execution.
- Show the fixture mode or case identifier.
- Show evidence before revealing the verdict.
- Never use a success recording as evidence for mismatch or missing-evidence cases.
- Do not claim TalkBack, VoiceOver, or NVDA speech without an observed screen-reader run.
- Keep one fallback recording for the live Sarvam input and one for Bulbul output.
- Preserve one clean recording of each E1–E3 case before recording V1–V3.

