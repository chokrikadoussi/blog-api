import { prisma } from "../lib/prisma.js";
import { slugify } from "../utils/slugify.js";

const createTag = async (name: string) => {
  const slug = slugify(name);
  return prisma.tags.create({
    data: {
      name,
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: { articleTags: true },
      },
    },
  });
};

const getAllTags = async (tag?: string) => {
  return prisma.tags.findMany({
    ...(tag ? { where: { name: { contains: tag, mode: "insensitive" } } } : {}),
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { articleTags: { where: { article: { status: "PUBLISHED" } } } } },
    },
  });
};

const addTagsToArticle = async (articleId: number, tagSlugs: string[]) => {
  const existingTags = await prisma.tags.findMany({
    where: { slug: { in: tagSlugs } },
    select: { id: true },
  });

  await prisma.articleTags.deleteMany({
    where: { articleId },
  });

  if (existingTags.length > 0) {
    await prisma.articleTags.createMany({
      data: existingTags.map((tag) => ({
        articleId,
        tagId: tag.id,
      })),
    });
  }

  return prisma.articles.findUnique({
    where: { id: articleId },
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
};

const deleteTagFromArticle = async (articleId: number, tagId: number) => {
  await prisma.articleTags.delete({
    where: {
      articleId_tagId: {
        articleId,
        tagId,
      },
    },
  });
};

export { createTag, getAllTags, addTagsToArticle, deleteTagFromArticle };
