import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const DEMO_PASSWORD = "test_password";
const CRITICAL_PROMPT =
  "Which supplier is causing the most margin leakage?";
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

async function authenticate(page: Page, password = DEMO_PASSWORD) {
  await page.goto("/");
  await expect(page.getByTestId("password-gate")).toBeVisible();
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("password-submit").click();
  await expect(page.getByTestId("demo-app")).toBeVisible();
}

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

test("captures deterministic screenshots for PRD-based visual review", async ({
  page,
}) => {
  await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  await page.emulateMedia({ reducedMotion: "reduce" });
  const screenshots: VisualReviewScreenshot[] = [];

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
  await expect(page.getByTestId("panel-ungrounded")).toContainText(
    "Raw comparison output appears here",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "Grounded tool-backed answers appear here",
  );
  screenshots.push(
    await captureScreenshot(
      page,
      "02-authenticated-comparison.png",
      "authenticated-comparison",
      "Authenticated desktop comparison view with the top bar, prompt buttons, explainer, and both side-by-side panels in their empty states.",
    ),
  );

  await page.getByRole("button", { name: CRITICAL_PROMPT }).click();
  await expect(page.getByTestId("panel-ungrounded")).toContainText(
    "Ungrounded mock response:",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "Grounded mock response:",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "openai_file_search",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "annona_query_supplier_margin_leakage_snapshot",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "Atlas Springs",
  );
  screenshots.push(
    await captureScreenshot(
      page,
      "03-post-prompt-grounded-response.png",
      "post-prompt-response",
      "Both panels show the same user prompt; the grounded panel also shows shared native tool evidence, an Annona grounded tool call, and the Atlas Springs finding.",
    ),
  );

  await fs.writeFile(
    MANIFEST_PATH,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        rubricPath: "docs/site-prd-demo-plan.md",
        screenshots,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});
