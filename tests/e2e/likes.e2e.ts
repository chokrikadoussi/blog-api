import { test, expect } from "@playwright/test";

const uniqueEmail = () =>
  `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

test.describe.serial("Scénario 4 — Like Toggle", () => {
  let tokenA: string;
  let tokenB: string;
  let articleId: number;

  test.beforeAll(async ({ request }) => {
    // Register user A
    const resA = await request.post("/auth/register", {
      data: { email: uniqueEmail(), password: "Password123!" },
    });
    expect(resA.status()).toBe(201);
    const bodyA: { token: string } = await resA.json();
    tokenA = bodyA.token;

    // Register user B
    const resB = await request.post("/auth/register", {
      data: { email: uniqueEmail(), password: "Password123!" },
    });
    expect(resB.status()).toBe(201);
    const bodyB: { token: string } = await resB.json();
    tokenB = bodyB.token;

    // Create article as user A
    const resArticle = await request.post("/articles", {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: `E2E Like Test Article ${Date.now()}`,
        content: "Content for like toggle e2e test.",
        status: "PUBLISHED",
      },
    });
    expect(resArticle.status()).toBe(201);
    const bodyArticle: { id: number } = await resArticle.json();
    articleId = bodyArticle.id;
  });

  test("POST /articles/:id/like → liked: true, likesCount: 1", async ({ request }) => {
    const res = await request.post(`/articles/${articleId}/like`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(res.status()).toBe(200);

    const body: { liked: boolean; likesCount: number } = await res.json();
    expect(body.liked).toBe(true);
    expect(body.likesCount).toBe(1);
  });

  test("POST /articles/:id/like (double) → liked: false, likesCount: 0", async ({ request }) => {
    const res = await request.post(`/articles/${articleId}/like`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(res.status()).toBe(200);

    const body: { liked: boolean; likesCount: number } = await res.json();
    expect(body.liked).toBe(false);
    expect(body.likesCount).toBe(0);
  });

  test("Multi-utilisateurs : likesCount cohérent", async ({ request }) => {
    // User B likes the article → likesCount should be 1
    const resB = await request.post(`/articles/${articleId}/like`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(resB.status()).toBe(200);

    const bodyB: { liked: boolean; likesCount: number } = await resB.json();
    expect(bodyB.liked).toBe(true);
    expect(bodyB.likesCount).toBe(1);

    // User A likes the article again → both users liked, likesCount should be 2
    const resA = await request.post(`/articles/${articleId}/like`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(resA.status()).toBe(200);

    const bodyA: { liked: boolean; likesCount: number } = await resA.json();
    expect(bodyA.liked).toBe(true);
    expect(bodyA.likesCount).toBe(2);
  });

  test("POST /articles/:id/like sans auth → 401", async ({ request }) => {
    const res = await request.post(`/articles/${articleId}/like`);

    expect(res.status()).toBe(401);
  });

  test("POST /articles/9999/like → 404", async ({ request }) => {
    const res = await request.post("/articles/9999/like", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(res.status()).toBe(404);
  });
});
