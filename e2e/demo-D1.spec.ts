import { expect, test } from "@playwright/test";
import { clickDemo, endShot, fast, startFlow, todayTask, whatsNext } from "./helpers";

// 1 Reg E run: Today → the task → run in place → accept → What's next → Coverage → Margaret's task → Today.
test("D1 · A new rule lands", async ({ page }) => {
  await startFlow(page, "D1");
  await todayTask(page, "Accept the obligations found in 12 CFR 1005.11(c)");
  await expect(page).toHaveURL(/\/rules\/RC-2026-014\//);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Today");
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Not checked yet");
  await page.getByRole("region", { name: "Your task now" }).getByRole("button", { name: "Run Madison on this rule" }).click();
  await fast(page);
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await clickDemo(page, "D1-3");
  await expect(page.getByRole("region", { name: "Obligations detail" })).toBeVisible();
  const accept = page.locator('[data-demo~="D1-5"]');
  await accept.waitFor({ timeout: 120_000 });
  await accept.click();
  const strip = page.getByRole("region", { name: "Four answers" });
  await expect(strip).toContainText("4 of 6", { timeout: 120_000 });
  await expect(strip).toContainText("Margaret Ellison");
  // the story ends with what's next
  const next = whatsNext(page);
  await expect(next).toBeVisible();
  await next.getByRole("link", { name: "See it in Coverage" }).click();
  await expect(page).toHaveURL(/\/coverage\/.*plot=reg-01/);
  const panel = page.locator("aside").filter({ hasText: "What isn't covered" }).last();
  await expect(panel).toContainText("Provisionally credit the customer within 5 business days");
  await expect(panel).toContainText("Nothing behind it");
  // back to the change room, then Margaret's new task on her Today
  await page.goBack();
  await whatsNext(page).getByRole("button", { name: "Margaret's new task" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Margaret");
  await expect(page.locator('li[data-task="T-290"]')).toBeVisible();
  // Today reflects it: since you last looked
  await expect(page.getByText(/6 obligations accepted · 1 gap found/)).toBeVisible();
  await endShot(page, "D1");
});
