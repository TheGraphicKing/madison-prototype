import { expect, test } from "@playwright/test";
import { endShot, fast, startFlow, todayTask, viewAs, whatsNext } from "./helpers";

// 3 MFA fix: Today → Choose a fix → D6 waits on Priya → switch to Priya (stays, Your task now) →
// Anthony signs (stays) → back as Elena: Today, then Coverage and Nadia's reviews.
test("D2 · Close a gap with a new control", async ({ page }) => {
  await startFlow(page, "D2");
  await todayTask(page, "Choose a fix for the MFA gap");
  await expect(page).toHaveURL(/\/rules\/RC-2026-011\//);
  await page.getByRole("region", { name: "Your task now" }).getByRole("button", { name: "Choose a fix" }).click();
  await fast(page);
  await expect(page.getByText("Waiting on Priya Raman").first()).toBeVisible({ timeout: 120_000 });
  // Priya: her task is on this page, so the page stays and shows it
  await viewAs(page, "Priya Raman");
  await expect(page).toHaveURL(/\/rules\/RC-2026-011\//);
  const mine = page.getByRole("region", { name: "Your task now" });
  await mine.getByRole("radio", { name: "Yes, but it is vaulted and needs two officers" }).click();
  await mine.getByRole("button", { name: "Send answer" }).click();
  // Anthony signs off, on the same page
  await viewAs(page, "Anthony Marsh");
  await expect(page).toHaveURL(/\/rules\/RC-2026-011\//);
  const his = page.getByRole("region", { name: "Your task now" });
  await his.getByRole("radio", { name: "Approve", exact: true }).click();
  await his.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText("CTL-153 is in force").first()).toBeVisible();
  // Elena has nothing here, so she lands on her Today
  await viewAs(page, "Elena Petrova");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/CTL-153 in force/)).toBeVisible();
  await page.goto("/rules/RC-2026-011/", { waitUntil: "networkidle" });
  const next = whatsNext(page);
  await expect(next).toContainText("CTL-153 is in force");
  await next.getByRole("button", { name: "Nadia's vendor reviews" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('#needs-you li[data-task^="T-30"]')).toHaveCount(3);
  await endShot(page, "D2");
});
