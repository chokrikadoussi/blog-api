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

interface Author {
  id: number;
  email: string;
}

interface CommentResponse {
  id: number;
  content: string;
  author: Author;
  createdAt: string;
  replies?: CommentResponse[];
}

interface CommentsListResponse {
  data: CommentResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

test.describe("Scénario 3 — Comment Flow", () => {
  let token: string;
  let articleId: number;
  let rootCommentId: number;

  test.beforeAll(async ({ request }) => {
    // Register and get JWT
    const regRes = await request.post("/auth/register", {
      data: {
        email: `commenter-${Date.now()}@example.com`,
        password: "password123",
      },
    });
    expect(regRes.status()).toBe(201);
    const { token: t } = (await regRes.json()) as RegisterResponse;
    token = t;

    // Create a published article
    const artRes = await request.post("/articles", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: `Article Commentaires ${Date.now()}`,
        content: "Contenu de l'article pour les tests de commentaires.",
        status: "PUBLISHED",
      },
    });
    expect(artRes.status()).toBe(201);
    const { id } = (await artRes.json()) as ArticleResponse;
    articleId = id;
  });

  test("POST /articles/:id/comments → 201 avec commentaire racine", async ({ request }) => {
    const res = await request.post(`/articles/${articleId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: "Commentaire racine" },
    });

    expect(res.status()).toBe(201);

    const body = (await res.json()) as CommentResponse;
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe("number");
    expect(body.content).toBe("Commentaire racine");
    expect(body.author).toBeDefined();
    expect(body.createdAt).toBeDefined();

    rootCommentId = body.id;
  });

  test("POST /articles/:id/comments avec parentId → 201 (nested)", async ({ request }) => {
    // Ensure rootCommentId is available (depends on previous test order within describe)
    // If rootCommentId is 0/undefined, create root comment first
    if (!rootCommentId) {
      const rootRes = await request.post(`/articles/${articleId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { content: "Commentaire racine (setup)" },
      });
      expect(rootRes.status()).toBe(201);
      const rootBody = (await rootRes.json()) as CommentResponse;
      rootCommentId = rootBody.id;
    }

    const res = await request.post(`/articles/${articleId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        content: "Réponse imbriquée",
        parentId: rootCommentId,
      },
    });

    expect(res.status()).toBe(201);

    const body = (await res.json()) as CommentResponse;
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe("number");
    expect(body.content).toBe("Réponse imbriquée");
    expect(body.author).toBeDefined();
    expect(body.createdAt).toBeDefined();
  });

  test("GET /articles/:id/comments → arbre à 2 niveaux", async ({ request }) => {
    // Ensure we have a root comment with a nested reply
    // Create root comment
    const rootRes = await request.post(`/articles/${articleId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: "Commentaire racine pour arbre" },
    });
    expect(rootRes.status()).toBe(201);
    const rootBody = (await rootRes.json()) as CommentResponse;
    const treeRootId = rootBody.id;

    // Create nested reply
    const replyRes = await request.post(`/articles/${articleId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        content: "Réponse imbriquée pour arbre",
        parentId: treeRootId,
      },
    });
    expect(replyRes.status()).toBe(201);

    // Fetch comment tree
    const res = await request.get(`/articles/${articleId}/comments?page=1&limit=10`);

    expect(res.status()).toBe(200);

    const body = (await res.json()) as CommentsListResponse;

    // Verify structure
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination.total).toBe("number");
    expect(typeof body.pagination.page).toBe("number");
    expect(typeof body.pagination.limit).toBe("number");
    expect(typeof body.pagination.totalPages).toBe("number");

    // Find the root comment we just created
    const rootComment = body.data.find((c) => c.id === treeRootId);
    expect(rootComment).toBeDefined();
    expect(rootComment!.replies).toBeDefined();
    expect(Array.isArray(rootComment!.replies)).toBe(true);
    expect(rootComment!.replies!.length).toBeGreaterThanOrEqual(1);

    // Verify the nested reply is in the replies array
    const nestedReply = rootComment!.replies!.find(
      (r) => r.content === "Réponse imbriquée pour arbre",
    );
    expect(nestedReply).toBeDefined();
  });

  test("POST /articles/:id/comments sur article inexistant → 404", async ({ request }) => {
    const res = await request.post("/articles/999999/comments", {
      headers: { Authorization: `Bearer ${token}` },
      data: { content: "Commentaire sur article inexistant" },
    });

    expect(res.status()).toBe(404);
  });

  test("POST /articles/:id/comments sans authentification → 401", async ({ request }) => {
    const res = await request.post(`/articles/${articleId}/comments`, {
      data: { content: "Commentaire sans auth" },
    });

    expect(res.status()).toBe(401);
  });
});
