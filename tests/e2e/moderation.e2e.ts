import { test, expect } from "@playwright/test";

interface RegisterResponse {
  token: string;
}

interface ArticleResponse {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: string;
}

interface CommentResponse {
  id: number;
  content: string;
  author: {
    id: number;
    email: string;
  };
  createdAt: string;
}

test.describe("Scénario 5 — Modération / RBAC", () => {
  let tokenA: string;
  let tokenB: string;
  let articleId: number;
  let commentIdForForbiddenTest: number;
  let commentIdForDeleteTest: number;

  test.beforeAll(async ({ request }) => {
    // Register user A
    const regResA = await request.post("/auth/register", {
      data: {
        email: `author-a-${Date.now()}@example.com`,
        password: "password123",
      },
    });
    expect(regResA.status()).toBe(201);
    const { token: tA } = (await regResA.json()) as RegisterResponse;
    tokenA = tA;

    // Register user B
    const regResB = await request.post("/auth/register", {
      data: {
        email: `author-b-${Date.now() + 1}@example.com`,
        password: "password123",
      },
    });
    expect(regResB.status()).toBe(201);
    const { token: tB } = (await regResB.json()) as RegisterResponse;
    tokenB = tB;

    // User A creates a PUBLISHED article
    const artRes = await request.post("/articles", {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: `Article Modération ${Date.now()}`,
        content: "Contenu de l'article pour les tests de modération RBAC.",
        status: "PUBLISHED",
      },
    });
    expect(artRes.status()).toBe(201);
    const { id } = (await artRes.json()) as ArticleResponse;
    articleId = id;

    // User A creates first comment (used for the 403 test — B tries to delete it)
    const commentResA = await request.post(`/articles/${articleId}/comments`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { content: "Commentaire de A — test interdiction suppression par B" },
    });
    expect(commentResA.status()).toBe(201);
    const commentA = (await commentResA.json()) as CommentResponse;
    commentIdForForbiddenTest = commentA.id;

    // User A creates second comment (used for the 204 test — A deletes their own)
    const commentResA2 = await request.post(`/articles/${articleId}/comments`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { content: "Commentaire de A — test suppression par le propriétaire" },
    });
    expect(commentResA2.status()).toBe(201);
    const commentA2 = (await commentResA2.json()) as CommentResponse;
    commentIdForDeleteTest = commentA2.id;
  });

  test("PATCH /articles/:id par un autre AUTHOR → 403", async ({ request }) => {
    const res = await request.patch(`/articles/${articleId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { title: "Titre modifié par B (interdit)" },
    });

    expect(res.status()).toBe(403);
  });

  test("PATCH /articles/:id par le propriétaire → 200", async ({ request }) => {
    const res = await request.patch(`/articles/${articleId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { title: "Titre modifié par A (autorisé)" },
    });

    expect(res.status()).toBe(200);

    const body = (await res.json()) as ArticleResponse;
    expect(body.id).toBe(articleId);
    expect(body.title).toBe("Titre modifié par A (autorisé)");
  });

  test("DELETE /comments/:id par un autre AUTHOR → 403", async ({ request }) => {
    const res = await request.delete(`/comments/${commentIdForForbiddenTest}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    expect(res.status()).toBe(403);
  });

  test("DELETE /comments/:id par le propriétaire → 204", async ({ request }) => {
    const res = await request.delete(`/comments/${commentIdForDeleteTest}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(res.status()).toBe(204);
  });

  test("PATCH /articles/9999 → 404", async ({ request }) => {
    const res = await request.patch("/articles/9999", {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: { title: "Titre pour article inexistant" },
    });

    expect(res.status()).toBe(404);
  });

  test("DELETE /comments/9999 → 404", async ({ request }) => {
    const res = await request.delete("/comments/9999", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    expect(res.status()).toBe(404);
  });
});
