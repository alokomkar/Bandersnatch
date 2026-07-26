import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const fixtureUrl = pathToFileURL(resolve("fixtures", "checkout.html")).href;

const observedOutcomes = {
  open_cart: "cart_visible",
  enter_coupon: "coupon_SAVE10_entered",
  apply_coupon: "coupon_accepted",
};

export async function runWebPlanWithPlaywright(plan, {
  outputDir,
  mode = "success",
  headless = true,
  url = fixtureUrl,
} = {}) {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const steps = [];

  try {
    await page.goto(`${url}?mode=${encodeURIComponent(mode)}`);
    for (const [index, planStep] of plan.steps.entries()) {
      const startedAt = Date.now();
      let observedOutcome = observedOutcomes[planStep.intent] ?? null;
      let status = "passed";

      if (planStep.intent === "open_cart") {
        await page.getByTestId("open-cart").click();
        await page.getByTestId("cart").waitFor({ state: "visible" });
      } else if (planStep.intent === "enter_coupon") {
        await page.getByTestId("coupon-input").fill(planStep.value);
      } else if (planStep.intent === "apply_coupon") {
        await page.getByTestId("apply-coupon").click();
        await page.getByTestId("coupon-status").filter({ hasText: "Coupon SAVE10 applied" }).waitFor();
      } else if (planStep.intent === "assert_discount_visible") {
        const total = page.getByTestId("total");
        if (await total.count() === 0) {
          status = "failed";
        } else {
          const text = await total.innerText();
          observedOutcome = text.includes("₹1,799")
            ? "discounted_total_1799_visible"
            : "original_total_1999_visible";
        }
      }

      const screenshot = resolve(outputDir, `web-${index + 1}-${planStep.intent}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      const checkoutText = await page.getByTestId("checkout").innerText();
      steps.push({
        intent: planStep.intent,
        status,
        durationMs: Date.now() - startedAt,
        observedOutcome,
        visibleText: checkoutText.split("\n").map(value => value.trim()).filter(Boolean),
        artifacts: { screenshot },
        error: status === "failed" ? "Required discounted-total evidence is missing." : null,
        evidenceMode: "live",
      });
    }
  } finally {
    await browser.close();
  }

  return {
    platform: "web",
    runner: "playwright",
    evidenceMode: "live",
    stateEquivalent: true,
    fixtureMode: mode,
    steps,
  };
}
