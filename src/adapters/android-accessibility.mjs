import { execFile as execFileCallback, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  classifyAccessibleCompletion,
  normalizeAccessibilityEvidence,
} from "../accessibility/contracts.mjs";

const execFile = promisify(execFileCallback);
const fixturePackage = "com.bandersnatch.fixture";

function delay(milliseconds) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));
}

function decodeXml(value = "") {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function parseNodes(xml) {
  return [...xml.matchAll(/<node\b([^>]*)\/>/g)].map(match => {
    const attributes = {};
    for (const attribute of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
      attributes[attribute[1]] = decodeXml(attribute[2]);
    }
    return attributes;
  });
}

function nodeById(nodes, id) {
  return nodes.find(node => node["resource-id"] === `${fixturePackage}:id/${id}`);
}

function centerOf(node) {
  const match = node?.bounds?.match(/\[(\d+),(\d+)]\[(\d+),(\d+)]/);
  if (!match) throw new Error(`Node ${node?.["resource-id"] ?? "unknown"} has no tappable bounds.`);
  return [
    Math.round((Number(match[1]) + Number(match[3])) / 2),
    Math.round((Number(match[2]) + Number(match[4])) / 2),
  ];
}

function roleFor(node) {
  if (node?.class?.endsWith("Button")) return "button";
  if (node?.class?.endsWith("EditText")) return "textbox";
  return "text";
}

async function captureEventStream(adbPath, serial, action) {
  const child = spawn(adbPath, ["-s", serial, "shell", "uiautomator", "events"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", chunk => { output += chunk; });
  child.stderr.on("data", chunk => { output += chunk; });
  await delay(500);
  try {
    await action();
    await delay(800);
  } finally {
    child.kill("SIGINT");
    await Promise.race([
      new Promise(resolveExit => child.once("exit", resolveExit)),
      delay(1_000),
    ]);
  }
  return output;
}

export async function runAndroidAccessibilityCheck({
  outputDir,
  serial = process.env.ANDROID_SERIAL,
  adbPath = process.env.ADB_PATH ?? "adb",
} = {}) {
  if (!outputDir) throw new Error("Android accessibility evidence requires an output directory.");
  if (!serial) throw new Error("ANDROID_SERIAL is required for Android accessibility evidence.");
  await mkdir(outputDir, { recursive: true });

  const runAdb = (...args) => execFile(adbPath, ["-s", serial, ...args], { maxBuffer: 10 * 1024 * 1024 });
  const remoteXml = "/sdcard/bandersnatch-window.xml";
  const beforeXmlPath = resolve(outputDir, "android-accessibility-before.xml");
  const afterXmlPath = resolve(outputDir, "android-accessibility-after.xml");
  const eventsPath = resolve(outputDir, "android-accessibility-events.txt");
  const screenshot = resolve(outputDir, "android-accessibility-final.png");
  const rawEvidencePath = resolve(outputDir, "android-accessibility-evidence.json");

  const dumpHierarchy = async destination => {
    await runAdb("shell", "uiautomator", "dump", remoteXml);
    await runAdb("pull", remoteXml, destination);
    return parseNodes(await readFile(destination, "utf8"));
  };
  const tapNode = async node => {
    const [x, y] = centerOf(node);
    await runAdb("shell", "input", "tap", String(x), String(y));
    await delay(250);
  };

  await runAdb("shell", "am", "force-stop", fixturePackage);
  await runAdb("shell", "am", "start", "-n", `${fixturePackage}/.MainActivity`);
  await delay(500);
  let nodes = await dumpHierarchy(beforeXmlPath);
  await tapNode(nodeById(nodes, "open_cart"));
  nodes = await dumpHierarchy(beforeXmlPath);

  const openCart = nodeById(nodes, "open_cart");
  const couponInput = nodeById(nodes, "coupon_input");
  const applyCoupon = nodeById(nodes, "apply_coupon");
  if (!openCart || !couponInput || !applyCoupon) throw new Error("Required Android accessibility nodes were not found.");

  await tapNode(couponInput);
  await runAdb("shell", "input", "text", "SAVE10");
  await runAdb("shell", "input", "keyevent", "4");
  const events = await captureEventStream(adbPath, serial, () => tapNode(applyCoupon));
  await writeFile(eventsPath, events);
  const finalNodes = await dumpHierarchy(afterXmlPath);
  await runAdb("shell", "screencap", "-p", "/sdcard/bandersnatch-accessibility.png");
  await runAdb("pull", "/sdcard/bandersnatch-accessibility.png", screenshot);

  const finalStatus = nodeById(finalNodes, "coupon_status");
  const finalTotal = nodeById(finalNodes, "total");
  const focusableIds = nodes
    .filter(node => node.focusable === "true" && node["resource-id"]?.startsWith(`${fixturePackage}:id/`))
    .map(node => node["resource-id"].split("/").at(-1));
  const focusOrder = focusableIds.filter(id => ["open_cart", "coupon_input", "apply_coupon"].includes(id));
  const namesPassed = openCart["content-desc"] === "Open cart"
    && couponInput["content-desc"] === "Coupon code"
    && applyCoupon["content-desc"] === "Apply coupon";
  const focusPassed = JSON.stringify(focusOrder) === JSON.stringify(["open_cart", "coupon_input", "apply_coupon"]);
  const announcement = "Coupon SAVE10 applied. Discounted cart total ₹1,799";
  const announcementObserved = events.includes("TYPE_ANNOUNCEMENT") && events.includes(announcement);
  const resultVisible = finalStatus?.text === "Coupon SAVE10 applied"
    && finalTotal?.["content-desc"] === "Discounted cart total ₹1,799";
  const artifactRefs = [beforeXmlPath, afterXmlPath, eventsPath, screenshot, rawEvidencePath];
  const evidence = [
    normalizeAccessibilityEvidence({
      platform: "android",
      intent: "find_control",
      status: openCart && couponInput && applyCoupon ? "passed" : "failed",
      role: "multiple",
      artifactRefs,
    }),
    normalizeAccessibilityEvidence({
      platform: "android",
      intent: "assert_accessible_name",
      status: namesPassed ? "passed" : "failed",
      accessibleName: [openCart, couponInput, applyCoupon].map(node => node["content-desc"]).join("; "),
      role: [openCart, couponInput, applyCoupon].map(roleFor).join("; "),
      artifactRefs,
    }),
    normalizeAccessibilityEvidence({
      platform: "android",
      intent: "assert_focus_logical",
      status: focusPassed ? "passed" : "failed",
      focusOrder,
      postActionFocus: finalNodes.find(node => node.focused === "true")?.["resource-id"] ?? null,
      artifactRefs,
    }),
    normalizeAccessibilityEvidence({
      platform: "android",
      intent: "assert_announcement",
      status: announcementObserved && resultVisible ? "passed" : "failed",
      accessibleName: finalStatus?.["content-desc"] ?? null,
      role: roleFor(finalStatus),
      announcement: announcementObserved ? announcement : null,
      announcementProof: announcementObserved ? "programmatic" : "not_observed",
      artifactRefs,
    }),
  ];
  const allAssertionsPassed = evidence.every(item => item.status === "passed");
  const result = {
    platform: "android",
    runner: "adb-uiautomator",
    evidenceMode: "live",
    serial,
    observedOutcome: resultVisible ? "discounted_total_1799_visible" : null,
    interactionMode: "resource-id-derived coordinates",
    evidence,
    completion: classifyAccessibleCompletion({
      executionCompleted: resultVisible,
      allAssertionsPassed,
      criticalEvidenceMissing: !announcementObserved,
      sightedAssistanceUsed: false,
    }),
    evidenceBoundary: {
      programmaticAnnouncementObserved: announcementObserved,
      screenReaderHeard: "not_tested",
    },
    artifacts: { beforeXml: beforeXmlPath, afterXml: afterXmlPath, events: eventsPath, screenshot, rawEvidence: rawEvidencePath },
  };
  await writeFile(rawEvidencePath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}
