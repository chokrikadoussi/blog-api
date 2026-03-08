import { PrismaClient, ArticleStatus, Role } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Prisma setup (standalone — does not use src/lib/prisma.ts)
// ---------------------------------------------------------------------------

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BCRYPT_COST = 1; // low cost for seeding performance only
const BATCH_SIZE = 100;

const TAG_NAMES: string[] = [
  "TypeScript",
  "Node.js",
  "Prisma",
  "PostgreSQL",
  "Docker",
  "Express",
  "REST API",
  "GraphQL",
  "Jest",
  "CI/CD",
  "GitHub Actions",
  "JWT",
  "Security",
  "Performance",
  "Refactoring",
  "Clean Code",
  "Zod",
  "Monorepo",
  "Microservices",
  "Deployment",
];

const ARTICLE_TITLES: string[] = [
  "Getting Started with TypeScript",
  "Building REST APIs with Express",
  "Mastering Prisma ORM",
  "PostgreSQL Best Practices",
  "Docker for Node.js Developers",
  "JWT Authentication Deep Dive",
  "Secure Your API with Helmet",
  "Rate Limiting Strategies",
  "Testing with Jest and Supertest",
  "CI/CD with GitHub Actions",
  "Zod Validation Patterns",
  "Error Handling in Express",
  "RBAC Implementation Guide",
  "Database Migrations with Prisma",
  "Optimizing Node.js Performance",
  "GraphQL vs REST: Trade-offs",
  "Soft Delete Patterns",
  "Clean Architecture Principles",
  "Monorepo Setup with pnpm",
  "Deploying to Railway and Render",
  "Environment Variable Best Practices",
  "Logging with Winston",
  "CORS Configuration in Depth",
  "Pagination Strategies for APIs",
  "Nested Comments Implementation",
];

const LOREM_SENTENCES: string[] = [
  "In modern backend development, choosing the right tools is crucial for maintainability and scalability.",
  "TypeScript brings static typing to JavaScript, catching errors at compile time rather than runtime.",
  "Prisma provides a type-safe ORM that integrates seamlessly with TypeScript projects.",
  "PostgreSQL is a powerful relational database with excellent support for JSON, full-text search, and complex queries.",
  "Docker simplifies the development workflow by ensuring consistent environments across machines.",
  "JWT tokens are a stateless authentication mechanism, ideal for distributed systems.",
  "Rate limiting protects your API from abuse and ensures fair usage across consumers.",
  "Unit tests verify individual functions in isolation, while integration tests exercise the full HTTP layer.",
  "Continuous integration pipelines run tests automatically on every push, catching regressions early.",
  "Zod schemas serve as both runtime validators and TypeScript type generators, eliminating duplication.",
  "Centralised error handling middleware keeps your controllers clean and consistent.",
  "Role-based access control allows fine-grained permission management across multiple user types.",
  "Database migrations track schema changes in version control, making deployments reproducible.",
  "Connection pooling is essential for high-throughput applications to avoid overwhelming the database.",
  "Soft delete patterns preserve historical data while hiding logically deleted records from users.",
  "Clean architecture separates concerns into layers: routes, controllers, services, and data access.",
  "Environment variables should never be committed to source control — use dotenv and .env.example.",
  "Structured logging with correlation IDs makes debugging distributed systems significantly easier.",
  "CORS must be configured carefully to allow only trusted origins in production environments.",
  "Cursor-based pagination scales better than offset pagination for large datasets.",
];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  const index = randomInt(0, arr.length - 1);
  const value = arr[index];
  if (value === undefined) throw new Error("pickRandom called on empty array");
  return value;
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function generateContent(): string {
  const sentenceCount = randomInt(8, 12);
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(pickRandom(LOREM_SENTENCES));
  }
  return sentences.join(" ");
}

async function insertInBatches<T>(
  label: string,
  items: T[],
  insertFn: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  let processed = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await insertFn(batch);
    processed += batch.length;
    console.log(`  ${label}: ${processed}/${items.length}`);
  }
}

// ---------------------------------------------------------------------------
// Seed steps
// ---------------------------------------------------------------------------

async function cleanDatabase(): Promise<void> {
  console.log("Cleaning database (FK-safe order)...");
  await prisma.likes.deleteMany();
  await prisma.articleTags.deleteMany();
  await prisma.comments.deleteMany();
  await prisma.articles.deleteMany();
  await prisma.tags.deleteMany();
  await prisma.users.deleteMany();
  console.log("  Database cleaned.");
}

async function seedTags(): Promise<number[]> {
  console.log(`Seeding ${TAG_NAMES.length} tags...`);
  const tagIds: number[] = [];

  for (const name of TAG_NAMES) {
    const tag = await prisma.tags.create({
      data: { name, slug: slugify(name) },
      select: { id: true },
    });
    tagIds.push(tag.id);
  }

  console.log(`  ${tagIds.length} tags created.`);
  return tagIds;
}

async function seedUsers(count: number): Promise<number[]> {
  console.log(`Seeding ${count} users (bcrypt cost=${BCRYPT_COST})...`);

  const passwordHash = await bcrypt.hash("Password123!", BCRYPT_COST);
  const timestamp = Date.now();

  // Determine roles: a handful of MODERATORs and ADMINs for realism
  const roles: Role[] = [
    ...Array<Role>(Math.floor(count * 0.95)).fill(Role.AUTHOR),
    ...Array<Role>(Math.floor(count * 0.04)).fill(Role.MODERATOR),
    ...Array<Role>(Math.ceil(count * 0.01)).fill(Role.ADMIN),
  ];

  // Shuffle so roles aren't clustered at the end
  roles.sort(() => Math.random() - 0.5);

  const userIds: number[] = [];

  // bcrypt must run sequentially (CPU-bound) — batch the DB inserts though
  type UserInput = { email: string; password_hash: string; role: Role };
  const userDataBatch: UserInput[] = [];

  for (let i = 0; i < count; i++) {
    const role = roles[i] ?? Role.AUTHOR;
    userDataBatch.push({
      email: `user-${timestamp}-${i}@example.com`,
      password_hash: passwordHash, // same hash — acceptable for seed data
      role,
    });
  }

  // Insert in batches; collect IDs via a follow-up query
  await insertInBatches("Users", userDataBatch, (batch) =>
    prisma.users.createMany({ data: batch }),
  );

  // Retrieve IDs in insertion order (stable: ordered by id ASC)
  const created = await prisma.users.findMany({
    where: { email: { contains: `${timestamp}` } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  userIds.push(...created.map((u) => u.id));

  console.log(`  ${userIds.length} users created.`);
  return userIds;
}

async function seedArticles(
  count: number,
  userIds: number[],
  tagIds: number[],
): Promise<number[]> {
  console.log(`Seeding ${count} articles...`);

  const timestamp = Date.now();

  type ArticleInput = {
    title: string;
    slug: string;
    content: string;
    status: ArticleStatus;
    authorId: number;
  };

  const articleData: ArticleInput[] = [];

  for (let i = 0; i < count; i++) {
    const baseTitle = pickRandom(ARTICLE_TITLES);
    const title = `${baseTitle} #${i + 1}`;
    const slug = `${slugify(baseTitle)}-${i}-${timestamp}`;
    const status = i % 5 === 0 ? ArticleStatus.DRAFT : ArticleStatus.PUBLISHED; // 20% DRAFT
    const authorId = pickRandom(userIds);

    articleData.push({ title, slug, content: generateContent(), status, authorId });
  }

  await insertInBatches("Articles", articleData, (batch) =>
    prisma.articles.createMany({ data: batch }),
  );

  // Retrieve IDs in insertion order
  const created = await prisma.articles.findMany({
    where: { slug: { contains: `${timestamp}` } },
    select: { id: true, status: true },
    orderBy: { id: "asc" },
  });

  // Attach 1-3 tags per article
  console.log("  Attaching tags to articles...");
  type ArticleTagInput = { articleId: number; tagId: number };
  const articleTagData: ArticleTagInput[] = [];

  for (const article of created) {
    const tagsToAttach = pickRandomN(tagIds, randomInt(1, 3));
    for (const tagId of tagsToAttach) {
      articleTagData.push({ articleId: article.id, tagId });
    }
  }

  await insertInBatches("ArticleTags", articleTagData, (batch) =>
    prisma.articleTags.createMany({ data: batch }),
  );

  const publishedIds = created.filter((a) => a.status === ArticleStatus.PUBLISHED).map((a) => a.id);
  console.log(
    `  ${created.length} articles created (${publishedIds.length} PUBLISHED, ${created.length - publishedIds.length} DRAFT).`,
  );
  return publishedIds;
}

async function seedComments(
  count: number,
  publishedArticleIds: number[],
  userIds: number[],
): Promise<void> {
  console.log(`Seeding ${count} comments (~20% replies)...`);

  if (publishedArticleIds.length === 0) {
    console.log("  No published articles — skipping comments.");
    return;
  }

  // We insert root comments first, then replies referencing existing comment IDs.
  const rootCount = Math.floor(count * 0.8);
  const replyCount = count - rootCount;

  // ---- Root comments ----
  type CommentInput = {
    content: string;
    articleId: number;
    authorId: number;
    parentId: number | null;
  };

  const rootData: CommentInput[] = [];
  for (let i = 0; i < rootCount; i++) {
    rootData.push({
      content: pickRandom(LOREM_SENTENCES),
      articleId: pickRandom(publishedArticleIds),
      authorId: pickRandom(userIds),
      parentId: null,
    });
  }

  await insertInBatches("Comments (root)", rootData, (batch) =>
    prisma.comments.createMany({ data: batch }),
  );

  // Retrieve inserted root comment IDs
  const rootComments = await prisma.comments.findMany({
    where: { parentId: null },
    select: { id: true, articleId: true },
    orderBy: { id: "asc" },
  });

  // ---- Reply comments ----
  const replyData: CommentInput[] = [];
  for (let i = 0; i < replyCount; i++) {
    const parent = pickRandom(rootComments);
    replyData.push({
      content: pickRandom(LOREM_SENTENCES),
      articleId: parent.articleId,
      authorId: pickRandom(userIds),
      parentId: parent.id,
    });
  }

  await insertInBatches("Comments (replies)", replyData, (batch) =>
    prisma.comments.createMany({ data: batch }),
  );

  console.log(`  ${rootCount} root comments + ${replyCount} replies created.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Blog API — Database Seed ===");
  console.log(`Target: 20 tags, 500 users, 1000 articles, 5000 comments\n`);

  await cleanDatabase();

  const tagIds = await seedTags();
  const userIds = await seedUsers(500);
  const publishedArticleIds = await seedArticles(1000, userIds, tagIds);
  await seedComments(5000, publishedArticleIds, userIds);

  console.log("\n=== Seed complete ===");
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
