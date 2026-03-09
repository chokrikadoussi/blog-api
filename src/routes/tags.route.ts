import z from "zod";
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { createTag, getAllTags } from "../services/tag.service.js";

const router = Router();

const createTagSchema = z.object({
  name: z.string().min(2).max(50),
});

router.post(
  "/",
  authenticate,
  authorize("MODERATOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = createTagSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.issues.map((i) => i.message),
      });
    }

    const { name } = validation.data;

    try {
      const tag = await createTag(name);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const validation = z
    .object({
      tag: z.string().trim().optional(),
    })
    .safeParse(req.query);

  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.error.issues.map((i) => i.message),
    });
  }

  const { tag } = validation.data;

  try {
    const tags = await getAllTags(tag);
    res.status(200).json(tags);
  } catch (error) {
    next(error);
  }
});

export default router;
