import { expect, test } from "@playwright/test";
import { clickDemo, openTask, startFlow, viewAs, endShot } from "./helpers";

// D4 Madison knows when a rule does not apply: prepaid shows Doesn't apply with the deciding fact;
// flood waits on one bank fact, Grace answers Yes, and it applies.
test("D4 · Madison knows when a rule does not apply", async ({ page }) => {
  await startFlow(page, "D4");
  await expect(page).toHaveURL(/\/rules\/$/);
  // 1 prepaid: only the Applies platform, Doesn't apply, the deciding fact, certainty Clear
  await clickDemo(page, "D4-1");
  await expect(page).toHaveURL(/RC-2026-018/);
  const strip = page.getByRole("region", { name: "Four answers" });
  await expect(strip).toContainText("Doesn't apply");
  await expect(page.getByText("Prepaid accounts: no").first()).toBeVisible();
  // 2 flood: waiting on a bank fact from Grace Liu
  await page.goto("/rules/", { waitUntil: "networkidle" });
  await clickDemo(page, "D4-2");
  await expect(page).toHaveURL(/RC-2026-019/);
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Waiting on Grace Liu");
  // 3 Grace answers Yes
  await viewAs(page, "Grace Liu");
  await openTask(page, "D4-3");
  const drawer = page.getByRole("dialog").last();
  await drawer.getByRole("radio", { name: "Yes", exact: true }).click();
  await drawer.locator('[data-demo~="D4-3"]').click();
  // back as Elena: it now applies
  await viewAs(page, "Elena Petrova");
  await page.goto("/rules/RC-2026-019/", { waitUntil: "networkidle" });
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Yes");
  await page.goto("/rules/RC-2026-018/", { waitUntil: "networkidle" });
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Doesn't apply");
  await endShot(page, "D4");
});
