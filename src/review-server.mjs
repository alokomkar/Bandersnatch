import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { approvePlan, validatePlan } from "./contracts.mjs";
import { comparePlatformResults } from "./comparator.mjs";
import { createPlatformRunners } from "./adapters/platforms.mjs";
import { runWebPlanWithPlaywright } from "./adapters/playwright-web.mjs";
import { transcribeWithSarvam } from "./adapters/sarvam.mjs";
import { loadLocalEnv } from "./env.mjs";
import { reviewTranscript } from "./review.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".wav", ".ogg", ".webm"]);

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

async function readBody(request, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  const body = await readBody(request);
  return JSON.parse(body.toString("utf8") || "{}");
}

async function serveFile(response, path, contentType) {
  const body = await readFile(resolve(ROOT, path));
  response.writeHead(200, { "content-type": contentType });
  response.end(body);
}

export function createReviewServer({ webRunner = runWebPlanWithPlaywright } = {}) {
  return createServer(async (request, response) => {
    try {
      if (request.method === "GET" && (request.url === "/" || request.url === "/review.html")) {
        return await serveFile(response, "review.html", "text/html; charset=utf-8");
      }

      if (request.method === "POST" && request.url === "/api/transcribe") {
        await loadLocalEnv(resolve(ROOT, ".env.local"));
        const extension = String(request.headers["x-audio-extension"] ?? ".webm").toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(extension)) return json(response, 415, { error: "Use WAV, OGG, or WebM audio." });
        const audio = await readBody(request, MAX_AUDIO_BYTES);
        if (!audio.length) return json(response, 400, { error: "Audio is empty." });
        const temporaryPath = resolve(tmpdir(), `bandersnatch-${randomUUID()}${extension}`);
        try {
          await writeFile(temporaryPath, audio);
          const transcription = await transcribeWithSarvam({ audioPath: temporaryPath });
          return json(response, 200, transcription);
        } finally {
          await rm(temporaryPath, { force: true });
        }
      }

      if (request.method === "POST" && request.url === "/api/review") {
        const { transcription, correctedTranscript } = await readJson(request);
        return json(response, 200, reviewTranscript(transcription, correctedTranscript));
      }

      if (request.method === "POST" && request.url === "/api/approve-run") {
        const { review, webMode = "mismatch" } = await readJson(request);
        if (review?.status !== "ready_for_approval" || !review.plan) {
          return json(response, 409, { error: "Resolve transcript errors before approval." });
        }
        const plan = validatePlan(approvePlan(review.plan));
        const outputDir = resolve(ROOT, "artifacts", `review-${Date.now()}`);
        await mkdir(outputDir, { recursive: true });
        const runners = createPlatformRunners({ outputDir, seedWebMismatch: false });
        const [android, web] = await Promise.all([
          runners.android(plan),
          webRunner(plan, { outputDir, mode: webMode }),
        ]);
        return json(response, 200, {
          plan,
          android,
          web,
          comparison: comparePlatformResults(android, web),
        });
      }

      json(response, 404, { error: "Not found." });
    } catch (error) {
      json(response, 500, { error: error.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4174);
  createReviewServer().listen(port, "127.0.0.1", () => {
    console.log(`Bandersnatch review surface: http://127.0.0.1:${port}`);
  });
}
