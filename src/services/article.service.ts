import type { ArticleStatus } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { slugify } from "../utils/slugify.js";

const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
  const existing = await prisma.articles.findMany({
    where: { slug: { startsWith: baseSlug } },
    select: { slug: true },
  });

  if (existing.length === 0) return baseSlug;

  const slugSet = new Set(existing.map((a) => a.slug));

  if (!slugSet.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter++;
  }

  return `${baseSlug}-${counter}`;
};

const createArticle = async (title: string, content: string, userId: number, status: ArticleStatus, tags: string[]) => {
  const slug = await generateUniqueSlug(slugify(title));

  const existingTags =
    tags.length > 0
      ? await prisma.tags.findMany({
          where: { slug: { in: tags } },
          select: { id: true },
        })
      : [];

  const article = await prisma.articles.create({
    data: {
      title,
      content,
      slug,
      status,
      authorId: userId,
      articleTags: {
        create: existingTags.map((tag) => ({ tagId: tag.id })),
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      author: { select: { id: true, email: true } },
      articleTags: { select: { tag: { select: { name: true, slug: true } } } },
      createdAt: true,
    },
  });

  return article;
};

export { createArticle };
