import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import z from "zod";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createArticle } from "../services/article.service.js";

const router = Router();

const createArticleSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  tags: z.array(z.string()).optional().default([]),
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

export default router;
