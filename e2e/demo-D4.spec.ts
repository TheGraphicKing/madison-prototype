import { expect, test } from "@playwright/test";
import { endShot, startFlow, viewAs, whatsNext } from "./helpers";

// 4 Prepaid and flood: Today → All rule changes → prepaid (doesn't apply) → Today → flood (waiting on Grace)
// → switch to Grace (stays) → Yes → Back to Today → Elena: the flood rule applies.
test("D4 · Madison knows when a rule does not apply", async ({ page }) => {
  await startFlow(page, "D4");
  await page.getByRole("link", { name: "All rule changes" }).click();
  await expect(page).toHaveURL(/\/rules\/$/);
  await page.locator('[data-demo~="D4-1"]').click();
  await expect(page).toHaveURL(/RC-2026-018/);
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Doesn't apply");
  await expect(page.getByText("Prepaid accounts: no").first()).toBeVisible();
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/rules\/$/);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Flood insurance for loans/ }).first().click();
  await expect(page).toHaveURL(/RC-2026-019/);
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Waiting on Grace Liu");
  await viewAs(page, "Grace Liu");
  await expect(page).toHaveURL(/RC-2026-019/);
  const mine = page.getByRole("region", { name: "Your task now" });
  await mine.getByRole("radio", { name: "Yes", exact: true }).click();
  await mine.getByRole("button", { name: "Send answer" }).click();
  await whatsNext(page).getByRole("link", { name: "Back to Today" }).click();
  await viewAs(page, "Elena Petrova");
  await expect(page.getByText(/flood lending fact answered \(Yes\)/)).toBeVisible();
  await page.getByRole("link", { name: /Flood insurance for loans/ }).first().click();
  await expect(page.getByRole("region", { name: "Four answers" })).toContainText("Yes");
  await endShot(page, "D4");
});
