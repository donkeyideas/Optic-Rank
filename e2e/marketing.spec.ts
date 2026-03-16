import { test, expect } from "@playwright/test";

test.describe("Marketing Pages", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/RankPulse|Optic Rank|SEO/i);
  });

  test("pricing page renders all tiers", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // Check for the 4 pricing tiers
    await expect(page.getByText("Free")).toBeVisible();
    await expect(page.getByText("Starter")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Business")).toBeVisible();
  });

  test("features page loads", async ({ page }) => {
    await page.goto("/features");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("navigation links are functional", async ({ page }) => {
    await page.goto("/");
    // Check for login link
    const loginLink = page.locator("a[href='/login'], a[href*='login']");
    if (await loginLink.first().isVisible()) {
      await loginLink.first().click();
      await expect(page).toHaveURL(/login/);
    }
  });
});
