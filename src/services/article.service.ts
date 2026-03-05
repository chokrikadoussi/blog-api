import { Prisma } from "../generated/prisma/client.js";
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

  return { ...article, tags: article.articleTags.map((at) => at.tag), articleTags: undefined };
};

const getArticles = async (
  page: number,
  limit: number,
  author?: number,
  searchTerm?: string,
  userId?: number | undefined,
) => {
  const conditions: Prisma.ArticlesWhereInput[] = [];

  if (userId) {
    conditions.push({ OR: [{ status: "PUBLISHED" }, { status: "DRAFT", authorId: userId }] });
  } else {
    conditions.push({ status: "PUBLISHED" });
  }
  if (author) conditions.push({ authorId: author });
  if (searchTerm) {
    conditions.push({
      OR: [
        { title: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
        { content: { contains: searchTerm, mode: Prisma.QueryMode.insensitive } },
      ],
    });
  }

  const where: Prisma.ArticlesWhereInput = { AND: conditions };

  const [articles, count] = await Promise.all([
    prisma.articles.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        author: { select: { id: true, email: true } },
        createdAt: true,
        _count: { select: { comments: true, likes: true } },
      },
    }),
    prisma.articles.count({ where }),
  ]);

  return { data: articles, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
};

export { createArticle, getArticles };
