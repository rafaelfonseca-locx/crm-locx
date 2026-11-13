import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { HttpError, notFound, ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { isManager } from "../../middlewares/auth.js";
import {
	createCalendarEvent,
	deleteCalendarEvent,
	hasGoogle,
	parseMeetCode,
	updateCalendarEvent,
} from "../google/google.service.js";
import { userSummarySelect } from "../leads/leads.include.js";
import { moveStage } from "../leads/leads.service.js";
import { leadUrl, notifySafely } from "../notifications/notifications.service.js";

/** Dono do evento no Google: quem estava conduzindo quando a reunião foi criada. */
function calendarOwner(activity: { metadata: Prisma.JsonValue; assigneeId: string | null }) {
	const meta = activity.metadata as { calendarUserId?: string } | null;
	return meta?.calendarUserId ?? activity.assigneeId;
}

export const activitiesRouter = Router();

const USER_ACTIVITY_TYPES = ["NOTE", "CALL", "EMAIL", "WHATSAPP", "MEETING", "TASK"] as const;

const activityInclude = {
	author: { select: userSummarySelect },
	assignee: { select: userSummarySelect },
	lead: { select: { id: true, name: true, companyName: true, stage: true, status: true } },
} satisfies Prisma.ActivityInclude;

const createSchema = z
	.object({
		type: z.enum(USER_ACTIVITY_TYPES, { required_error: "Tipo é obrigatório" }),
		title: z.string().trim().max(160).nullish(),
		body: z.string().trim().max(5000).nullish(),
		dueAt: z.coerce.date({ invalid_type_error: "Data inválida" }).nullish(),
		meetingUrl: z.string().trim().max(300).nullish(),
		assigneeId: z.string().nullish(),
		completed: z.boolean().optional(),
		moveToMeetingStage: z.boolean().optional(),
		// Reunião: duração e criação do evento no Google Agenda (com link do Meet)
		durationMin: z.coerce.number().int().min(15).max(240).optional(),
		syncGoogle: z.boolean().optional(),
	})
	.superRefine((value, ctx) => {
		if ((value.type === "TASK" || value.type === "MEETING") && !value.dueAt) {
			ctx.addIssue({ code: "custom", path: ["dueAt"], message: "Data é obrigatória" });
		}
		if ((value.type === "TASK" || value.type === "MEETING") && !value.title) {
			ctx.addIssue({ code: "custom", path: ["title"], message: "Título é obrigatório" });
		}
		if (["NOTE", "CALL", "EMAIL", "WHATSAPP"].includes(value.type) && !value.body && !value.title) {
			ctx.addIssue({ code: "custom", path: ["body"], message: "Descreva a atividade" });
		}
	});

const updateSchema = z.object({
	title: z.string().trim().max(160).nullish(),
	body: z.string().trim().max(5000).nullish(),
	dueAt: z.coerce.date({ invalid_type_error: "Data inválida" }).nullish(),
	meetingUrl: z.string().trim().max(300).nullish(),
	assigneeId: z.string().nullish(),
	completed: z.boolean().optional(),
});

const agendaQuerySchema = z.object({
	scope: z.enum(["mine", "team"]).default("mine"),
	userId: z.string().optional(),
	types: z
		.string()
		.optional()
		.transform((v) => (v ? v.split(",") : ["TASK", "MEETING"]))
		.pipe(z.array(z.enum(["TASK", "MEETING"]))),
	status: z.enum(["open", "done", "all"]).default("open"),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
	take: z.coerce.number().int().min(1).max(500).default(200),
});

activitiesRouter.get("/leads/:id/activities", async (req, res) => {
	const leadId = Number(req.params.id);
	const items = await prisma.activity.findMany({
		where: { leadId },
		include: activityInclude,
		orderBy: { createdAt: "desc" },
	});
	return ok(res, items, items.length);
});

activitiesRouter.post("/leads/:id/activities", async (req, res) => {
	const leadId = Number(req.params.id);
	const body = parse(createSchema, req.body);
	const lead = await prisma.lead.findUnique({
		where: { id: leadId },
		select: { id: true, stage: true, status: true, email: true, name: true, companyName: true },
	});
	if (!lead) throw notFound("Lead");

	const isSchedulable = body.type === "TASK" || body.type === "MEETING";
	const assigneeId = isSchedulable ? (body.assigneeId ?? req.user.id) : null;

	// Reunião no Google Agenda de quem conduz, com link do Meet e o lead como convidado
	let google: { eventId: string; meetingUrl: string | null; meetingCode: string | null } | null = null;
	let googleWarning: string | null = null;
	if (
		body.type === "MEETING" &&
		body.dueAt &&
		body.syncGoogle !== false &&
		(await hasGoogle(assigneeId)) &&
		assigneeId
	) {
		try {
			google = await createCalendarEvent(assigneeId, {
				summary: body.title ?? `Demonstração LocX · ${lead.companyName ?? lead.name}`,
				description: [body.body, `Lead no CRM: ${leadUrl(leadId)}`].filter(Boolean).join("\n\n"),
				start: body.dueAt,
				durationMin: body.durationMin ?? 45,
				attendeeEmail: lead.email,
			});
		} catch (error) {
			googleWarning = "Reunião salva no CRM, mas não foi possível criar o evento no Google Agenda";
			console.error("Falha ao criar evento no Google:", error instanceof Error ? error.message : error);
		}
	}
	const meetingUrl = body.meetingUrl || google?.meetingUrl || null;

	const activity = await prisma.activity.create({
		data: {
			leadId,
			type: body.type,
			title: body.title ?? null,
			body: body.body ?? null,
			dueAt: body.dueAt ?? null,
			meetingUrl,
			meetingCode: google?.meetingCode ?? parseMeetCode(meetingUrl),
			googleEventId: google?.eventId ?? null,
			durationMin: body.type === "MEETING" ? (body.durationMin ?? 45) : null,
			metadata: google ? { calendarUserId: assigneeId } : undefined,
			authorId: req.user.id,
			assigneeId,
			completedAt: !isSchedulable || body.completed ? new Date() : null,
		},
		include: activityInclude,
	});

	const shouldMove =
		body.type === "MEETING" &&
		body.moveToMeetingStage &&
		lead.status === "OPEN" &&
		["NEW", "QUALIFICATION"].includes(lead.stage);
	if (shouldMove) await moveStage(leadId, "MEETING", req.user.id);
	if (
		lead.stage === "NEW" &&
		lead.status === "OPEN" &&
		!shouldMove &&
		["CALL", "EMAIL", "WHATSAPP"].includes(body.type)
	) {
		// Primeiro contato registrado: o lead entra em pré-atendimento automaticamente
		await moveStage(leadId, "QUALIFICATION", req.user.id);
	}

	if (activity.assigneeId && activity.assigneeId !== req.user.id && (body.type === "TASK" || body.type === "MEETING")) {
		notifySafely([activity.assigneeId], {
			type: "TASK_ASSIGNED",
			title: `${body.type === "MEETING" ? "Reunião" : "Tarefa"} para você: ${activity.title ?? ""}`,
			body: `${activity.lead.companyName ?? activity.lead.name} · criada por ${req.user.name}`,
			leadId,
			actorId: req.user.id,
		});
	}
	return ok(res, { ...activity, googleWarning }, undefined, 201);
});

activitiesRouter.patch("/activities/:activityId", async (req, res) => {
	const body = parse(updateSchema, req.body);
	const current = await prisma.activity.findUnique({ where: { id: req.params.activityId } });
	if (!current) throw notFound("Atividade");
	if (current.type === "STAGE_CHANGE" || current.type === "SYSTEM")
		throw new HttpError(400, "Registros automáticos não podem ser editados");
	const { completed, ...data } = body;
	const activity = await prisma.activity.update({
		where: { id: current.id },
		data: {
			...data,
			...(data.meetingUrl !== undefined ? { meetingCode: parseMeetCode(data.meetingUrl) ?? current.meetingCode } : {}),
			...(completed === undefined ? {} : { completedAt: completed ? new Date() : null }),
		},
		include: activityInclude,
	});
	const calendarUserId = calendarOwner(current);
	if (current.googleEventId && calendarUserId && (data.dueAt || data.title)) {
		updateCalendarEvent(calendarUserId, current.googleEventId, {
			summary: data.title ?? undefined,
			start: data.dueAt ?? undefined,
			durationMin: current.durationMin ?? 45,
		}).catch((error) =>
			console.error("Falha ao atualizar evento no Google:", error instanceof Error ? error.message : error),
		);
	}
	return ok(res, activity);
});

activitiesRouter.delete("/activities/:activityId", async (req, res) => {
	const current = await prisma.activity.findUnique({ where: { id: req.params.activityId } });
	if (!current) throw notFound("Atividade");
	if (current.type === "STAGE_CHANGE" || current.type === "SYSTEM")
		throw new HttpError(400, "Registros automáticos não podem ser excluídos");
	if (current.authorId !== req.user.id && !isManager(req.user)) {
		throw new HttpError(403, "Somente quem registrou a atividade pode excluí-la");
	}
	await prisma.activity.delete({ where: { id: current.id } });
	const calendarUserId = calendarOwner(current);
	if (current.googleEventId && calendarUserId) {
		deleteCalendarEvent(calendarUserId, current.googleEventId).catch((error) =>
			console.error("Falha ao cancelar evento no Google:", error instanceof Error ? error.message : error),
		);
	}
	return ok(res, { id: current.id });
});

/** Agenda: tarefas e reuniões do usuário ou da equipe */
activitiesRouter.get("/activities", async (req, res) => {
	const q = parse(agendaQuerySchema, req.query);
	const where: Prisma.ActivityWhereInput = { type: { in: q.types } };
	if (q.scope === "mine") where.assigneeId = req.user.id;
	else if (q.userId) where.assigneeId = q.userId;
	if (q.status === "open") where.completedAt = null;
	if (q.status === "done") where.completedAt = { not: null };
	if (q.from || q.to) where.dueAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };

	const items = await prisma.activity.findMany({
		where,
		include: activityInclude,
		orderBy: q.status === "done" ? { completedAt: "desc" } : { dueAt: "asc" },
		take: q.take,
	});
	return ok(res, items, items.length);
});
