import { Prisma } from "../generated/prisma/client.js";
import type { ArticleStatus, Role } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { slugify } from "../utils/slugify.js";

const generateUniqueSlug = async (baseSlug: string, excludeId?: number): Promise<string> => {
  const existing = await prisma.articles.findMany({
    where: { slug: { startsWith: baseSlug }, ...(excludeId !== undefined ? { id: { not: excludeId } } : {}) },
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

const getArticleById = async (id: number, userId?: number) => {
  const article = await prisma.articles.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      slug: true,
      status: true,
      author: { select: { id: true, email: true } },
      articleTags: { select: { tag: { select: { name: true, slug: true } } } },
      createdAt: true,
      updatedAt: true,
      _count: { select: { comments: true, likes: true } },
    },
  });

  if (!article || article.status === "DELETED") {
    throw new NotFoundError("Article not found");
  }

  if (article.status === "DRAFT" && article.author.id !== userId) {
    throw new NotFoundError("Article not found");
  }

  return { ...article, tags: article.articleTags.map((at) => at.tag), articleTags: undefined };
};

const canEditArticle = async (articleId: number, user: { id: number; role: Role }) => {
  const article = await prisma.articles.findUnique({
    where: { id: articleId },
    select: { authorId: true, status: true },
  });

  if (!article || article.status === "DELETED") {
    throw new NotFoundError("Article not found");
  }

  if (user.role === "ADMIN" || user.role === "MODERATOR") return true;

  if (article.authorId === user.id) {
    return true;
  }

  throw new ForbiddenError("You do not have permission to edit this article");
};

const updateArticle = async (id: number, title?: string, content?: string, status?: ArticleStatus) => {
  const data: Prisma.ArticlesUpdateInput = {
    ...(status !== undefined ? { status } : {}),
    ...(title !== undefined ? { title, slug: await generateUniqueSlug(slugify(title), id) } : {}),
    ...(content !== undefined ? { content } : {}),
  };

  const updatedArticle = await prisma.articles.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      status: true,
      author: { select: { id: true, email: true } },
      articleTags: { select: { tag: { select: { name: true, slug: true } } } },
      createdAt: true,
      updatedAt: true,
    },
  });

  return { ...updatedArticle, tags: updatedArticle.articleTags.map((at) => at.tag), articleTags: undefined };
};

const deleteArticle = async (id: number) => {
  await prisma.articles.update({
    where: { id },
    data: { status: "DELETED" },
  });
};

export { createArticle, getArticles, getArticleById, updateArticle, canEditArticle, deleteArticle };
