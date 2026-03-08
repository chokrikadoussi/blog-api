import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateToken } from "../helpers/auth.js";
import { resetDb, createUser, createArticle } from "../helpers/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// ---------------------------------------------------------------------------
// POST /articles/:id/like
// ---------------------------------------------------------------------------

describe("POST /articles/:id/like", () => {
  it("should like an article and return liked=true with count → 200", async () => {
    const author = await createUser("AUTHOR");
    const liker = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const token = generateToken(liker.id, "AUTHOR");

    const res = await request(app)
      .post(`/articles/${article.id}/like`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("liked", true);
    expect(res.body).toHaveProperty("likesCount", 1);
  });

  it("should unlike an already-liked article and return liked=false → 200", async () => {
    const author = await createUser("AUTHOR");
    const liker = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const token = generateToken(liker.id, "AUTHOR");

    // First like
    await request(app)
      .post(`/articles/${article.id}/like`)
      .set("Authorization", `Bearer ${token}`);

    // Toggle off
    const res = await request(app)
      .post(`/articles/${article.id}/like`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("liked", false);
    expect(res.body).toHaveProperty("likesCount", 0);
  });

  it("should return 401 when no token is provided", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const res = await request(app).post(`/articles/${article.id}/like`);

    expect(res.status).toBe(401);
  });

  it("should return 404 for a non-existent article", async () => {
    const liker = await createUser("AUTHOR");
    const token = generateToken(liker.id, "AUTHOR");

    const res = await request(app)
      .post("/articles/99999/like")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should track likes independently per user", async () => {
    const author = await createUser("AUTHOR");
    const user1 = await createUser("AUTHOR");
    const user2 = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const token1 = generateToken(user1.id, "AUTHOR");
    const token2 = generateToken(user2.id, "AUTHOR");

    await request(app)
      .post(`/articles/${article.id}/like`)
      .set("Authorization", `Bearer ${token1}`);

    const res = await request(app)
      .post(`/articles/${article.id}/like`)
      .set("Authorization", `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.likesCount).toBe(2);
  });
});
