import { Router } from "express";
import { z } from "zod";
import { hashPassword, signToken, verifyPassword } from "../../lib/auth.js";
import { HttpError, ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/auth.js";

export const authRouter = Router();

const publicUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
	color: true,
	receivesLeads: true,
	active: true,
} as const;

authRouter.post("/login", async (req, res) => {
	const { email, password } = parse(
		z.object({
			email: z.string({ required_error: "E-mail é obrigatório" }).trim().toLowerCase().email("E-mail inválido"),
			password: z.string({ required_error: "Senha é obrigatória" }).min(1, "Senha é obrigatória"),
		}),
		req.body,
	);
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
		throw new HttpError(401, "E-mail ou senha incorretos");
	}
	const token = signToken({ id: user.id, role: user.role, name: user.name });
	const { passwordHash: _, ...publicUser } = user;
	return ok(res, { token, user: publicUser });
});

authRouter.get("/me", requireAuth, async (req, res) => {
	const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: publicUserSelect });
	return ok(res, user);
});

authRouter.patch("/me", requireAuth, async (req, res) => {
	const body = parse(
		z
			.object({
				name: z.string().trim().min(1, "Nome é obrigatório").max(80).optional(),
				color: z
					.string()
					.regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida")
					.optional(),
				currentPassword: z.string().optional(),
				newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres").optional(),
			})
			.refine((v) => !v.newPassword || v.currentPassword, {
				message: "Informe a senha atual",
				path: ["currentPassword"],
			}),
		req.body,
	);
	const data: { name?: string; color?: string; passwordHash?: string } = { name: body.name, color: body.color };
	if (body.newPassword) {
		const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
		if (!(await verifyPassword(body.currentPassword ?? "", user.passwordHash)))
			throw new HttpError(400, "Senha atual incorreta");
		data.passwordHash = await hashPassword(body.newPassword);
	}
	const user = await prisma.user.update({ where: { id: req.user.id }, data, select: publicUserSelect });
	return ok(res, user);
});
