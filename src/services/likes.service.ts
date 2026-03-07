import { prisma } from "../lib/prisma.js";

const toggleLikeArticle = async (articleId: number, userId: number) => {
  const existingLike = await prisma.likes.findUnique({
    where: {
      userId_articleId: {
        userId,
        articleId,
      },
    },
    select: { articleId: true, userId: true },
  });

  if (existingLike) {
    await prisma.likes.delete({
      where: { userId_articleId: { userId, articleId } },
    });
  } else {
    await prisma.likes.create({
      data: {
        userId,
        articleId,
      },
    });
  }
  const likesCount = await prisma.likes.count({ where: { articleId } });
  return { liked: !existingLike, likesCount };
};

export { toggleLikeArticle };
