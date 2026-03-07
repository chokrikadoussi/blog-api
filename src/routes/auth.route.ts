import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import z from "zod";
import { createUser, loginUser } from "../services/user.service.js";

const router = Router();

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = registerSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const { email, password } = parseResult.data;

  try {
    const token = await createUser(email, password);

    res.status(201).json({ token });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  const parseResult = registerSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const { email, password } = parseResult.data;

  try {
    const token = await loginUser(email, password);

    return res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
});

export default router;
