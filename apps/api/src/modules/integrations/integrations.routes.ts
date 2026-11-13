import { timingSafeEqual } from "node:crypto";
import { type Request, Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { HttpError, ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { isManager, requireAuth } from "../../middlewares/auth.js";
import {
	ASSIGNMENT_SETTING_KEY,
	buildSampleRdPayload,
	getAssignmentMode,
	handleRdWebhook,
} from "./rdstation.service.js";

export const rdWebhookRouter = Router();
export const integrationsRouter = Router();

function hasValidToken(req: Request) {
	const received = String(req.query.token ?? req.headers["x-webhook-token"] ?? "");
	const expected = env.RD_WEBHOOK_TOKEN;
	if (received.length !== expected.length) return false;
	return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

// Endpoint público chamado pelo RD Station. A autenticação é o token na URL.
rdWebhookRouter.post("/rd-station/webhook", async (req, res) => {
	if (!hasValidToken(req)) throw new HttpError(401, "Token do webhook inválido");
	const results = await handleRdWebhook(req.body);
	return ok(res, results, results.length);
});

integrationsRouter.use(requireAuth);

integrationsRouter.get("/rd-station", async (req, res) => {
	const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const [logs, received30d, assignmentMode] = await Promise.all([
		prisma.webhookLog.findMany({ where: { source: "rd-station" }, orderBy: { createdAt: "desc" }, take: 25 }),
		prisma.lead.count({ where: { source: "RD Station", createdAt: { gte: since } } }),
		getAssignmentMode(),
	]);
	const manager = isManager(req.user);
	return ok(res, {
		webhookUrl: manager
			? `${env.PUBLIC_API_URL}/api/integrations/rd-station/webhook?token=${env.RD_WEBHOOK_TOKEN}`
			: null,
		assignmentMode,
		received30d,
		lastReceivedAt: logs[0]?.createdAt ?? null,
		logs: logs.map(({ payload, ...log }) => ({
			...log,
			email: typeof payload === "object" && payload && "email" in payload ? String(payload.email) : null,
		})),
	});
});

integrationsRouter.put("/settings/assignment", async (req, res) => {
	if (!isManager(req.user)) throw new HttpError(403, "Você não tem permissão para realizar esta ação.");
	const { mode } = parse(z.object({ mode: z.enum(["ROUND_ROBIN", "UNASSIGNED"]) }), req.body);
	await prisma.setting.upsert({
		where: { key: ASSIGNMENT_SETTING_KEY },
		create: { key: ASSIGNMENT_SETTING_KEY, value: { mode } },
		update: { value: { mode } },
	});
	return ok(res, { mode });
});

integrationsRouter.post("/rd-station/test", async (req, res) => {
	if (!isManager(req.user)) throw new HttpError(403, "Você não tem permissão para realizar esta ação.");
	const results = await handleRdWebhook(buildSampleRdPayload());
	return ok(res, results, results.length);
});
