import { expect, type Page } from "@playwright/test";

/** Start a flow the way a presenter does: the Demos panel, then "Start this demo". */
export async function startFlow(page: Page, id: string) {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("d");
  await page.locator(`[data-flow="${id}"]`).click({ noWaitAfter: true });
  await expect(page.getByRole("dialog", { name: "Demo guide" })).toBeVisible();
}

/** Switch persona through the "Viewing as" menu in the header. */
export async function viewAs(page: Page, name: string) {
  // close the task drawer first: while it is open the rest of the page is inert
  for (let i = 0; i < 2 && (await page.locator('[role="dialog"][data-open], [role="dialog"]:not([aria-label="Demo guide"])').count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
  await page.getByRole("button", { name: /^Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name: new RegExp(name) }).or(page.getByRole("option", { name: new RegExp(name) })).first().click();
  await expect(page.getByRole("button", { name: new RegExp(`Viewing as ${name}`) })).toBeVisible();
}

/** Scene labels drift with the camera, so clicks on them skip the stability wait. */
export async function clickDemo(page: Page, key: string) {
  const el = page.locator(`[data-demo~="${key}"]`).filter({ visible: true }).first();
  await el.waitFor({ state: "visible" });
  try {
    await el.click({ timeout: 4000 });
  } catch {
    await el.scrollIntoViewIfNeeded();
    await el.click({ force: true });
  }
}

export async function fast(page: Page) {
  const r = page.getByRole("radio", { name: "4×" });
  await r.first().waitFor();
  await r.first().click();
}

/** Open the persona's task in the drawer from My tasks. */
export async function openTask(page: Page, demoKey: string) {
  await page.goto("/tasks/", { waitUntil: "networkidle" });
  await page.locator(`li[data-demo~="${demoKey}"] [role="button"]`).first().click();
  await expect(page.getByRole("dialog").last()).toBeVisible();
}

/** The guide's Next: waits until the step's action has happened, then moves on. */
export async function advance(page: Page) {
  const guide = page.getByRole("dialog", { name: "Demo guide" });
  const next = guide.getByRole("button", { name: /^(Next|Finish)$/ });
  await expect(next).toBeEnabled({ timeout: 120_000 });
  await next.click();
}

/** The guide is optional: leave it and carry on by hand. */
export async function exitGuide(page: Page) {
  await page.getByRole("dialog", { name: "Demo guide" }).getByRole("button", { name: "Exit" }).click();
  await expect(page.getByRole("dialog", { name: "Demo guide" })).toHaveCount(0);
}
