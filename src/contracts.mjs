export const SUPPORTED_INTENTS = Object.freeze([
  "open_cart",
  "enter_coupon",
  "apply_coupon",
  "assert_discount_visible",
]);

export function compileTranscript(transcript) {
  const normalized = String(transcript ?? "").trim();
  if (!normalized) {
    return { ok: false, errors: ["Transcript is empty."], plan: null };
  }

  const coupon = normalized.match(/\b[A-Z]{2,}\d{1,}\b/i)?.[0]?.toUpperCase();
  const checks = [
    [/open\s+(?:the\s+)?cart/i, "open_cart"],
    [/(?:enter|type|use)\s+(?:the\s+)?coupon/i, "enter_coupon"],
    [/apply\s+(?:the\s+)?coupon/i, "apply_coupon"],
    [/(?:verify|check|confirm|ensure).*(?:discount|discounted).*(?:total|price)/i, "assert_discount_visible"],
  ];
  const found = checks.filter(([pattern]) => pattern.test(normalized)).map(([, intent]) => intent);
  const missing = SUPPORTED_INTENTS.filter((intent) => !found.includes(intent));
  const errors = [];

  if (!coupon) errors.push("A literal coupon code is required.");
  if (missing.length) errors.push(`Missing required intents: ${missing.join(", ")}.`);
  if (errors.length) return { ok: false, errors, plan: null };

  return {
    ok: true,
    errors: [],
    plan: {
      version: "1.0",
      journey: "apply_coupon",
      approved: false,
      steps: [
        { intent: "open_cart" },
        { intent: "enter_coupon", value: coupon },
        { intent: "apply_coupon" },
        { intent: "assert_discount_visible" },
      ],
      expectedOutcome: "discounted_total_visible",
    },
  };
}

export function approvePlan(plan) {
  if (!plan || plan.journey !== "apply_coupon") throw new Error("Only the locked coupon journey can be approved.");
  return { ...structuredClone(plan), approved: true, approvedAt: new Date().toISOString() };
}

export function validatePlan(plan) {
  if (!plan?.approved) throw new Error("Plan must be explicitly approved before execution.");
  const intents = plan.steps?.map((step) => step.intent) ?? [];
  if (JSON.stringify(intents) !== JSON.stringify(SUPPORTED_INTENTS)) {
    throw new Error("Plan does not match the locked four-intent contract.");
  }
  const coupon = plan.steps.find((step) => step.intent === "enter_coupon")?.value;
  if (!/^[A-Z]{2,}\d{1,}$/.test(coupon ?? "")) throw new Error("Coupon literal is missing or invalid.");
  return plan;
}
