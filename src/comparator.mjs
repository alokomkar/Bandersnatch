function evidenceComplete(result) {
  return result?.stateEquivalent === true &&
    Array.isArray(result.steps) &&
    result.steps.length === 4 &&
    result.steps.every((step) => step.status && step.observedOutcome);
}

export function comparePlatformResults(android, web) {
  if (!evidenceComplete(android) || !evidenceComplete(web)) {
    return {
      verdict: "incomparable",
      consistencyPercent: null,
      firstDivergence: null,
      reason: "Equivalent state or required step evidence is missing.",
    };
  }

  const rows = android.steps.map((androidStep, index) => {
    const webStep = web.steps[index];
    const consistent = androidStep.intent === webStep.intent &&
      androidStep.status === webStep.status &&
      androidStep.observedOutcome === webStep.observedOutcome;
    return { intent: androidStep.intent, android: androidStep, web: webStep, consistent };
  });
  const firstDivergence = rows.find((row) => !row.consistent) ?? null;
  const consistencyPercent = Math.round(rows.filter((row) => row.consistent).length / rows.length * 100);

  return {
    verdict: firstDivergence ? "inconsistent" : "consistent",
    consistencyPercent,
    firstDivergence: firstDivergence?.intent ?? null,
    reason: firstDivergence
      ? `The first measured divergence occurred at ${firstDivergence.intent}.`
      : "Both platforms completed the same measured customer outcome.",
    rows,
  };
}
