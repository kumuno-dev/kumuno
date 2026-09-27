import { expect, test } from "@playwright/test";

test("日本語のトップページをPC・スマートフォンで表示できる", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Oshigoto Kit | 社内システムを、AIと作る。");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("社内システムを、AIと作る。");
  await expect(page.getByRole("main")).toContainText("現在、開発基盤を準備しています。");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test("存在しないURLは404になり、トップページへ戻れる", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
  await page.getByRole("link", { name: "トップページへ戻る" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("社内システムを、AIと作る。");
});
