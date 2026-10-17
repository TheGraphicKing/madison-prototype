import { expect, test } from "@playwright/test";
import { clickDemo, startFlow, endShot } from "./helpers";

// D5 The CCO's view: Today, Coverage by owner, the wire transfers known gap, approve the board pack,
// then the record shows the signature and replays a run in place.
test("D5 · The CCO's view", async ({ page }) => {
  await startFlow(page, "D5");
  await expect(page.getByRole("button", { name: /Viewing as Anthony Marsh/ })).toBeVisible();
  // 1 Today: counts with monthly change and the mini field
  await expect(page.getByText(/this month/).first()).toBeVisible();
  await expect(page.locator('[data-demo~="D5-1"]')).toBeVisible();
  // 2 Coverage, by owner, with a legend of names
  await page.goto("/coverage/?view=field", { waitUntil: "networkidle" });
  await page.locator('[data-demo~="D5-2"]').getByRole("radio", { name: "Owner" }).click();
  await expect(page).toHaveURL(/lens=owner/);
  await expect(page.getByRole("list", { name: "Legend" })).toContainText("Margaret Ellison");
  // 3 the wire transfers plot: the known gap accepted by Anthony until 31 Dec, why, the owner, the consequence
  await clickDemo(page, "D5-3");
  const panel = page.locator("aside").filter({ hasText: "What we're accepting" }).last();
  await expect(panel).toContainText("Accepted by Anthony Marsh");
  await expect(panel).toContainText("31 Dec 2026");
  await expect(panel).toContainText("Owner Margaret Ellison");
  // 4 approve the board pack
  await page.goto("/reports/board-pack/", { waitUntil: "networkidle" });
  await clickDemo(page, "D5-4");
  await expect(page.getByText("Board pack approved and written to the record.")).toBeVisible();
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
  // 5 the record shows the signature, and a run replays in place on its change map
  await page.goto("/record/", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "List" }).click();
  await expect(page.getByText(/Approved the board pack/).first()).toBeVisible();
  await page.getByRole("radio", { name: "Chain" }).click();
  await clickDemo(page, "D5-5");
  await expect(page).toHaveURL(/\/rules\/.*replay=1/);
  await expect(page.getByText("Replay", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await endShot(page, "D5");
});
