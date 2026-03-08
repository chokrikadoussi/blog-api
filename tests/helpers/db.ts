import bcrypt from "bcrypt";
import type { ArticleStatus, Role } from "../../src/generated/prisma/enums.js";
import { prisma } from "../../src/lib/prisma.js";

export const resetDb = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Likes", "ArticleTags", "Tags", "Comments", "Articles", "Users" RESTART IDENTITY CASCADE`,
  );
};

export const createUser = async (role: Role = "AUTHOR") => {
  return prisma.users.create({
    data: {
      email: `${role.toLowerCase()}-${Date.now()}@test.com`,
      password_hash: await bcrypt.hash("password", 1),
      role,
    },
    select: { id: true, email: true, role: true },
  });
};

export const createArticle = async (
  authorId: number,
  status: ArticleStatus = "PUBLISHED",
  overrides: Partial<{ title: string; content: string; slug: string }> = {},
) => {
  const ts = Date.now();
  return prisma.articles.create({
    data: {
      title: overrides.title ?? `Article ${ts}`,
      slug: overrides.slug ?? `article-${ts}`,
      content: overrides.content ?? "Test content",
      status,
      authorId,
    },
    select: { id: true, title: true, slug: true, status: true, authorId: true },
  });
};
