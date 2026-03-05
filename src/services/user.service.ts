import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { UnauthorizedError } from "../utils/errors.js";

const createUser = async (email: string, password: string) => {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.users.create({
    data: {
      email,
      password_hash: passwordHash,
    },
  });

  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  return token;
};

const loginUser = async (email: string, password: string) => {
  const user = await prisma.users.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const token = jwt.sign({ id: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  return token;
};

export { createUser, loginUser };
