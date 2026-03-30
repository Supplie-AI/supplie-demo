import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import OpenAI from "openai";

const DEFAULT_MODEL = process.env.VISUAL_REVIEW_MODEL ?? "gpt-5.4";
const INPUT_DIR = path.resolve(
  process.env.VISUAL_REVIEW_INPUT_DIR ?? "artifacts/visual-review-inputs",
);
const OUTPUT_DIR = path.resolve(
  process.env.VISUAL_REVIEW_OUTPUT_DIR ?? "artifacts/visual-review-output",
);
const RUBRIC_PATH = path.resolve(process.cwd(), "docs/site-prd-demo-plan.md");
const MANIFEST_PATH = path.join(INPUT_DIR, "manifest.json");
const REVIEW_JSON_PATH = path.join(OUTPUT_DIR, "visual-review.json");
const GATE_JSON_PATH = path.join(OUTPUT_DIR, "gate-result.json");
const SUMMARY_MD_PATH = path.join(OUTPUT_DIR, "summary.md");

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "status",
    "summary",
    "score",
    "criteria",
    "screenshots",
    "must_fix",
    "strengths",
  ],
  properties: {
    status: {
      type: "string",
      enum: ["pass", "fail"],
    },
    summary: {
      type: "string",
    },
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
    },
    criteria: {
      type: "array",
      minItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "result", "evidence", "notes"],
        properties: {
          id: {
            type: "string",
            enum: [
              "password_gate_integrity",
              "comparison_layout",
              "truthful_disclosure",
              "grounded_evidence_visibility",
              "readability_and_polish",
            ],
          },
          result: {
            type: "string",
            enum: ["pass", "fail"],
          },
          evidence: {
            type: "string",
          },
          notes: {
            type: "string",
          },
        },
      },
    },
    screenshots: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fileName", "state", "observations"],
        properties: {
          fileName: { type: "string" },
          state: { type: "string" },
          observations: { type: "string" },
        },
      },
    },
    must_fix: {
      type: "array",
      items: { type: "string" },
    },
    strengths: {
      type: "array",
      items: { type: "string" },
    },
  },
};
const REQUIRED_CRITERIA_IDS = new Set([
  "password_gate_integrity",
  "comparison_layout",
  "truthful_disclosure",
  "grounded_evidence_visibility",
  "readability_and_polish",
]);

function dataUrlForImage(buffer, extension) {
  const normalized = extension.toLowerCase();
  const mimeType =
    normalized === ".jpg" || normalized === ".jpeg"
      ? "image/jpeg"
      : normalized === ".webp"
        ? "image/webp"
        : normalized === ".gif"
          ? "image/gif"
          : "image/png";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function normalizeReviewResult(review) {
  const criteria = Array.isArray(review?.criteria) ? review.criteria : [];
  const missingCriteria = [...REQUIRED_CRITERIA_IDS].filter(
    (criterionId) => !criteria.some((criterion) => criterion?.id === criterionId),
  );
  const failedCriteria = criteria.filter((criterion) => criterion.result !== "pass");
  const mustFix = Array.isArray(review?.must_fix)
    ? review.must_fix.filter((item) => typeof item === "string" && item.trim())
    : [];
  const status =
    review?.status === "pass" &&
    failedCriteria.length === 0 &&
    mustFix.length === 0 &&
    missingCriteria.length === 0
      ? "pass"
      : "fail";

  return {
    status,
    summary:
      typeof review?.summary === "string" && review.summary.trim()
        ? review.summary.trim()
        : "Visual review did not return a usable summary.",
    score: Number.isInteger(review?.score) ? review.score : 0,
    criteria,
    screenshots: Array.isArray(review?.screenshots) ? review.screenshots : [],
    must_fix: mustFix,
    strengths: Array.isArray(review?.strengths)
      ? review.strengths.filter(
          (item) => typeof item === "string" && item.trim().length > 0,
        )
      : [],
    failedCriteria: [
      ...failedCriteria,
      ...missingCriteria.map((criterionId) => ({
        id: criterionId,
        result: "fail",
        evidence: "Model response omitted this required criterion.",
        notes: "Gate failed closed because the structured review was incomplete.",
      })),
    ],
  };
}

function renderSummary({ gate, model, manifest }) {
  const criteriaLines = gate.criteria.map(
    (criterion) =>
      `- ${criterion.id}: ${criterion.result.toUpperCase()} | ${criterion.evidence}`,
  );
  const mustFixLines =
    gate.must_fix.length > 0
      ? gate.must_fix.map((item) => `- ${item}`)
      : ["- None."];
  const strengthLines =
    gate.strengths.length > 0
      ? gate.strengths.map((item) => `- ${item}`)
      : ["- None recorded."];
  const screenshotLines = manifest.screenshots.map(
    (screenshot) => `- ${screenshot.fileName}: ${screenshot.description}`,
  );

  return [
    "# GPT-5.4 Visual Review",
    "",
    `- Status: **${gate.status.toUpperCase()}**`,
    `- Score: **${gate.score}/100**`,
    `- Model: \`${model}\``,
    `- Screenshots reviewed: **${manifest.screenshots.length}**`,
    "",
    "## Summary",
    "",
    gate.summary,
    "",
    "## Criteria",
    "",
    ...criteriaLines,
    "",
    "## Strengths",
    "",
    ...strengthLines,
    "",
    "## Required Fixes",
    "",
    ...mustFixLines,
    "",
    "## Screenshot Set",
    "",
    ...screenshotLines,
    "",
  ].join("\n");
}

async function loadInputs() {
  const [rubricRaw, manifestRaw] = await Promise.all([
    fs.readFile(RUBRIC_PATH, "utf8"),
    fs.readFile(MANIFEST_PATH, "utf8"),
  ]);
  const manifest = JSON.parse(manifestRaw);

  if (!Array.isArray(manifest?.screenshots) || manifest.screenshots.length === 0) {
    throw new Error(`No screenshots were listed in ${MANIFEST_PATH}.`);
  }

  const screenshots = await Promise.all(
    manifest.screenshots.map(async (screenshot) => {
      const filePath = path.join(INPUT_DIR, screenshot.path);
      const buffer = await fs.readFile(filePath);

      return {
        ...screenshot,
        filePath,
        dataUrl: dataUrlForImage(buffer, path.extname(filePath)),
      };
    }),
  );

  return {
    rubricRaw,
    manifest,
    screenshots,
  };
}

async function runMockReview({ manifest }) {
  return {
    status: "pass",
    summary:
      "Mock mode confirms the visual-review pipeline wiring and artifact generation path.",
    score: 100,
    criteria: [
      {
        id: "password_gate_integrity",
        result: "pass",
        evidence: "Password gate screenshot is present in the manifest.",
        notes: "Mock mode only.",
      },
      {
        id: "comparison_layout",
        result: "pass",
        evidence: "Authenticated comparison screenshot is present in the manifest.",
        notes: "Mock mode only.",
      },
      {
        id: "truthful_disclosure",
        result: "pass",
        evidence: "Post-auth comparison state was captured for review.",
        notes: "Mock mode only.",
      },
      {
        id: "grounded_evidence_visibility",
        result: "pass",
        evidence: "Post-prompt screenshot is present in the manifest.",
        notes: "Mock mode only.",
      },
      {
        id: "readability_and_polish",
        result: "pass",
        evidence: "All expected screenshots exist.",
        notes: "Mock mode only.",
      },
    ],
    screenshots: manifest.screenshots.map((screenshot) => ({
      fileName: screenshot.fileName,
      state: screenshot.state,
      observations: "Mock review observed the expected screenshot artifact.",
    })),
    must_fix: [],
    strengths: [
      "Artifact generation, manifest writing, and summary rendering all completed.",
    ],
  };
}

async function runOpenAIReview({ rubricRaw, manifest, screenshots }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required for GPT-5.4 visual review. Set VISUAL_REVIEW_MOCK=1 to validate locally without an API call.",
    );
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const userContent = [
    {
      type: "input_text",
      text: [
        "Review the supplied Supplie demo screenshots against the PRD/demo-plan rubric.",
        "Fail the review if any required state or automatic failure condition is violated.",
        "Base the answer only on what is visibly present in the screenshots and the supplied rubric.",
        "",
        "Rubric:",
        rubricRaw,
        "",
        "Screenshot manifest:",
        JSON.stringify(manifest, null, 2),
      ].join("\n"),
    },
  ];

  for (const screenshot of screenshots) {
    userContent.push({
      type: "input_text",
      text: [
        `Screenshot: ${screenshot.fileName}`,
        `State: ${screenshot.state}`,
        `Description: ${screenshot.description}`,
      ].join("\n"),
    });
    userContent.push({
      type: "input_image",
      image_url: screenshot.dataUrl,
    });
  }

  const response = await client.responses.create({
    model: DEFAULT_MODEL,
    store: false,
    max_output_tokens: 2400,
    text: {
      format: {
        type: "json_schema",
        name: "supplie_visual_review",
        schema: REVIEW_SCHEMA,
        strict: true,
      },
    },
    input: [
      {
        role: "developer",
        content: [
          {
            type: "input_text",
            text: [
              "You are a strict CI visual gate reviewer.",
              "Return pass only when every required state and acceptance criterion is satisfied.",
              "If evidence is missing, ambiguous, visually broken, or contradicts the rubric, return fail.",
              "Be concrete and reference the screenshot filenames in your reasoning.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  if (!response.output_text) {
    throw new Error("OpenAI response did not include output_text.");
  }

  return {
    parsed: JSON.parse(response.output_text),
    responseId: response.id,
  };
}

async function writeOutputs({ gate, manifest, rawReview, model }) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const summary = renderSummary({ gate, model, manifest });
  const gateResult = {
    generatedAt: new Date().toISOString(),
    model,
    status: gate.status,
    score: gate.score,
    failedCriteria: gate.failedCriteria.map((criterion) => criterion.id),
    reviewPath: path.relative(OUTPUT_DIR, REVIEW_JSON_PATH),
    summaryPath: path.relative(OUTPUT_DIR, SUMMARY_MD_PATH),
  };

  await Promise.all([
    fs.writeFile(
      REVIEW_JSON_PATH,
      `${JSON.stringify(rawReview, null, 2)}\n`,
      "utf8",
    ),
    fs.writeFile(
      GATE_JSON_PATH,
      `${JSON.stringify(gateResult, null, 2)}\n`,
      "utf8",
    ),
    fs.writeFile(SUMMARY_MD_PATH, summary, "utf8"),
  ]);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }

  console.log(summary);
}

async function writeFailureArtifacts(error) {
  const failureReview = {
    generatedAt: new Date().toISOString(),
    model: DEFAULT_MODEL,
    status: "fail",
    summary: error.message,
    criteria: [],
    screenshots: [],
    must_fix: [error.message],
    strengths: [],
  };
  const gate = normalizeReviewResult(failureReview);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const summary = renderSummary({
    gate,
    model: DEFAULT_MODEL,
    manifest: { screenshots: [] },
  });

  await Promise.all([
    fs.writeFile(
      REVIEW_JSON_PATH,
      `${JSON.stringify(failureReview, null, 2)}\n`,
      "utf8",
    ),
    fs.writeFile(
      GATE_JSON_PATH,
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          model: DEFAULT_MODEL,
          status: "fail",
          score: 0,
          failedCriteria: [],
          error: error.message,
          reviewPath: path.relative(OUTPUT_DIR, REVIEW_JSON_PATH),
          summaryPath: path.relative(OUTPUT_DIR, SUMMARY_MD_PATH),
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
    fs.writeFile(SUMMARY_MD_PATH, summary, "utf8"),
  ]);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, "utf8");
  }

  console.error(summary);
}

async function main() {
  try {
    const inputs = await loadInputs();
    const reviewResponse =
      process.env.VISUAL_REVIEW_MOCK === "1"
        ? { parsed: await runMockReview(inputs), responseId: "mock-review" }
        : await runOpenAIReview(inputs);

    const gate = normalizeReviewResult(reviewResponse.parsed);
    const rawReview = {
      generatedAt: new Date().toISOString(),
      model: DEFAULT_MODEL,
      responseId: reviewResponse.responseId,
      review: reviewResponse.parsed,
      gate: {
        status: gate.status,
        score: gate.score,
        failedCriteria: gate.failedCriteria.map((criterion) => criterion.id),
      },
    };

    await writeOutputs({
      gate,
      manifest: inputs.manifest,
      rawReview,
      model: DEFAULT_MODEL,
    });

    if (gate.status !== "pass") {
      process.exitCode = 1;
    }
  } catch (error) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));
    await writeFailureArtifacts(normalizedError);
    process.exitCode = 1;
  }
}

await main();
