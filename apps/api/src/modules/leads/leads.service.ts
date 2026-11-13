import type { LeadStage, LeadStatus, Prisma } from "@prisma/client";
import { HttpError, notFound } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";

export const STAGE_LABELS: Record<LeadStage, string> = {
	NEW: "Novo lead",
	QUALIFICATION: "Pré-atendimento",
	MEETING: "Reunião",
	TRIAL: "Trial",
	CLOSING: "Venda",
};

type Tx = Prisma.TransactionClient;

async function getLeadOrFail(tx: Tx, id: number) {
	const lead = await tx.lead.findUnique({ where: { id } });
	if (!lead) throw notFound("Lead");
	return lead;
}

async function recordTransition(
	tx: Tx,
	lead: { id: number; stage: LeadStage; status: LeadStatus },
	to: { stage: LeadStage; status: LeadStatus },
	userId: string | null,
	description: string,
) {
	await tx.stageEvent.create({
		data: {
			leadId: lead.id,
			fromStage: lead.stage,
			toStage: to.stage,
			fromStatus: lead.status,
			toStatus: to.status,
			userId,
		},
	});
	await tx.activity.create({
		data: {
			leadId: lead.id,
			type: "STAGE_CHANGE",
			title: description,
			authorId: userId,
			metadata: { fromStage: lead.stage, toStage: to.stage, fromStatus: lead.status, toStatus: to.status },
		},
	});
}

export async function moveStage(leadId: number, stage: LeadStage, userId: string) {
	return prisma.$transaction(async (tx) => {
		const lead = await getLeadOrFail(tx, leadId);
		if (lead.status !== "OPEN") throw new HttpError(400, "Reabra o lead antes de mudar a etapa");
		if (lead.stage === stage) return lead;
		await recordTransition(
			tx,
			lead,
			{ stage, status: "OPEN" },
			userId,
			`Movido de ${STAGE_LABELS[lead.stage]} para ${STAGE_LABELS[stage]}`,
		);
		return tx.lead.update({ where: { id: leadId }, data: { stage, stageChangedAt: new Date() } });
	});
}

export async function markAsWon(
	leadId: number,
	data: { estimatedValue?: number | null; plan?: string | null; note?: string | null },
	userId: string,
) {
	return prisma.$transaction(async (tx) => {
		const lead = await getLeadOrFail(tx, leadId);
		if (lead.status === "WON") throw new HttpError(400, "Este lead já está marcado como ganho");
		await recordTransition(tx, lead, { stage: "CLOSING", status: "WON" }, userId, "Venda ganha 🎉");
		if (data.note) {
			await tx.activity.create({ data: { leadId, type: "NOTE", body: data.note, authorId: userId } });
		}
		await tx.trial.updateMany({ where: { leadId, status: "ACTIVE" }, data: { status: "CONVERTED" } });
		return tx.lead.update({
			where: { id: leadId },
			data: {
				status: "WON",
				stage: "CLOSING",
				wonAt: new Date(),
				lostAt: null,
				lostReason: null,
				stageChangedAt: new Date(),
				...(data.estimatedValue !== undefined && data.estimatedValue !== null
					? { estimatedValue: data.estimatedValue }
					: {}),
				...(data.plan ? { plan: data.plan } : {}),
			},
		});
	});
}

export async function markAsLost(leadId: number, data: { reason: string; note?: string | null }, userId: string) {
	return prisma.$transaction(async (tx) => {
		const lead = await getLeadOrFail(tx, leadId);
		if (lead.status === "LOST") throw new HttpError(400, "Este lead já está marcado como perdido");
		await recordTransition(
			tx,
			lead,
			{ stage: lead.stage, status: "LOST" },
			userId,
			`Marcado como perdido: ${data.reason}`,
		);
		if (data.note) {
			await tx.activity.create({ data: { leadId, type: "NOTE", body: data.note, authorId: userId } });
		}
		await tx.trial.updateMany({ where: { leadId, status: "ACTIVE" }, data: { status: "CANCELED" } });
		return tx.lead.update({
			where: { id: leadId },
			data: { status: "LOST", lostAt: new Date(), wonAt: null, lostReason: data.reason },
		});
	});
}

export async function reopen(leadId: number, userId: string) {
	return prisma.$transaction(async (tx) => {
		const lead = await getLeadOrFail(tx, leadId);
		if (lead.status === "OPEN") throw new HttpError(400, "Este lead já está em aberto");
		await recordTransition(tx, lead, { stage: lead.stage, status: "OPEN" }, userId, "Lead reaberto");
		return tx.lead.update({
			where: { id: leadId },
			data: { status: "OPEN", wonAt: null, lostAt: null, lostReason: null, stageChangedAt: new Date() },
		});
	});
}
