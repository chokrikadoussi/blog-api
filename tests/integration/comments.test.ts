import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateToken } from "../helpers/auth.js";
import { resetDb, createUser, createArticle } from "../helpers/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// ---------------------------------------------------------------------------
// POST /articles/:id/comments
// ---------------------------------------------------------------------------

describe("POST /articles/:id/comments", () => {
  it("should create a root comment as authenticated user → 201", async () => {
    const author = await createUser("AUTHOR");
    const commenter = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const token = generateToken(commenter.id, "AUTHOR");

    const res = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Super article !" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.content).toBe("Super article !");
    expect(res.body.author).toHaveProperty("id", commenter.id);
    expect(res.body.parentId).toBeNull();
  });

  it("should return 401 when no auth token is provided", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");

    const res = await request(app)
      .post(`/articles/${article.id}/comments`)
      .send({ content: "Commentaire sans auth" });

    expect(res.status).toBe(401);
  });

  it("should create a nested comment with a valid parentId → 201", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const commenter = await createUser("AUTHOR");
    const token = generateToken(commenter.id, "AUTHOR");

    // Create parent comment
    const parentRes = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Commentaire parent" });

    expect(parentRes.status).toBe(201);
    const parentId: number = parentRes.body.id as number;

    // Create nested reply
    const replyRes = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Réponse au commentaire", parentId });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body).toHaveProperty("id");
    expect(replyRes.body.parentId).toBe(parentId);
    expect(replyRes.body.content).toBe("Réponse au commentaire");
  });
});

// ---------------------------------------------------------------------------
// GET /articles/:id/comments
// ---------------------------------------------------------------------------

describe("GET /articles/:id/comments", () => {
  it("should return nested comment tree → 200", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const commenter = await createUser("AUTHOR");
    const token = generateToken(commenter.id, "AUTHOR");

    // Create parent comment via API
    const parentRes = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Commentaire racine" });
    expect(parentRes.status).toBe(201);
    const parentId: number = parentRes.body.id as number;

    // Create a reply
    await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Réponse imbriquée", parentId });

    const res = await request(app).get(`/articles/${article.id}/comments`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.data).toHaveLength(1);

    const root = res.body.data[0] as { id: number; content: string; replies: { content: string }[] };
    expect(root.content).toBe("Commentaire racine");
    expect(Array.isArray(root.replies)).toBe(true);
    expect(root.replies).toHaveLength(1);
    expect(root.replies[0].content).toBe("Réponse imbriquée");
  });

  it("should return 404 for a non-existent article", async () => {
    const res = await request(app).get("/articles/99999/comments");

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /comments/:id
// ---------------------------------------------------------------------------

describe("DELETE /comments/:id", () => {
  it("should delete own comment as owner → 204", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const commenter = await createUser("AUTHOR");
    const token = generateToken(commenter.id, "AUTHOR");

    const commentRes = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "À supprimer" });
    expect(commentRes.status).toBe(201);
    const commentId: number = commentRes.body.id as number;

    const res = await request(app)
      .delete(`/comments/${commentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("should return 403 when trying to delete another user's comment", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const commenter = await createUser("AUTHOR");
    const otherUser = await createUser("AUTHOR");
    const commenterToken = generateToken(commenter.id, "AUTHOR");
    const otherToken = generateToken(otherUser.id, "AUTHOR");

    const commentRes = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${commenterToken}`)
      .send({ content: "Commentaire d'un autre" });
    expect(commentRes.status).toBe(201);
    const commentId: number = commentRes.body.id as number;

    const res = await request(app)
      .delete(`/comments/${commentId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it("should cascade-delete replies when parent comment is deleted", async () => {
    const author = await createUser("AUTHOR");
    const article = await createArticle(author.id, "PUBLISHED");
    const commenter = await createUser("AUTHOR");
    const token = generateToken(commenter.id, "AUTHOR");

    // Create parent comment
    const parentRes = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Parent à supprimer" });
    expect(parentRes.status).toBe(201);
    const parentId: number = parentRes.body.id as number;

    // Create reply
    const replyRes = await request(app)
      .post(`/articles/${article.id}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Reply qui doit disparaître", parentId });
    expect(replyRes.status).toBe(201);
    const replyId: number = replyRes.body.id as number;

    // Delete parent
    const deleteRes = await request(app)
      .delete(`/comments/${parentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    // Verify that the reply is also gone from DB
    const replyInDb = await prisma.comments.findUnique({ where: { id: replyId } });
    expect(replyInDb).toBeNull();
  });
});
