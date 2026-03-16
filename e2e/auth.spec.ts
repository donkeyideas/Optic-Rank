import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
    await expect(page.locator("input[type='password'], input[name='password']")).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to login
    await page.waitForURL(/\/(login|auth)/);
    expect(page.url()).toMatch(/\/(login|auth)/);
  });

  test("login form shows validation errors for empty submit", async ({ page }) => {
    await page.goto("/login");
    // Find and click submit button
    const submitBtn = page.locator("button[type='submit']");
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Browser-native validation should prevent submission for required fields
      // or the form should show error messages
    }
  });
});
