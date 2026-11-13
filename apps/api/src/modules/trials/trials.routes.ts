import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { HttpError, notFound, ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { leadListInclude, serializeLead, userSummarySelect } from "../leads/leads.include.js";
import { moveStage } from "../leads/leads.service.js";

export const trialsRouter = Router();

const DAY = 24 * 60 * 60 * 1000;

/** Roteiro padrão de acompanhamento, distribuído ao longo da duração do trial. */
export function buildChecklist(durationDays: number) {
	const middle = Math.max(2, Math.floor(durationDays / 2));
	return [
		{ dayOffset: 0, title: "Kickoff e configuração da conta de teste" },
		{ dayOffset: 1, title: "Check-in de primeiros passos" },
		{ dayOffset: middle, title: "Acompanhamento de uso e dúvidas" },
		{ dayOffset: durationDays - 1, title: "Apresentação de resultados e proposta" },
		{ dayOffset: durationDays, title: "Decisão e fechamento" },
	].map((item, position) => ({ ...item, position }));
}

const startSchema = z.object({
	startDate: z.coerce.date({ required_error: "Data de início é obrigatória", invalid_type_error: "Data inválida" }),
	durationDays: z.coerce
		.number()
		.int()
		.min(5, "O trial deve durar entre 5 e 7 dias")
		.max(7, "O trial deve durar entre 5 e 7 dias"),
	accountUrl: z.string().trim().max(300).nullish(),
	notes: z.string().trim().max(2000).nullish(),
});

const updateSchema = z.object({
	endDate: z.coerce.date({ invalid_type_error: "Data inválida" }).optional(),
	status: z.enum(["ACTIVE", "EXPIRED", "CANCELED"]).optional(),
	accountUrl: z.string().trim().max(300).nullish(),
	notes: z.string().trim().max(2000).nullish(),
});

const checklistItemSchema = z.object({
	title: z.string({ required_error: "Título é obrigatório" }).trim().min(1, "Título é obrigatório").max(160),
	dayOffset: z.coerce.number().int().min(0).max(30),
});

trialsRouter.get("/trials", async (req, res) => {
	const status = z.enum(["ACTIVE", "ENDED", "ALL"]).default("ACTIVE").parse(req.query.status);
	const mine = req.query.mine === "true";
	const where: Prisma.LeadWhereInput = {
		trial:
			status === "ALL" ? { isNot: null } : status === "ACTIVE" ? { status: "ACTIVE" } : { status: { not: "ACTIVE" } },
	};
	if (mine) where.OR = [{ ownerId: req.user.id }, { participants: { some: { userId: req.user.id } } }];
	const leads = await prisma.lead.findMany({ where, include: leadListInclude });
	const items = leads
		.map(serializeLead)
		.sort((a, b) => (a.trial?.endDate.getTime() ?? 0) - (b.trial?.endDate.getTime() ?? 0));
	return ok(res, status === "ACTIVE" ? items : items.reverse(), items.length);
});

trialsRouter.post("/leads/:id/trial", async (req, res) => {
	const leadId = Number(req.params.id);
	const body = parse(startSchema, req.body);
	const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { trial: true } });
	if (!lead) throw notFound("Lead");
	if (lead.status !== "OPEN") throw new HttpError(400, "Reabra o lead antes de iniciar um trial");
	if (lead.trial?.status === "ACTIVE") throw new HttpError(409, "Este lead já tem um trial em andamento");

	const startDate = body.startDate;
	const endDate = new Date(startDate.getTime() + body.durationDays * DAY);
	await prisma.$transaction(async (tx) => {
		if (lead.trial) await tx.trial.delete({ where: { id: lead.trial.id } });
		await tx.trial.create({
			data: {
				leadId,
				startDate,
				endDate,
				accountUrl: body.accountUrl ?? null,
				notes: body.notes ?? null,
				checklist: { create: buildChecklist(body.durationDays) },
			},
		});
		await tx.activity.create({
			data: {
				leadId,
				type: "SYSTEM",
				title: `Trial de ${body.durationDays} dias iniciado`,
				authorId: req.user.id,
				metadata: { startDate, endDate },
			},
		});
	});
	if (lead.stage !== "TRIAL") await moveStage(leadId, "TRIAL", req.user.id);

	const updated = await prisma.lead.findUniqueOrThrow({ where: { id: leadId }, include: leadListInclude });
	return ok(res, serializeLead(updated), undefined, 201);
});

trialsRouter.patch("/trials/:trialId", async (req, res) => {
	const body = parse(updateSchema, req.body);
	const trial = await prisma.trial.findUnique({ where: { id: req.params.trialId } });
	if (!trial) throw notFound("Trial");
	if (body.endDate && body.endDate <= trial.startDate)
		throw new HttpError(400, "A data de término deve ser depois do início");

	const updated = await prisma.$transaction(async (tx) => {
		const result = await tx.trial.update({ where: { id: trial.id }, data: body });
		if (body.endDate && body.endDate.getTime() !== trial.endDate.getTime()) {
			await tx.activity.create({
				data: {
					leadId: trial.leadId,
					type: "SYSTEM",
					title: `Trial ${body.endDate > trial.endDate ? "estendido" : "encurtado"} até ${body.endDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
					authorId: req.user.id,
				},
			});
		}
		if (body.status && body.status !== trial.status) {
			const labels = { ACTIVE: "reativado", EXPIRED: "encerrado sem conversão", CANCELED: "cancelado" } as const;
			await tx.activity.create({
				data: { leadId: trial.leadId, type: "SYSTEM", title: `Trial ${labels[body.status]}`, authorId: req.user.id },
			});
		}
		return result;
	});
	return ok(res, updated);
});

trialsRouter.post("/trials/:trialId/checklist", async (req, res) => {
	const body = parse(checklistItemSchema, req.body);
	const trial = await prisma.trial.findUnique({
		where: { id: req.params.trialId },
		include: { _count: { select: { checklist: true } } },
	});
	if (!trial) throw notFound("Trial");
	const item = await prisma.trialChecklistItem.create({
		data: { trialId: trial.id, title: body.title, dayOffset: body.dayOffset, position: trial._count.checklist },
	});
	return ok(res, item, undefined, 201);
});

trialsRouter.patch("/trials/:trialId/checklist/:itemId", async (req, res) => {
	const { done } = parse(z.object({ done: z.boolean() }), req.body);
	const item = await prisma.trialChecklistItem.findFirst({
		where: { id: req.params.itemId, trialId: req.params.trialId },
		include: { trial: { select: { leadId: true } } },
	});
	if (!item) throw notFound("Item do checklist");
	const updated = await prisma.$transaction(async (tx) => {
		const result = await tx.trialChecklistItem.update({
			where: { id: item.id },
			data: { done, doneAt: done ? new Date() : null, doneById: done ? req.user.id : null },
			include: { doneBy: { select: userSummarySelect } },
		});
		if (done) {
			await tx.activity.create({
				data: {
					leadId: item.trial.leadId,
					type: "SYSTEM",
					title: `Trial: “${item.title}” concluído`,
					authorId: req.user.id,
				},
			});
		}
		return result;
	});
	return ok(res, updated);
});

trialsRouter.delete("/trials/:trialId/checklist/:itemId", async (req, res) => {
	const item = await prisma.trialChecklistItem.findFirst({
		where: { id: req.params.itemId, trialId: req.params.trialId },
	});
	if (!item) throw notFound("Item do checklist");
	await prisma.trialChecklistItem.delete({ where: { id: item.id } });
	return ok(res, { id: item.id });
});
