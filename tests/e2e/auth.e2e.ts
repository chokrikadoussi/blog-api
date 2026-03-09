import { test, expect } from "@playwright/test";

test.describe("Scénario 1 — Register + Login", () => {
  const uniqueEmail = () =>
    `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  test("POST /auth/register → 201 + JWT", async ({ request }) => {
    const email = uniqueEmail();
    const response = await request.post("/auth/register", {
      data: { email, password: "Password123!" },
    });

    expect(response.status()).toBe(201);

    const body: { token: string } = await response.json();
    expect(body).toMatchObject({ token: expect.any(String) });
    expect(body.token.length).toBeGreaterThan(0);
  });

  test("POST /auth/login → 200 + JWT", async ({ request }) => {
    const email = uniqueEmail();
    const password = "Password123!";

    await request.post("/auth/register", { data: { email, password } });

    const response = await request.post("/auth/login", {
      data: { email, password },
    });

    expect(response.status()).toBe(200);

    const body: { token: string } = await response.json();
    expect(body).toMatchObject({ token: expect.any(String) });
    expect(body.token.length).toBeGreaterThan(0);
  });

  test("GET /articles avec JWT valide → 200", async ({ request }) => {
    const email = uniqueEmail();
    const password = "Password123!";

    const registerResponse = await request.post("/auth/register", {
      data: { email, password },
    });
    const { token }: { token: string } = await registerResponse.json();

    const response = await request.get("/articles", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status()).toBe(200);

    const body: {
      data: unknown[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    } = await response.json();

    expect(body).toMatchObject({
      data: expect.any(Array),
      pagination: {
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
      },
    });
  });

  test("POST /auth/register email en double → 409", async ({ request }) => {
    const email = uniqueEmail();
    const password = "Password123!";

    await request.post("/auth/register", { data: { email, password } });

    const response = await request.post("/auth/register", {
      data: { email, password },
    });

    expect(response.status()).toBe(409);
  });

  test("POST /auth/login mauvais mot de passe → 401", async ({ request }) => {
    const email = uniqueEmail();

    await request.post("/auth/register", {
      data: { email, password: "Password123!" },
    });

    const response = await request.post("/auth/login", {
      data: { email, password: "WrongPassword!" },
    });

    expect(response.status()).toBe(401);
  });

  test("POST /auth/register email invalide → 400", async ({ request }) => {
    const response = await request.post("/auth/register", {
      data: { email: "not-a-valid-email", password: "Password123!" },
    });

    expect(response.status()).toBe(400);
  });
});
