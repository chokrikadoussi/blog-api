import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateToken } from "../helpers/auth.js";
import { resetDb, createUser, createArticle } from "../helpers/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// ---------------------------------------------------------------------------
// POST /articles
// ---------------------------------------------------------------------------

describe("POST /articles", () => {
  it("should create article as AUTHOR → 201", async () => {
    const user = await createUser("AUTHOR");
    const token = generateToken(user.id, "AUTHOR");

    const res = await request(app)
      .post("/articles")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Mon premier article", content: "Contenu de test", status: "PUBLISHED" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe("Mon premier article");
    expect(res.body.status).toBe("PUBLISHED");
    expect(res.body.author).toHaveProperty("id", user.id);
  });

  it("should return 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post("/articles")
      .send({ title: "Article sans auth", content: "Contenu", status: "PUBLISHED" });

    expect(res.status).toBe(401);
  });

  it("should return 400 when title is missing", async () => {
    const user = await createUser("AUTHOR");
    const token = generateToken(user.id, "AUTHOR");

    const res = await request(app)
      .post("/articles")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Contenu sans titre", status: "PUBLISHED" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /articles
// ---------------------------------------------------------------------------

describe("GET /articles", () => {
  it("should return paginated list of published articles → 200", async () => {
    const author = await createUser("AUTHOR");
    await createArticle(author.id, "PUBLISHED");
    await createArticle(author.id, "PUBLISHED");
    await createArticle(author.id, "DRAFT"); // should not appear

    const res = await request(app).get("/articles");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toHaveProperty("total", 2);
  });

  it("should filter articles by tag → 200", async () => {
    const author = await createUser("AUTHOR");
    const taggedArticle = await createArticle(author.id, "PUBLISHED");
    await createArticle(author.id, "PUBLISHED"); // untagged, must not appear

    const tag = await prisma.tags.create({
      data: { name: "TypeScript", slug: "typescript" },
    });
    await prisma.articleTags.create({
      data: { articleId: taggedArticle.id, tagId: tag.id },
    });

    const res = await request(app).get("/articles?tag=typescript");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(taggedArticle.id);
  });

  it("should filter articles by search term → 200", async () => {
    const author = await createUser("AUTHOR");
    await createArticle(author.id, "PUBLISHED", {
      title: "Introduction à Prisma",
      slug: "intro-prisma",
    });
    await createArticle(author.id, "PUBLISHED", {
      title: "Guide Express",
      slug: "guide-express",
    });

    const res = await request(app).get("/articles?search=Prisma");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Introduction à Prisma");
  });
});

// ---------------------------------------------------------------------------
// PATCH /articles/:id
// ---------------------------------------------------------------------------

describe("PATCH /articles/:id", () => {
  it("should update article as article owner → 200", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const res = await request(app)
      .patch(`/articles/${article.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Titre mis à jour" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Titre mis à jour");
  });

  it("should return 403 when another AUTHOR tries to update → 403", async () => {
    const owner = await createUser("AUTHOR");
    const other = await createUser("AUTHOR");
    const otherToken = generateToken(other.id, "AUTHOR");
    const article = await createArticle(owner.id, "PUBLISHED");

    const res = await request(app)
      .patch(`/articles/${article.id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Tentative non autorisée" });

    expect(res.status).toBe(403);
  });

  it("should allow MODERATOR to update another author's article → 200", async () => {
    const owner = await createUser("AUTHOR");
    const moderator = await createUser("MODERATOR");
    const modToken = generateToken(moderator.id, "MODERATOR");
    const article = await createArticle(owner.id, "PUBLISHED");

    const res = await request(app)
      .patch(`/articles/${article.id}`)
      .set("Authorization", `Bearer ${modToken}`)
      .send({ title: "Modifié par le modérateur" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Modifié par le modérateur");
  });
});

// ---------------------------------------------------------------------------
// GET /articles/:id
// ---------------------------------------------------------------------------

describe("GET /articles/:id", () => {
  it("should return a published article → 200", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const res = await request(app).get(`/articles/${article.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", article.id);
    expect(res.body).toHaveProperty("title", article.title);
    expect(res.body.author).toHaveProperty("id", author.id);
  });

  it("should return 404 for a non-existent article", async () => {
    const res = await request(app).get("/articles/99999");

    expect(res.status).toBe(404);
  });

  it("should return 404 for a DRAFT article when accessed anonymously", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "DRAFT");

    const res = await request(app).get(`/articles/${article.id}`);

    expect(res.status).toBe(404);
  });

  it("should return DRAFT article to its author → 200", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");
    const article = await createArticle(author.id, "DRAFT");

    const res = await request(app)
      .get(`/articles/${article.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", article.id);
  });
});

// ---------------------------------------------------------------------------
// DELETE /articles/:id
// ---------------------------------------------------------------------------

describe("DELETE /articles/:id", () => {
  it("should soft-delete article as owner → 204", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const res = await request(app)
      .delete(`/articles/${article.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("should return 403 when another AUTHOR tries to delete → 403", async () => {
    const owner = await createUser("AUTHOR");
    const other = await createUser("AUTHOR");
    const otherToken = generateToken(other.id, "AUTHOR");
    const article = await createArticle(owner.id, "PUBLISHED");

    const res = await request(app)
      .delete(`/articles/${article.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("should return 404 on GET after soft-delete", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    await request(app)
      .delete(`/articles/${article.id}`)
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app).get(`/articles/${article.id}`);

    expect(res.status).toBe(404);
  });
});
