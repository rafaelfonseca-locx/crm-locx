import { Router } from "express";
import { z } from "zod";
import { ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", async (req, res) => {
	const [items, unread] = await Promise.all([
		prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 40 }),
		prisma.notification.count({ where: { userId: req.user.id, readAt: null } }),
	]);
	return ok(res, { items, unread });
});

notificationsRouter.post("/read", async (req, res) => {
	const { ids } = parse(z.object({ ids: z.array(z.string()).optional() }), req.body ?? {});
	await prisma.notification.updateMany({
		where: { userId: req.user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
		data: { readAt: new Date() },
	});
	return ok(res, { ok: true });
});
