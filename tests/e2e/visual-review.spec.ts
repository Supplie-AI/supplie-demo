import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DEMO_SCENARIOS } from "../fixtures/demo-scenarios.js";
import {
  authenticate,
  runScenario,
  type RenderedScenarioOutput,
} from "./demo-review-helpers";

const OUTPUT_ROOT = path.join(
  process.cwd(),
  "artifacts",
  "visual-review-inputs",
);
const SCREENSHOT_DIR = path.join(OUTPUT_ROOT, "screenshots");
const MANIFEST_PATH = path.join(OUTPUT_ROOT, "manifest.json");

interface VisualReviewScreenshot {
  fileName: string;
  path: string;
  state: string;
  description: string;
  viewport: {
    width: number;
    height: number;
  };
}

test.use({
  viewport: { width: 1440, height: 1200 },
});

async function captureScreenshot(
  page: Page,
  fileName: string,
  state: string,
  description: string,
): Promise<VisualReviewScreenshot> {
  const filePath = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({
    path: filePath,
    fullPage: true,
    animations: "disabled",
  });

  return {
    fileName,
    path: path.posix.join("screenshots", fileName),
    state,
    description,
    viewport: { width: 1440, height: 1200 },
  };
}

test("captures deterministic screenshots and rendered answers for visual review", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  const screenshots: VisualReviewScreenshot[] = [];
  const scenarioReviews: Array<{
    scenarioId: string;
    prompt: string;
    sharedBundleAnswerable: boolean;
    screenshot: string;
    raw: RenderedScenarioOutput["raw"];
    grounded: RenderedScenarioOutput["grounded"];
  }> = [];

  await page.goto("/");
  await expect(page.getByTestId("password-gate")).toBeVisible();
  screenshots.push(
    await captureScreenshot(
      page,
      "01-password-gate.png",
      "locked-entry",
      "Password gate is visible before authentication and blocks access to the protected demo UI.",
    ),
  );

  await authenticate(page);
  await expect(page.getByText("Live Comparison")).toBeVisible();
  screenshots.push(
    await captureScreenshot(
      page,
      "02-authenticated-comparison.png",
      "authenticated-comparison",
      "Authenticated comparison view with the top bar, prompt buttons, explainer, and both empty comparison panels.",
    ),
  );

  let scenarioNumber = 3;
  for (const scenario of DEMO_SCENARIOS) {
    const { rendered } = await runScenario(page, scenario);
    const fileName = `${String(scenarioNumber).padStart(2, "0")}-${scenario.id}.png`;

    screenshots.push(
      await captureScreenshot(
        page,
        fileName,
        `scenario-${scenario.id}`,
        `Rendered raw and grounded answers for the "${scenario.prompt}" demo scenario.`,
      ),
    );

    scenarioReviews.push({
      scenarioId: scenario.id,
      prompt: scenario.prompt,
      sharedBundleAnswerable: scenario.sharedBundleAnswerable,
      screenshot: fileName,
      raw: rendered.raw,
      grounded: rendered.grounded,
    });

    scenarioNumber += 1;
  }

  await fs.writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rubricPath: "docs/site-prd-demo-plan.md",
        screenshots,
        scenarioReviews,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});
