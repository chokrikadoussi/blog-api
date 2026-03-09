import { test, expect } from "@playwright/test";

test.describe("Scénario 2 — Create + Read Article", () => {
  let token: string;
  let createdArticleId: number;
  let createdArticleTitle: string;

  test.beforeAll(async ({ request }) => {
    const email = `author-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const res = await request.post("/auth/register", {
      data: { email, password: "password123" },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { token: string };
    token = body.token;

    // Create article in beforeAll so all tests can depend on it
    createdArticleTitle = `Article E2E ${Date.now()}`;
    const artRes = await request.post("/articles", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: createdArticleTitle,
        content: "Contenu de test pour l'article E2E.",
        status: "PUBLISHED",
        tags: [],
      },
    });
    expect(artRes.status()).toBe(201);
    const artBody = (await artRes.json()) as { id: number };
    createdArticleId = artBody.id;
  });

  test("POST /articles → 201 avec champs valides", async ({ request }) => {
    const title = `Article E2E POST ${Date.now()}`;
    const res = await request.post("/articles", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title,
        content: "Contenu de test pour l'article E2E.",
        status: "PUBLISHED",
        tags: [],
      },
    });

    expect(res.status()).toBe(201);

    const body = (await res.json()) as {
      id: number;
      title: string;
      slug: string;
      status: string;
      author: { id: number };
      tags: unknown[];
    };

    expect(typeof body.id).toBe("number");
    expect(typeof body.slug).toBe("string");
    expect(body.slug.length).toBeGreaterThan(0);
    expect(body.status).toBe("PUBLISHED");
    expect(typeof body.author.id).toBe("number");
    expect(Array.isArray(body.tags)).toBe(true);
  });

  test("GET /articles/:id → 200 avec le bon titre", async ({ request }) => {
    const res = await request.get(`/articles/${createdArticleId}`);

    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      id: number;
      title: string;
      slug: string;
      status: string;
      author: { id: number };
      tags: unknown[];
      _count: { likes: number; comments: number };
    };

    expect(body.id).toBe(createdArticleId);
    expect(body.title).toBe(createdArticleTitle);
    expect(typeof body.slug).toBe("string");
    expect(typeof body._count.likes).toBe("number");
  });

  test("GET /articles?search=<titre> → 200 avec l'article dans data", async ({ request }) => {
    const searchTerm = createdArticleTitle.slice(0, 15);

    const res = await request.get(`/articles?search=${encodeURIComponent(searchTerm)}`);

    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      data: { id: number; title: string }[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };

    expect(Array.isArray(body.data)).toBe(true);
    const found = body.data.some((article) => article.id === createdArticleId);
    expect(found).toBe(true);
  });

  test("POST /articles sans auth → 401", async ({ request }) => {
    const res = await request.post("/articles", {
      data: {
        title: "Article sans token",
        content: "Contenu quelconque.",
        status: "PUBLISHED",
      },
    });

    expect(res.status()).toBe(401);
  });

  test("POST /articles avec titre trop court → 400", async ({ request }) => {
    const res = await request.post("/articles", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title: "AB",
        content: "Contenu valide.",
        status: "PUBLISHED",
      },
    });

    expect(res.status()).toBe(400);
  });

  test("GET /articles avec pagination → 200 avec pagination", async ({ request }) => {
    const res = await request.get("/articles?page=1&limit=10");

    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      data: unknown[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };

    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.pagination).toBe("object");
    expect(typeof body.pagination.total).toBe("number");
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
    expect(typeof body.pagination.totalPages).toBe("number");
  });
});
