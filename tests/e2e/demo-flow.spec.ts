import { expect, test } from "@playwright/test";
import { DEMO_SCENARIOS } from "../fixtures/demo-scenarios.js";
import { authenticate, runScenario } from "./demo-review-helpers";

test("requires the password gate before the demo is shown", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("password-gate")).toBeVisible();
  await expect(page.getByTestId("demo-app")).toHaveCount(0);

  await page.getByTestId("password-input").fill("wrong-password");
  await page.getByTestId("password-submit").click();
  await expect(page.getByTestId("password-error")).toHaveText(
    "Incorrect password",
  );

  await page.getByTestId("password-input").fill("test_password");
  await page.getByTestId("password-submit").click();

  await expect(page.getByTestId("demo-app")).toBeVisible();
  await expect(page.getByTestId("panel-ungrounded")).toContainText(
    "Raw comparison output appears here",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "Grounded tool-backed answers appear here",
  );
});

for (const scenario of DEMO_SCENARIOS) {
  test(`renders authoritative raw and grounded answers for ${scenario.id}`, async ({
    page,
  }) => {
    await authenticate(page);
    await runScenario(page, scenario);
  });
}
