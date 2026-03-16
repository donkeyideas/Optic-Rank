import { test, expect } from "@playwright/test";

test.describe("Public API v1", () => {
  const API_BASE = "/api/v1";

  test("projects endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("keywords endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/keywords`);
    expect(response.status()).toBe(401);
  });

  test("backlinks endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/backlinks?project_id=test`);
    expect(response.status()).toBe(401);
  });

  test("predictions endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/predictions?project_id=test`);
    expect(response.status()).toBe(401);
  });

  test("entities endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/entities?project_id=test`);
    expect(response.status()).toBe(401);
  });

  test("visibility endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/visibility?project_id=test`);
    expect(response.status()).toBe(401);
  });

  test("audit endpoint returns 401 without auth", async ({ request }) => {
    const response = await request.get(`${API_BASE}/audit?project_id=test`);
    expect(response.status()).toBe(401);
  });

  test("invalid API key returns 401", async ({ request }) => {
    const response = await request.get(`${API_BASE}/projects`, {
      headers: { Authorization: "Bearer rp_invalid_key_12345" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Invalid");
  });

  test("stripe webhook rejects unsigned requests", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: "test",
      headers: { "Content-Type": "text/plain" },
    });
    expect(response.status()).toBe(400);
  });

  test("cron endpoint requires auth", async ({ request }) => {
    const response = await request.get("/api/cron/send-reports");
    expect(response.status()).toBe(401);
  });
});
