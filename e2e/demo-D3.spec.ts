import { expect, test } from "@playwright/test";
import { endShot, fast, startFlow, todayTask, viewAs, whatsNext } from "./helpers";

// 2 Loan Estimate handoff: Today → Check coverage → Link and raise → switch to Grace (stays) →
// Update the procedure → Back to Today → switch to Elena: "Grace Liu responded" at the top.
test("D3 · A handoff that unblocks a change", async ({ page }) => {
  await startFlow(page, "D3");
  await todayTask(page, "Confirm 2 proposed links for revised Loan Estimates");
  await expect(page).toHaveURL(/\/rules\/RC-2026-016\//);
  await page.getByRole("region", { name: "Your task now" }).getByRole("button", { name: "Check coverage" }).click();
  await fast(page);
  const raise = page.locator('[data-demo~="D3-2"]');
  await raise.waitFor({ timeout: 120_000 });
  await raise.click();
  await expect(page.getByText("Waiting on Grace Liu").first()).toBeVisible({ timeout: 60_000 });
  await viewAs(page, "Grace Liu");
  await expect(page).toHaveURL(/\/rules\/RC-2026-016\//);
  const mine = page.getByRole("region", { name: "Your task now" });
  await mine.locator("textarea").first().fill("Issue the revised Loan Estimate within 3 business days of the changed circumstance.");
  await mine.locator('input[type="date"]').fill("2026-10-30");
  await mine.getByRole("button", { name: "Update the procedure" }).click();
  await expect(page.getByText("Updated the procedure").first()).toBeVisible();
  await whatsNext(page).getByRole("link", { name: "Back to Today" }).click();
  await expect(page).toHaveURL(/\/$/);
  await viewAs(page, "Elena Petrova");
  await expect(page.locator("#needs-you")).toContainText("Grace Liu responded");
  await expect(page.getByText(/1 procedure updated/)).toBeVisible();
  await page.goto("/obligations/D-1026-L2/", { waitUntil: "networkidle" });
  await expect(page.getByText("Covered").first()).toBeVisible();
  await page.goto("/rules/RC-2026-016/", { waitUntil: "networkidle" });
  await expect(page.getByText("Waiting on Grace Liu")).toHaveCount(0);
  await endShot(page, "D3");
});
