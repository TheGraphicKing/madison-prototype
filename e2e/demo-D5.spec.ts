import { expect, test } from "@playwright/test";
import { endShot, startFlow, todayTask, whatsNext } from "./helpers";

// 5 The CCO's view: Today → Known gap count → Coverage by owner → the wire transfers plot →
// Today → the board pack task → approve → the record → replay a run in place → Today.
test("D5 · The CCO's view", async ({ page }) => {
  await startFlow(page, "D5");
  await expect(page.getByText(/this month/).first()).toBeVisible();
  await page.locator('a[href="/coverage/?view=field&state=known_gap"]').click();
  await expect(page).toHaveURL(/state=known_gap/);
  await page.locator('[data-demo~="D5-2"]').getByRole("radio", { name: "Owner" }).click();
  await expect(page.getByRole("list", { name: "Legend" })).toContainText("Margaret Ellison");
  await page.locator('[data-demo~="D5-3"]').click();
  const panel = page.locator("aside").filter({ hasText: "What we're accepting" }).last();
  await expect(panel).toContainText("Accepted by Anthony Marsh");
  await expect(panel).toContainText("31 Dec 2026");
  await expect(panel).toContainText("Owner Margaret Ellison");
  await page.getByRole("link", { name: "Today" }).first().click();
  await todayTask(page, "Approve the Q3 board pack");
  await expect(page).toHaveURL(/\/reports\/board-pack\//);
  await page.locator('[data-demo~="D5-4"]').click();
  await expect(page.getByText("Board pack approved and written to the record.")).toBeVisible();
  await whatsNext(page).getByRole("link", { name: "See it in the record" }).click();
  await expect(page.getByText(/Approved the board pack/).first()).toBeVisible();
  await page.getByRole("radio", { name: "Chain" }).click();
  await page.locator('[data-demo~="D5-5"]').first().click({ force: true });
  await expect(page).toHaveURL(/\/rules\/.*replay=1/);
  await expect(page.getByText("Replay", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Today" }).first().click();
  await expect(page.getByText(/board pack approved/)).toBeVisible();
  await endShot(page, "D5");
});
