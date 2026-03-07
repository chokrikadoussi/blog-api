import { Router, type NextFunction, type Request, type Response } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { BadRequestError } from "../utils/errors.js";
import { deleteComment } from "../services/comment.service.js";

const router = Router();

router.delete("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const commentId = parseInt(req.params.id as string, 10);
  if (isNaN(commentId) || commentId <= 0) {
    return next(new BadRequestError("Invalid comment ID"));
  }

  const user = req.user!;

  try {
    await deleteComment(commentId, user.id, user.role);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
