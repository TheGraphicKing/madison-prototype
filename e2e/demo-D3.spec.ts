import { expect, test } from "@playwright/test";
import { clickDemo, fast, openTask, startFlow, viewAs, endShot } from "./helpers";

// D3 A handoff that unblocks a change: Check coverage, Link and raise the drift, Grace updates the
// procedure, and back as Elena the obligation is covered and the change is unblocked.
test("D3 · A handoff that unblocks a change", async ({ page }) => {
  await startFlow(page, "D3");
  await expect(page).toHaveURL(/\/rules\/RC-2026-016\//);
  // 1 Check coverage plays in place
  await clickDemo(page, "D3-1");
  await fast(page);
  // 2 Link and raise the drift
  const raise = page.locator('[data-demo~="D3-2"]');
  await raise.waitFor({ timeout: 120_000 });
  await raise.click();
  await expect(page.getByText("Waiting on Grace Liu").first()).toBeVisible({ timeout: 60_000 });
  // 3 Grace sees the task from Elena
  await viewAs(page, "Grace Liu");
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByText("Align the Loan Estimate procedure with the policy").first()).toBeVisible();
  // 4 she fills the wording and the date, and updates the procedure
  await openTask(page, "D3-4");
  const drawer = page.getByRole("dialog").last();
  await drawer.locator("textarea").first().fill("Issue the revised Loan Estimate within 3 business days of the changed circumstance.");
  await drawer.locator('input[type="date"]').fill("2026-10-30");
  await drawer.locator('[data-demo~="D3-4"]').click();
  // 5 back as Elena: Grace responded, the obligation is covered, the change is unblocked
  await viewAs(page, "Elena Petrova");
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.getByText("Grace Liu responded")).toBeVisible();
  await page.goto("/obligations/D-1026-L2/", { waitUntil: "networkidle" });
  await expect(page.getByText("Covered").first()).toBeVisible();
  await page.goto("/rules/RC-2026-016/", { waitUntil: "networkidle" });
  await expect(page.getByText("Waiting on Grace Liu")).toHaveCount(0);
  await endShot(page, "D3");
});
