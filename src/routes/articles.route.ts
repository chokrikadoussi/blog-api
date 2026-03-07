import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import z from "zod";
import { authenticate, authenticateOptional } from "../middlewares/auth.middleware.js";
import { createArticle, getArticles, updateArticle, canEditArticle } from "../services/article.service.js";
import { BadRequestError } from "../utils/errors.js";

const router = Router();

const createArticleSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  tags: z.array(z.string()).optional().default([]),
});

const paginateArticlesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  author: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
});

const updateArticleSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

router.post("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const validation = createArticleSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const { title, content, status, tags } = validation.data;

    const article = await createArticle(title, content, req.user!.id, status, tags);
    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
});

router.get("/", authenticateOptional, async (req: Request, res: Response, next: NextFunction) => {
  const validation = paginateArticlesSchema.safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  const { page, limit, author, search } = validation.data;
  const userId = req.user?.id;

  try {
    const articles = await getArticles(page, limit, author, search, userId);
    res.status(200).json(articles);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const articleId = parseInt(req.params.id as string, 10);
  if (isNaN(articleId) || articleId <= 0) {
    throw new BadRequestError("Invalid article ID");
  }
  const validation = updateArticleSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  const { title, content, status } = validation.data;

  try {
    await canEditArticle(articleId, req.user!);
    const updatedArticle = await updateArticle(articleId, title, content, status);
    res.status(200).json(updatedArticle);
  } catch (error) {
    next(error);
  }
});

export default router;
