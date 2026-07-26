export const ACCESSIBILITY_INTENTS = Object.freeze([
  "find_control",
  "assert_accessible_name",
  "assert_focus_logical",
  "assert_announcement",
]);

export const COMPLETION_CLASSIFICATIONS = Object.freeze([
  "independent",
  "assisted",
  "blocked",
]);

export function normalizeAccessibilityEvidence({
  platform,
  intent,
  status,
  accessibleName = null,
  role = null,
  state = null,
  focusOrder = [],
  postActionFocus = null,
  announcement = null,
  announcementProof = "not_observed",
  artifactRefs = [],
}) {
  if (!["android", "web"].includes(platform)) throw new Error("Accessibility evidence requires android or web.");
  if (!ACCESSIBILITY_INTENTS.includes(intent)) throw new Error(`Unsupported accessibility intent: ${intent}.`);
  if (!["passed", "failed", "missing"].includes(status)) throw new Error("Evidence status must be passed, failed, or missing.");
  if (!["not_observed", "programmatic", "screen_reader_heard"].includes(announcementProof)) {
    throw new Error("Announcement proof must distinguish programmatic evidence from screen-reader confirmation.");
  }

  return {
    version: "1.0",
    platform,
    intent,
    status,
    accessibleName,
    role,
    state,
    focusOrder: [...focusOrder],
    postActionFocus,
    announcement,
    announcementProof,
    artifactRefs: [...artifactRefs],
  };
}

export function classifyAccessibleCompletion({
  executionCompleted,
  criticalEvidenceMissing = false,
  sightedAssistanceUsed = false,
  allAssertionsPassed = false,
}) {
  if (!executionCompleted || criticalEvidenceMissing) return "blocked";
  if (sightedAssistanceUsed || !allAssertionsPassed) return "assisted";
  return "independent";
}

const HINDI_VERDICTS = Object.freeze({
  consistent: "एंड्रॉइड और वेब, दोनों पर कूपन यात्रा का सुलभ परिणाम एक जैसा है।",
  inconsistent: "एंड्रॉइड और वेब पर कूपन यात्रा का सुलभ परिणाम अलग है। रिपोर्ट में पहला अंतर देखें।",
  incomparable: "पर्याप्त सुलभ प्रमाण नहीं मिला, इसलिए दोनों प्लेटफ़ॉर्म की तुलना नहीं की जा सकती।",
});

const HINDI_COMPLETION = Object.freeze({
  independent: "यह यात्रा बिना किसी देख सकने वाले व्यक्ति की सहायता के पूरी हुई।",
  assisted: "यह यात्रा पूरी हुई, लेकिन सहायता या अधूरे सुलभ प्रमाण की आवश्यकता पड़ी।",
  blocked: "यह यात्रा आवश्यक सुलभ प्रमाण के बिना पूरी नहीं हो सकी।",
});

export function hindiSpokenVerdict({ verdict, completion }) {
  if (!(verdict in HINDI_VERDICTS)) throw new Error(`Unsupported comparison verdict: ${verdict}.`);
  if (!COMPLETION_CLASSIFICATIONS.includes(completion)) {
    throw new Error(`Unsupported completion classification: ${completion}.`);
  }
  return `${HINDI_VERDICTS[verdict]} ${HINDI_COMPLETION[completion]}`;
}
