import type { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthUser = { id: string; role: Role; name: string };

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export function signToken(user: AuthUser) {
	return jwt.sign({ sub: user.id, role: user.role, name: user.name }, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthUser {
	const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
	return { id: String(payload.sub), role: payload.role as Role, name: String(payload.name) };
}
