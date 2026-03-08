import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resetDb } from "../helpers/db.js";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

// ---------------------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------------------

describe("POST /auth/register", () => {
  it("should register a new user and return a JWT token → 201", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "newuser@test.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
  });

  it("should return 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
  });

  it("should return 400 when password is too short (< 8 chars)", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "valid@test.com", password: "short" });

    expect(res.status).toBe(400);
  });

  it("should return 409 when email is already registered", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "duplicate@test.com", password: "password123" });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "duplicate@test.com", password: "password123" });

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

describe("POST /auth/login", () => {
  it("should return a JWT token with valid credentials → 200", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "login@test.com", password: "password123" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
  });

  it("should return 401 with wrong password", async () => {
    await request(app)
      .post("/auth/register")
      .send({ email: "user@test.com", password: "password123" });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "user@test.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("should return 401 when email does not exist", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.com", password: "password123" });

    expect(res.status).toBe(401);
  });

  it("should return 400 when email is missing", async () => {
    const res = await request(app).post("/auth/login").send({ password: "password123" });

    expect(res.status).toBe(400);
  });
});
