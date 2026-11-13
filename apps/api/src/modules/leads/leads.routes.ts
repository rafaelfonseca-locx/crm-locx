import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { HttpError, notFound, ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { isManager } from "../../middlewares/auth.js";
import { notifySafely } from "../notifications/notifications.service.js";
import { leadDetailInclude, leadListInclude, serializeLead, userSummarySelect } from "./leads.include.js";
import {
	leadBodySchema,
	leadListQuerySchema,
	leadUpdateSchema,
	loseSchema,
	moveStageSchema,
	participantSchema,
	transferSchema,
	winSchema,
} from "./leads.schemas.js";
import { markAsLost, markAsWon, moveStage, reopen } from "./leads.service.js";

export const leadsRouter = Router();

const PARTICIPANT_ROLE_LABELS: Record<string, string> = {
	SDR: "SDR",
	CLOSER: "Closer",
	ONBOARDING: "Onboarding",
	TECHNICAL: "Técnico",
	OBSERVER: "Acompanhando",
};

function leadIdParam(value: string | undefined) {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Id de lead inválido");
	return id;
}

async function loadLead(id: number) {
	const lead = await prisma.lead.findUnique({ where: { id }, include: leadListInclude });
	if (!lead) throw notFound("Lead");
	return serializeLead(lead);
}

leadsRouter.get("/", async (req, res) => {
	const q = parse(leadListQuerySchema, req.query);
	const where: Prisma.LeadWhereInput = {};

	if (q.status !== "ALL") where.status = q.status;
	if (q.stage) where.stage = q.stage;
	if (q.source) where.source = q.source;
	if (q.channel) where.channel = q.channel;
	if (q.temperature) where.temperature = q.temperature;
	if (q.ownerId === "none") where.ownerId = null;
	else if (q.ownerId) where.ownerId = q.ownerId;
	if (q.mine === "true") {
		where.OR = [{ ownerId: req.user.id }, { participants: { some: { userId: req.user.id } } }];
	}
	if (q.search) {
		const contains = { contains: q.search, mode: "insensitive" as const };
		const searchOr: Prisma.LeadWhereInput[] = [
			{ name: contains },
			{ email: contains },
			{ companyName: contains },
			{ phone: contains },
		];
		if (/^\d+$/.test(q.search)) searchOr.push({ id: Number(q.search) });
		where.AND = [{ OR: searchOr }];
	}

	const [items, count] = await prisma.$transaction([
		prisma.lead.findMany({
			where,
			include: leadListInclude,
			orderBy: { [q.orderByColumn]: q.orderByAsc === "true" ? "asc" : "desc" },
			skip: q.skip,
			take: q.take,
		}),
		prisma.lead.count({ where }),
	]);

	return ok(res, items.map(serializeLead), count);
});

leadsRouter.get("/sources", async (_req, res) => {
	const rows = await prisma.lead.groupBy({ by: ["source"], _count: { _all: true }, orderBy: { source: "asc" } });
	return ok(
		res,
		rows.map((r) => ({ source: r.source, count: r._count._all })),
	);
});

leadsRouter.post("/", async (req, res) => {
	const body = parse(leadBodySchema, req.body);
	const ownerId = body.ownerId === undefined ? req.user.id : body.ownerId;
	const stage = body.stage ?? "NEW";
	const lead = await prisma.$transaction(async (tx) => {
		const created = await tx.lead.create({
			data: { ...body, ownerId, stage, source: body.source || "Manual", tags: body.tags ?? [] },
		});
		await tx.stageEvent.create({ data: { leadId: created.id, toStage: stage, toStatus: "OPEN", userId: req.user.id } });
		await tx.activity.create({
			data: { leadId: created.id, type: "SYSTEM", title: "Lead cadastrado manualmente", authorId: req.user.id },
		});
		return created;
	});
	notifySafely([lead.ownerId], {
		type: "LEAD_ASSIGNED",
		title: `Novo lead para você: ${lead.companyName ?? lead.name}`,
		body: `${req.user.name} cadastrou o lead e deixou com você.`,
		leadId: lead.id,
		actorId: req.user.id,
	});
	return ok(res, await loadLead(lead.id), undefined, 201);
});

leadsRouter.get("/:id", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const lead = await prisma.lead.findUnique({ where: { id }, include: leadDetailInclude });
	if (!lead) throw notFound("Lead");
	return ok(res, serializeLead(lead));
});

leadsRouter.patch("/:id", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const body = parse(leadUpdateSchema, req.body);
	const { stage, ...data } = body;
	if (stage) await moveStage(id, stage, req.user.id);
	await prisma.lead.update({ where: { id }, data });
	return ok(res, await loadLead(id));
});

leadsRouter.delete("/:id", async (req, res) => {
	if (!isManager(req.user)) throw new HttpError(403, "Você não tem permissão para realizar esta ação.");
	const id = leadIdParam(req.params.id);
	await prisma.lead.delete({ where: { id } });
	return ok(res, { id });
});

leadsRouter.post("/:id/stage", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const { stage } = parse(moveStageSchema, req.body);
	await moveStage(id, stage, req.user.id);
	return ok(res, await loadLead(id));
});

leadsRouter.post("/:id/win", async (req, res) => {
	const id = leadIdParam(req.params.id);
	await markAsWon(id, parse(winSchema, req.body), req.user.id);
	return ok(res, await loadLead(id));
});

leadsRouter.post("/:id/lose", async (req, res) => {
	const id = leadIdParam(req.params.id);
	await markAsLost(id, parse(loseSchema, req.body), req.user.id);
	return ok(res, await loadLead(id));
});

leadsRouter.post("/:id/reopen", async (req, res) => {
	const id = leadIdParam(req.params.id);
	await reopen(id, req.user.id);
	return ok(res, await loadLead(id));
});

leadsRouter.post("/:id/claim", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const lead = await prisma.lead.findUnique({ where: { id }, select: { ownerId: true } });
	if (!lead) throw notFound("Lead");
	if (lead.ownerId) throw new HttpError(409, "Este lead já tem um responsável");
	await prisma.$transaction([
		prisma.lead.update({ where: { id }, data: { ownerId: req.user.id } }),
		prisma.activity.create({
			data: { leadId: id, type: "SYSTEM", title: `${req.user.name} assumiu o lead`, authorId: req.user.id },
		}),
	]);
	return ok(res, await loadLead(id));
});

leadsRouter.post("/:id/transfer", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const { ownerId } = parse(transferSchema, req.body);
	const newOwner = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true, active: true } });
	if (!newOwner?.active) throw new HttpError(400, "Responsável inválido");
	await prisma.$transaction([
		prisma.lead.update({ where: { id }, data: { ownerId } }),
		// Quem assume deixa de constar como participante, para não aparecer duas vezes
		prisma.leadParticipant.deleteMany({ where: { leadId: id, userId: ownerId } }),
		prisma.activity.create({
			data: { leadId: id, type: "SYSTEM", title: `Responsável alterado para ${newOwner.name}`, authorId: req.user.id },
		}),
	]);
	const transferred = await loadLead(id);
	notifySafely([ownerId], {
		type: "LEAD_ASSIGNED",
		title: `Lead transferido para você: ${transferred.companyName ?? transferred.name}`,
		body: `${req.user.name} passou este lead para você.`,
		leadId: id,
		actorId: req.user.id,
	});
	return ok(res, transferred);
});

leadsRouter.post("/:id/participants", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const { userId, role } = parse(participantSchema, req.body);
	const [lead, user] = await Promise.all([
		prisma.lead.findUnique({ where: { id }, select: { ownerId: true } }),
		prisma.user.findUnique({ where: { id: userId }, select: userSummarySelect }),
	]);
	if (!lead) throw notFound("Lead");
	if (!user) throw notFound("Usuário");
	if (lead.ownerId === userId) throw new HttpError(400, "Essa pessoa já é a responsável pelo lead");
	await prisma.$transaction([
		prisma.leadParticipant.upsert({
			where: { leadId_userId: { leadId: id, userId } },
			create: { leadId: id, userId, role },
			update: { role },
		}),
		prisma.activity.create({
			data: {
				leadId: id,
				type: "SYSTEM",
				title: `${user.name} adicionado(a) ao processo como ${PARTICIPANT_ROLE_LABELS[role]}`,
				authorId: req.user.id,
			},
		}),
	]);
	const updated = await loadLead(id);
	notifySafely([userId], {
		type: "PARTICIPANT_ADDED",
		title: `Você entrou no processo de ${updated.companyName ?? updated.name}`,
		body: `${req.user.name} adicionou você como ${PARTICIPANT_ROLE_LABELS[role]}.`,
		leadId: id,
		actorId: req.user.id,
	});
	return ok(res, updated, undefined, 201);
});

leadsRouter.delete("/:id/participants/:userId", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const participant = await prisma.leadParticipant.findUnique({
		where: { leadId_userId: { leadId: id, userId: req.params.userId } },
		include: { user: { select: { name: true } } },
	});
	if (!participant) throw notFound("Participante");
	await prisma.$transaction([
		prisma.leadParticipant.delete({ where: { id: participant.id } }),
		prisma.activity.create({
			data: {
				leadId: id,
				type: "SYSTEM",
				title: `${participant.user.name} removido(a) do processo`,
				authorId: req.user.id,
			},
		}),
	]);
	return ok(res, await loadLead(id));
});

leadsRouter.get("/:id/history", async (req, res) => {
	const id = leadIdParam(req.params.id);
	const events = await prisma.stageEvent.findMany({
		where: { leadId: id },
		orderBy: { createdAt: "asc" },
		include: { user: { select: userSummarySelect } },
	});
	return ok(res, events);
});
