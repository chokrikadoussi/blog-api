import { prisma } from "../lib/prisma.js";
import { BadRequestError } from "../utils/errors.js";
import { getArticleById } from "./article.service.js";

const createComment = async (
  articleId: number,
  userId: number,
  content: string,
  parentId?: number,
) => {
  const article = await getArticleById(articleId);

  const data = {
    content,
    articleId: article.id,
    authorId: userId,
    parentId: null as number | null,
  };

  if (parentId !== undefined) {
    const parentComment = await prisma.comments.findUnique({
      where: { id: parentId },
      select: { id: true, articleId: true },
    });

    if (!parentComment || parentComment.articleId !== articleId) {
      throw new BadRequestError("Parent comment not found or does not belong to the same article");
    }

    data.parentId = parentId;
  }

  return await prisma.comments.create({
    data,
    select: {
      id: true,
      content: true,
      author: { select: { id: true, email: true } },
      parentId: true,
      createdAt: true,
    },
  });
};

const getCommentsForArticle = async (articleId: number, page: number, limit: number) => {
  const [comments, count] = await Promise.all([
    prisma.comments.findMany({
      where: { articleId, parentId: null },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        content: true,
        author: { select: { id: true, email: true } },
        createdAt: true,
        replies: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            author: { select: { id: true, email: true } },
            createdAt: true,
            replies: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                content: true,
                author: { select: { id: true, email: true } },
                createdAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.comments.count({ where: { articleId, parentId: null } }),
  ]);

  return {
    data: comments,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

export { createComment, getCommentsForArticle };
