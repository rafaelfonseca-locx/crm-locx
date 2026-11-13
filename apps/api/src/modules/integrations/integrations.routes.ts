import { createHmac, timingSafeEqual } from "node:crypto";
import { type Request, Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { HttpError, ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { isManager, requireAuth } from "../../middlewares/auth.js";
import { buildSampleCalPayload, handleCalWebhook, logCalWebhook } from "./calcom.service.js";
import {
	ASSIGNMENT_SETTING_KEY,
	buildSampleRdPayload,
	getAssignmentMode,
	handleRdWebhook,
} from "./rdstation.service.js";

export const rdWebhookRouter = Router();
export const integrationsRouter = Router();

function safeEqual(a: string, b: string) {
	return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function hasValidToken(req: Request) {
	return safeEqual(String(req.query.token ?? req.headers["x-webhook-token"] ?? ""), env.RD_WEBHOOK_TOKEN);
}

/** Cal.com assina o corpo com HMAC-SHA256 quando há um "secret" configurado no webhook. */
function hasValidCalSignature(req: Request) {
	if (!env.CAL_WEBHOOK_SECRET) return false;
	const signature = String(req.headers["x-cal-signature-256"] ?? "");
	const expected = createHmac("sha256", env.CAL_WEBHOOK_SECRET)
		.update(req.rawBody ?? Buffer.from(""))
		.digest("hex");
	return safeEqual(signature, expected);
}

// Endpoints públicos chamados pelo RD Station e pelo Cal.com
rdWebhookRouter.post("/rd-station/webhook", async (req, res) => {
	if (!hasValidToken(req)) throw new HttpError(401, "Token do webhook inválido");
	const results = await handleRdWebhook(req.body);
	return ok(res, results, results.length);
});

rdWebhookRouter.post("/cal/webhook", async (req, res) => {
	if (!hasValidToken(req) && !hasValidCalSignature(req)) throw new HttpError(401, "Token do webhook inválido");
	try {
		const result = await handleCalWebhook(req.body);
		await logCalWebhook(req.body, result);
		return ok(res, result);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Erro ao processar agendamento";
		await logCalWebhook(req.body, { status: "ERROR", message });
		throw new HttpError(422, message);
	}
});

integrationsRouter.use(requireAuth);

integrationsRouter.get("/rd-station", async (req, res) => {
	const since = new Date(Date.now() + -30 * 24 * 60 * 60 * 1000);
	const [logs, received30d, calBookings30d, assignmentMode] = await Promise.all([
		prisma.webhookLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
		prisma.lead.count({ where: { source: "RD Station", createdAt: { gte: since } } }),
		prisma.activity.count({ where: { externalId: { not: null }, createdAt: { gte: since } } }),
		getAssignmentMode(),
	]);
	const manager = isManager(req.user);
	const lastOf = (source: string) => logs.find((l) => l.source === source)?.createdAt ?? null;
	return ok(res, {
		webhookUrl: manager
			? `${env.PUBLIC_API_URL}/api/integrations/rd-station/webhook?token=${env.RD_WEBHOOK_TOKEN}`
			: null,
		calWebhookUrl: manager ? `${env.PUBLIC_API_URL}/api/integrations/cal/webhook?token=${env.RD_WEBHOOK_TOKEN}` : null,
		assignmentMode,
		received30d,
		calBookings30d,
		lastReceivedAt: lastOf("rd-station"),
		calLastReceivedAt: lastOf("cal.com"),
		logs: logs.map(({ payload, ...log }) => {
			const data =
				typeof payload === "object" && payload && !Array.isArray(payload) ? (payload as Record<string, unknown>) : {};
			const conversion = data.last_conversion as { content?: { identificador?: string } } | undefined;
			return {
				...log,
				email: typeof data.email === "string" ? data.email : null,
				conversion:
					conversion?.content?.identificador ?? (typeof data.triggerEvent === "string" ? data.triggerEvent : null),
			};
		}),
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
	const { channel } = parse(
		z.object({ channel: z.enum(["DEMO", "WHATSAPP", "SITE"]).default("SITE") }),
		req.body ?? {},
	);
	const results = await handleRdWebhook(buildSampleRdPayload(channel));
	return ok(res, results, results.length);
});

integrationsRouter.post("/cal/test", async (req, res) => {
	if (!isManager(req.user)) throw new HttpError(403, "Você não tem permissão para realizar esta ação.");
	const seller = await prisma.user.findFirst({
		where: { active: true, receivesLeads: true },
		orderBy: { name: "asc" },
		select: { email: true },
	});
	const body = buildSampleCalPayload(seller?.email ?? null);
	const result = await handleCalWebhook(body);
	await logCalWebhook(body, result);
	return ok(res, result);
});
