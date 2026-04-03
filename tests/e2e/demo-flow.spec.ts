import { expect, test, type Page } from "@playwright/test";

const DEMO_PASSWORD = "test_password";
const CRITICAL_PROMPT =
  "Which supplier is causing the most margin leakage?";

async function authenticate(page: Page, password = DEMO_PASSWORD) {
  await page.goto("/");
  await expect(page.getByTestId("password-gate")).toBeVisible();
  await page.getByTestId("password-input").fill(password);
  await page.getByTestId("password-submit").click();
  await expect(page.getByTestId("demo-app")).toBeVisible();
}

test("requires the password gate before the demo is shown", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("password-gate")).toBeVisible();
  await expect(page.getByTestId("demo-app")).toHaveCount(0);

  await page.getByTestId("password-input").fill("wrong-password");
  await page.getByTestId("password-submit").click();
  await expect(page.getByTestId("password-error")).toHaveText(
    "Incorrect password",
  );

  await page.getByTestId("password-input").fill(DEMO_PASSWORD);
  await page.getByTestId("password-submit").click();

  await expect(page.getByTestId("demo-app")).toBeVisible();
  await expect(page.getByTestId("panel-ungrounded")).toContainText(
    "Raw comparison output appears here",
  );
  await expect(page.getByTestId("panel-grounded")).toContainText(
    "Grounded tool-backed answers appear here",
  );
});

test("submits a prompt and renders streamed responses in both comparison panels", async ({
  page,
}) => {
  await authenticate(page);

  const ungroundedPanel = page.getByTestId("panel-ungrounded");
  const groundedPanel = page.getByTestId("panel-grounded");

  await page.getByRole("button", { name: CRITICAL_PROMPT }).click();

  await expect(ungroundedPanel).toContainText(CRITICAL_PROMPT);
  await expect(groundedPanel).toContainText(CRITICAL_PROMPT);
  await expect(ungroundedPanel).toContainText("Ungrounded mock response:");
  await expect(groundedPanel).toContainText("Grounded mock response:");
  await expect(groundedPanel).toContainText("query_supplie_snapshot");
  await expect(groundedPanel).toContainText("Suspension King");
});
