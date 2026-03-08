import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateToken } from "../helpers/auth.js";
import { resetDb, createUser, createArticle } from "../helpers/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// ---------------------------------------------------------------------------
// GET /tags
// ---------------------------------------------------------------------------

describe("GET /tags", () => {
  it("should return all tags → 200", async () => {
    await prisma.tags.create({ data: { name: "TypeScript", slug: "typescript" } });
    await prisma.tags.create({ data: { name: "Node.js", slug: "nodejs" } });

    const res = await request(app).get("/tags");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("should return an empty array when no tags exist → 200", async () => {
    const res = await request(app).get("/tags");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("should filter tags by name search term → 200", async () => {
    await prisma.tags.create({ data: { name: "TypeScript", slug: "typescript" } });
    await prisma.tags.create({ data: { name: "JavaScript", slug: "javascript" } });
    await prisma.tags.create({ data: { name: "Node.js", slug: "nodejs" } });

    const res = await request(app).get("/tags?tag=script");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// POST /tags
// ---------------------------------------------------------------------------

describe("POST /tags", () => {
  it("should create a tag as MODERATOR → 201", async () => {
    const moderator = await createUser("MODERATOR");
    const token = generateToken(moderator.id, "MODERATOR");

    const res = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "TypeScript" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("TypeScript");
    expect(res.body.slug).toBe("typescript");
  });

  it("should create a tag as ADMIN → 201", async () => {
    const admin = await createUser("ADMIN");
    const token = generateToken(admin.id, "ADMIN");

    const res = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Node.js" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Node.js");
  });

  it("should return 403 when an AUTHOR tries to create a tag", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");

    const res = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Forbidden" });

    expect(res.status).toBe(403);
  });

  it("should return 401 when no token is provided", async () => {
    const res = await request(app).post("/tags").send({ name: "NoAuth" });

    expect(res.status).toBe(401);
  });

  it("should return 409 when tag name already exists", async () => {
    const moderator = await createUser("MODERATOR");
    const token = generateToken(moderator.id, "MODERATOR");

    await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "TypeScript" });

    const res = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "TypeScript" });

    expect(res.status).toBe(409);
  });

  it("should return 400 when name is too short", async () => {
    const moderator = await createUser("MODERATOR");
    const token = generateToken(moderator.id, "MODERATOR");

    const res = await request(app)
      .post("/tags")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X" });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /articles/:id/tags — associate tags with an article
// ---------------------------------------------------------------------------

describe("POST /articles/:id/tags", () => {
  it("should associate existing tags with an article as owner → 200", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    await prisma.tags.create({ data: { name: "TypeScript", slug: "typescript" } });
    await prisma.tags.create({ data: { name: "Node.js", slug: "nodejs" } });

    const res = await request(app)
      .post(`/articles/${article.id}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tags: ["typescript", "nodejs"] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", article.id);
    expect(Array.isArray(res.body.articleTags)).toBe(true);
    expect(res.body.articleTags).toHaveLength(2);
  });

  it("should replace existing tags when called again → 200", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const ts = await prisma.tags.create({ data: { name: "TypeScript", slug: "typescript" } });
    await prisma.tags.create({ data: { name: "Node.js", slug: "nodejs" } });

    await prisma.articleTags.create({ data: { articleId: article.id, tagId: ts.id } });

    const res = await request(app)
      .post(`/articles/${article.id}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tags: ["nodejs"] });

    expect(res.status).toBe(200);
    expect(res.body.articleTags).toHaveLength(1);
    expect(res.body.articleTags[0].tag.slug).toBe("nodejs");
  });

  it("should return 403 when another AUTHOR tries to associate tags → 403", async () => {
    const owner = await createUser("AUTHOR");
    const other = await createUser("AUTHOR");
    const token = generateToken(other.id, "AUTHOR");
    const article = await createArticle(owner.id, "PUBLISHED");

    const res = await request(app)
      .post(`/articles/${article.id}/tags`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tags: ["typescript"] });

    expect(res.status).toBe(403);
  });

  it("should return 401 when no token is provided", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const res = await request(app)
      .post(`/articles/${article.id}/tags`)
      .send({ tags: ["typescript"] });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /articles/:id/tags/:tagId — remove a tag from an article
// ---------------------------------------------------------------------------

describe("DELETE /articles/:id/tags/:tagId", () => {
  it("should remove a tag from an article as owner → 204", async () => {
    const author = await createUser("AUTHOR");
    const token = generateToken(author.id, "AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const tag = await prisma.tags.create({ data: { name: "TypeScript", slug: "typescript" } });
    await prisma.articleTags.create({ data: { articleId: article.id, tagId: tag.id } });

    const res = await request(app)
      .delete(`/articles/${article.id}/tags/${tag.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("should return 403 when another AUTHOR tries to remove a tag → 403", async () => {
    const owner = await createUser("AUTHOR");
    const other = await createUser("AUTHOR");
    const token = generateToken(other.id, "AUTHOR");
    const article = await createArticle(owner.id, "PUBLISHED");

    const tag = await prisma.tags.create({ data: { name: "Node.js", slug: "nodejs" } });
    await prisma.articleTags.create({ data: { articleId: article.id, tagId: tag.id } });

    const res = await request(app)
      .delete(`/articles/${article.id}/tags/${tag.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /articles?tag=slug — filter by tag
// ---------------------------------------------------------------------------

describe("GET /articles filtered by tag slug", () => {
  it("should return only articles tagged with the given slug → 200", async () => {
    const author = await createUser("AUTHOR");
    const taggedArticle = await createArticle(author.id, "PUBLISHED");
    await createArticle(author.id, "PUBLISHED"); // untagged

    const tag = await prisma.tags.create({ data: { name: "Prisma", slug: "prisma" } });
    await prisma.articleTags.create({ data: { articleId: taggedArticle.id, tagId: tag.id } });

    const res = await request(app).get("/articles?tag=prisma");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(taggedArticle.id);
  });
});
