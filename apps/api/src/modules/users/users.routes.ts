import { Router } from "express";
import { z } from "zod";
import { hashPassword } from "../../lib/auth.js";
import { HttpError, ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { isManager } from "../../middlewares/auth.js";

export const usersRouter = Router();

const ROLES = ["ADMIN", "MANAGER", "SALES"] as const;
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida");

const createSchema = z.object({
	name: z.string({ required_error: "Nome é obrigatório" }).trim().min(1, "Nome é obrigatório").max(80),
	email: z.string({ required_error: "E-mail é obrigatório" }).trim().toLowerCase().email("E-mail inválido"),
	password: z.string({ required_error: "Senha é obrigatória" }).min(8, "A senha deve ter pelo menos 8 caracteres"),
	role: z.enum(ROLES).default("SALES"),
	color: colorSchema.default("#FFCC00"),
	receivesLeads: z.boolean().default(true),
});

const updateSchema = z.object({
	name: z.string().trim().min(1, "Nome é obrigatório").max(80).optional(),
	email: z.string().trim().toLowerCase().email("E-mail inválido").optional(),
	password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres").optional(),
	role: z.enum(ROLES).optional(),
	color: colorSchema.optional(),
	receivesLeads: z.boolean().optional(),
	active: z.boolean().optional(),
});

usersRouter.get("/", async (req, res) => {
	const includeInactive = req.query.includeInactive === "true";
	const users = await prisma.user.findMany({
		where: includeInactive ? {} : { active: true },
		orderBy: { name: "asc" },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			color: true,
			active: true,
			receivesLeads: true,
			lastAssignedAt: true,
			createdAt: true,
		},
	});
	const [openByOwner, trialsByOwner, wonByOwner] = await Promise.all([
		prisma.lead.groupBy({ by: ["ownerId"], where: { status: "OPEN" }, _count: { _all: true } }),
		prisma.lead.groupBy({
			by: ["ownerId"],
			where: { status: "OPEN", trial: { status: "ACTIVE" } },
			_count: { _all: true },
		}),
		prisma.lead.groupBy({ by: ["ownerId"], where: { status: "WON" }, _count: { _all: true } }),
	]);
	const countFor = (rows: { ownerId: string | null; _count: { _all: number } }[], id: string) =>
		rows.find((r) => r.ownerId === id)?._count._all ?? 0;
	return ok(
		res,
		users.map((u) => ({
			...u,
			stats: {
				openLeads: countFor(openByOwner, u.id),
				activeTrials: countFor(trialsByOwner, u.id),
				won: countFor(wonByOwner, u.id),
			},
		})),
		users.length,
	);
});

usersRouter.post("/", async (req, res) => {
	if (!isManager(req.user)) throw new HttpError(403, "Você não tem permissão para realizar esta ação.");
	const { password, ...body } = parse(createSchema, req.body);
	if (body.role === "ADMIN" && req.user.role !== "ADMIN")
		throw new HttpError(403, "Somente administradores criam administradores");
	const user = await prisma.user.create({
		data: { ...body, passwordHash: await hashPassword(password) },
		select: { id: true, name: true, email: true, role: true, color: true, active: true, receivesLeads: true },
	});
	return ok(res, user, undefined, 201);
});

usersRouter.patch("/:id", async (req, res) => {
	if (!isManager(req.user)) throw new HttpError(403, "Você não tem permissão para realizar esta ação.");
	const { password, ...body } = parse(updateSchema, req.body);
	if (req.params.id === req.user.id && (body.active === false || (body.role && body.role !== req.user.role))) {
		throw new HttpError(400, "Você não pode desativar nem mudar o próprio perfil");
	}
	if (body.role === "ADMIN" && req.user.role !== "ADMIN")
		throw new HttpError(403, "Somente administradores criam administradores");
	const user = await prisma.user.update({
		where: { id: req.params.id },
		data: { ...body, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
		select: { id: true, name: true, email: true, role: true, color: true, active: true, receivesLeads: true },
	});
	return ok(res, user);
});
