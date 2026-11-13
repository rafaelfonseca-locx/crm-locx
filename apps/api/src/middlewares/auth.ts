import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { type AuthUser, verifyToken } from "../lib/auth.js";
import { HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

declare global {
	namespace Express {
		interface Request {
			user: AuthUser;
			rawBody?: Buffer;
		}
	}
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Faça login para continuar");
	let auth: AuthUser;
	try {
		auth = verifyToken(header.slice(7));
	} catch {
		throw new HttpError(401, "Sessão expirada. Faça login novamente");
	}
	const user = await prisma.user.findUnique({
		where: { id: auth.id },
		select: { id: true, role: true, name: true, active: true },
	});
	if (!user?.active) throw new HttpError(401, "Usuário inativo");
	req.user = { id: user.id, role: user.role, name: user.name };
	next();
}

export const requireRole =
	(...roles: Role[]) =>
	(req: Request, _res: Response, next: NextFunction) => {
		if (!roles.includes(req.user.role)) throw new HttpError(403, "Você não tem permissão para realizar esta ação.");
		next();
	};

export const isManager = (user: AuthUser) => user.role === "ADMIN" || user.role === "MANAGER";
