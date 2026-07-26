import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import {
  classifyAccessibleCompletion,
  normalizeAccessibilityEvidence,
} from "../accessibility/contracts.mjs";

const localFixtureUrl = pathToFileURL(resolve("fixtures", "checkout.html")).href;

async function controlEvidence(locator) {
  const [snapshot, attributes] = await Promise.all([
    locator.ariaSnapshot(),
    locator.evaluate(element => ({
      tagName: element.tagName.toLowerCase(),
      explicitRole: element.getAttribute("role"),
      ariaLabel: element.getAttribute("aria-label"),
      text: element.textContent.trim(),
      testId: element.getAttribute("data-testid"),
    })),
  ]);
  const role = attributes.explicitRole
    ?? (attributes.tagName === "button" ? "button" : attributes.tagName === "input" ? "textbox" : "generic");
  const accessibleName = attributes.ariaLabel
    ?? (role === "textbox" ? null : attributes.text);
  return { ...attributes, role, accessibleName, ariaSnapshot: snapshot };
}

async function activeElementName(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return "document";
    return element.getAttribute("aria-label")
      ?? element.textContent?.trim()
      ?? element.getAttribute("data-testid")
      ?? element.tagName.toLowerCase();
  });
}

export async function runWebAccessibilityCheck({
  outputDir,
  mode = "success",
  headless = true,
  url = process.env.WEB_FIXTURE_URL ?? localFixtureUrl,
} = {}) {
  if (!outputDir) throw new Error("Web accessibility evidence requires an output directory.");
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const screenshot = resolve(outputDir, "web-accessibility-final.png");
  const rawEvidencePath = resolve(outputDir, "web-accessibility-evidence.json");

  try {
    await page.goto(`${url}?mode=${encodeURIComponent(mode)}`);
    const openCart = page.getByRole("button", { name: "Cart · 1" });
    const couponInput = page.getByRole("textbox", { name: "Coupon code" });
    const applyCoupon = page.getByRole("button", { name: "Apply" });
    const status = page.getByRole("status");

    const controls = { openCart: await controlEvidence(openCart) };

    const focusOrder = [];
    await page.keyboard.press("Tab");
    focusOrder.push(await activeElementName(page));
    await page.keyboard.press("Enter");
    await page.getByTestId("cart").waitFor({ state: "visible" });
    controls.couponInput = await controlEvidence(couponInput);
    controls.applyCoupon = await controlEvidence(applyCoupon);
    controls.status = await controlEvidence(status);
    await page.keyboard.press("Tab");
    focusOrder.push(await activeElementName(page));
    await page.keyboard.type("SAVE10");
    await page.keyboard.press("Tab");
    focusOrder.push(await activeElementName(page));

    await status.evaluate(element => {
      window.__bandersnatchAnnouncements = [];
      const observer = new MutationObserver(() => {
        window.__bandersnatchAnnouncements.push({
          text: element.textContent.trim(),
          at: new Date().toISOString(),
        });
      });
      observer.observe(element, { childList: true, characterData: true, subtree: true });
      window.__bandersnatchAnnouncementObserver = observer;
    });
    await page.keyboard.press("Enter");
    await status.filter({ hasText: "Coupon SAVE10 applied" }).waitFor();

    const postActionFocus = await activeElementName(page);
    const announcements = await page.evaluate(() => window.__bandersnatchAnnouncements ?? []);
    const announcement = announcements.at(-1)?.text ?? null;
    await page.screenshot({ path: screenshot, fullPage: true });

    const namesPassed = controls.openCart.role === "button"
      && controls.couponInput.role === "textbox"
      && controls.couponInput.accessibleName === "Coupon code"
      && controls.applyCoupon.role === "button";
    const focusPassed = JSON.stringify(focusOrder) === JSON.stringify(["Cart · 1", "Coupon code", "Apply"]);
    const announcementPassed = announcement === "Coupon SAVE10 applied"
      && controls.status.role === "status";

    const artifactRefs = [screenshot, rawEvidencePath];
    const evidence = [
      normalizeAccessibilityEvidence({
        platform: "web",
        intent: "find_control",
        status: controls.openCart && controls.couponInput && controls.applyCoupon ? "passed" : "failed",
        role: "multiple",
        artifactRefs,
      }),
      normalizeAccessibilityEvidence({
        platform: "web",
        intent: "assert_accessible_name",
        status: namesPassed ? "passed" : "failed",
        accessibleName: "Cart · 1; Coupon code; Apply",
        role: "button; textbox; button",
        artifactRefs,
      }),
      normalizeAccessibilityEvidence({
        platform: "web",
        intent: "assert_focus_logical",
        status: focusPassed ? "passed" : "failed",
        focusOrder,
        postActionFocus,
        artifactRefs,
      }),
      normalizeAccessibilityEvidence({
        platform: "web",
        intent: "assert_announcement",
        status: announcementPassed ? "passed" : "failed",
        accessibleName: "status",
        role: controls.status.role,
        announcement,
        announcementProof: announcementPassed ? "programmatic" : "not_observed",
        artifactRefs,
      }),
    ];
    const allAssertionsPassed = evidence.every(item => item.status === "passed");
    const result = {
      platform: "web",
      runner: "playwright",
      evidenceMode: "live",
      fixtureMode: mode,
      interactionMode: "keyboard",
      controls,
      announcements,
      evidence,
      completion: classifyAccessibleCompletion({
        executionCompleted: true,
        allAssertionsPassed,
        criticalEvidenceMissing: !announcement,
        sightedAssistanceUsed: false,
      }),
      evidenceBoundary: {
        programmaticAnnouncementObserved: announcementPassed,
        screenReaderHeard: "not_tested",
      },
      artifacts: { screenshot, rawEvidence: rawEvidencePath },
    };
    await writeFile(rawEvidencePath, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  } finally {
    await browser.close();
  }
}
