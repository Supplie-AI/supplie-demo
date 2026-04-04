import { expect, type Page } from "@playwright/test";
import {
  DEMO_SCENARIOS,
  evaluateScenarioOutputs,
} from "../fixtures/demo-scenarios.js";

export const DEMO_PASSWORD = "test_password";

type DemoScenario = (typeof DEMO_SCENARIOS)[number];
type DemoPanelId = "ungrounded" | "grounded";

export interface RenderedPanelOutput {
  answerText: string;
  toolNames: string[];
}

export interface RenderedScenarioOutput {
  raw: RenderedPanelOutput;
  grounded: RenderedPanelOutput;
}

export async function authenticate(page: Page, password = DEMO_PASSWORD) {
  await page.goto("/");
  await expect(page.getByTestId("password-gate")).toBeVisible();
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("password-submit").click();
  await expect(page.getByTestId("demo-app")).toBeVisible();
}

export async function clearConversation(page: Page) {
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByTestId("panel-ungrounded")).toContainText(
    "Raw comparison output appears here",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "Grounded tool-backed answers appear here",
  );
}

export async function capturePanelOutput(
  page: Page,
  panelId: DemoPanelId,
): Promise<RenderedPanelOutput> {
  const answerLocator = page
    .locator(`[data-testid^="panel-${panelId}-assistant-text-"]`)
    .last();
  const answerText =
    (await answerLocator.count()) > 0 ? (await answerLocator.textContent()) ?? "" : "";
  const toolNames = await page
    .locator(`[data-testid^="panel-${panelId}-tool-"]`)
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute("data-tool-name") ?? "")
        .filter(Boolean),
    );

  return {
    answerText: answerText.trim(),
    toolNames,
  };
}

export async function captureScenarioOutput(
  page: Page,
): Promise<RenderedScenarioOutput> {
  const [raw, grounded] = await Promise.all([
    capturePanelOutput(page, "ungrounded"),
    capturePanelOutput(page, "grounded"),
  ]);

  return {
    raw,
    grounded,
  };
}

export async function waitForScenarioToRender(page: Page, scenario: DemoScenario) {
  await expect
    .poll(
      async () => {
        const rendered = await captureScenarioOutput(page);
        return evaluateScenarioOutputs(scenario, rendered);
      },
      {
        timeout: 15000,
        intervals: [250, 500, 1000],
      },
    )
    .toMatchObject({
      pass: true,
      raw: { pass: true },
      grounded: { pass: true },
    });
}

export async function runScenario(page: Page, scenario: DemoScenario) {
  await clearConversation(page);
  const promptButton = page.getByRole("button", { name: scenario.prompt });
  await promptButton.scrollIntoViewIfNeeded();
  await promptButton.click();

  await expect(page.getByTestId("panel-ungrounded")).toContainText(scenario.prompt);
  await expect(page.getByTestId("panel-grounded")).toContainText(scenario.prompt);

  await waitForScenarioToRender(page, scenario);

  const rendered = await captureScenarioOutput(page);
  const evaluation = evaluateScenarioOutputs(scenario, rendered);

  expect(evaluation.raw.pass, evaluation.raw.failures.join("; ")).toBe(true);
  expect(evaluation.grounded.pass, evaluation.grounded.failures.join("; ")).toBe(
    true,
  );

  return {
    rendered,
    evaluation,
  };
}
