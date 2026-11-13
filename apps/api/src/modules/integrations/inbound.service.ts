import type { LeadChannel, Prisma } from "@prisma/client";
import { type Qualification, normalizePlan, temperatureFromTimeline } from "./qualification.js";

export type AssignmentMode = "ROUND_ROBIN" | "UNASSIGNED";
export const ASSIGNMENT_SETTING_KEY = "leadAssignment";
export const FIRST_CONTACT_SLA_MINUTES = 60;

type Tx = Prisma.TransactionClient;

/** Dados de um lead que chega por integração (RD Station ou Cal.com). */
export type InboundLead = Partial<Qualification> & {
	name: string;
	email: string | null;
	phone?: string | null;
	jobTitle?: string | null;
	companyName?: string | null;
	companySize?: string | null;
	segment?: string | null;
	website?: string | null;
	city?: string | null;
	channel: LeadChannel;
	source: string;
	utmSource?: string | null;
	utmMedium?: string | null;
	utmCampaign?: string | null;
	conversionIdentifier?: string | null;
	conversionCount?: number;
	rdLeadId?: string | null;
	rdPublicUrl?: string | null;
	tags?: string[];
};

/** Rodízio: quem recebeu lead há mais tempo recebe o próximo. */
export async function pickNextOwner(tx: Tx): Promise<string | null> {
	const setting = await tx.setting.findUnique({ where: { key: ASSIGNMENT_SETTING_KEY } });
	if ((setting?.value as { mode?: string } | null)?.mode === "UNASSIGNED") return null;
	const next = await tx.user.findFirst({
		where: { active: true, receivesLeads: true },
		orderBy: [{ lastAssignedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
	});
	if (!next) return null;
	await tx.user.update({ where: { id: next.id }, data: { lastAssignedAt: new Date() } });
	return next.id;
}

const QUALIFICATION_KEYS = [
	"businessType",
	"managementRole",
	"contractsRange",
	"currentTool",
	"startTimeline",
] as const;

/** Preenche só o que o lead ainda não tem, sem sobrescrever o que o time já editou. */
function fillMissing(existing: Record<string, unknown>, incoming: InboundLead) {
	const data: Record<string, unknown> = {};
	const keys = [
		"phone",
		"companyName",
		"jobTitle",
		"companySize",
		"segment",
		"website",
		"city",
		"state",
		...QUALIFICATION_KEYS,
	] as const;
	for (const key of keys) {
		const value = incoming[key as keyof InboundLead];
		if (!existing[key] && value) data[key] = value;
	}
	const plan = normalizePlan(incoming.planInterest);
	if (!existing.plan && plan) data.plan = plan;
	return data;
}

export type InboundResult = { leadId: number; ownerId: string | null; created: boolean; reactivated: boolean };

/**
 * Cria o lead ou registra a nova conversão no lead existente (mesmo id do RD ou mesmo e-mail).
 * Lead perdido que converte de novo volta para Novo lead.
 */
export async function upsertInboundLead(
	tx: Tx,
	data: InboundLead,
	options: { eventLabel: string; preferredOwnerId?: string | null; skipFirstContactTask?: boolean },
): Promise<InboundResult> {
	const existing = await tx.lead.findFirst({
		where: {
			OR: [...(data.rdLeadId ? [{ rdLeadId: data.rdLeadId }] : []), ...(data.email ? [{ email: data.email }] : [])],
		},
		orderBy: { createdAt: "desc" },
	});

	if (existing) {
		const reactivated = existing.status === "LOST";
		const upgradeChannel = data.channel === "DEMO" && existing.channel !== "DEMO";
		await tx.lead.update({
			where: { id: existing.id },
			data: {
				...fillMissing(existing as unknown as Record<string, unknown>, data),
				conversionCount: { increment: 1 },
				rdLeadId: existing.rdLeadId ?? data.rdLeadId ?? null,
				rdPublicUrl: data.rdPublicUrl ?? existing.rdPublicUrl,
				...(upgradeChannel ? { channel: "DEMO" } : {}),
				...(!existing.temperature && temperatureFromTimeline(data.startTimeline)
					? { temperature: temperatureFromTimeline(data.startTimeline) }
					: {}),
				...(reactivated
					? { status: "OPEN", stage: "NEW", lostAt: null, lostReason: null, stageChangedAt: new Date() }
					: {}),
			},
		});
		if (reactivated) {
			await tx.stageEvent.create({
				data: { leadId: existing.id, fromStage: existing.stage, toStage: "NEW", fromStatus: "LOST", toStatus: "OPEN" },
			});
		}
		await tx.activity.create({
			data: {
				leadId: existing.id,
				type: "SYSTEM",
				title: reactivated ? `Lead reativado: ${options.eventLabel}` : options.eventLabel,
				metadata: { utmSource: data.utmSource, utmMedium: data.utmMedium, utmCampaign: data.utmCampaign },
			},
		});
		return { leadId: existing.id, ownerId: existing.ownerId, created: false, reactivated };
	}

	const ownerId = options.preferredOwnerId ?? (await pickNextOwner(tx));
	const lead = await tx.lead.create({
		data: {
			name: data.name,
			email: data.email,
			phone: data.phone ?? null,
			jobTitle: data.jobTitle ?? null,
			companyName: data.companyName ?? null,
			companySize: data.companySize ?? null,
			segment: data.segment ?? null,
			website: data.website ?? null,
			city: data.city ?? null,
			state: data.state ?? null,
			businessType: data.businessType ?? null,
			managementRole: data.managementRole ?? null,
			contractsRange: data.contractsRange ?? null,
			currentTool: data.currentTool ?? null,
			startTimeline: data.startTimeline ?? null,
			plan: normalizePlan(data.planInterest),
			temperature: temperatureFromTimeline(data.startTimeline),
			channel: data.channel,
			source: data.source,
			utmSource: data.utmSource ?? null,
			utmMedium: data.utmMedium ?? null,
			utmCampaign: data.utmCampaign ?? null,
			conversionIdentifier: data.conversionIdentifier ?? null,
			conversionCount: data.conversionCount ?? 1,
			rdLeadId: data.rdLeadId ?? null,
			rdPublicUrl: data.rdPublicUrl ?? null,
			tags: data.tags ?? [],
			ownerId,
		},
	});
	await tx.stageEvent.create({ data: { leadId: lead.id, toStage: "NEW", toStatus: "OPEN" } });
	await tx.activity.create({ data: { leadId: lead.id, type: "SYSTEM", title: options.eventLabel } });

	if (ownerId && !options.skipFirstContactTask) {
		const isWhatsapp = data.channel === "WHATSAPP";
		const isDemo = data.channel === "DEMO";
		await tx.activity.create({
			data: {
				leadId: lead.id,
				type: "TASK",
				title: isDemo
					? "Confirmar a demonstração agendada"
					: isWhatsapp
						? "Fazer o pré-atendimento pelo WhatsApp"
						: "Fazer o primeiro contato",
				body: isDemo
					? "O lead pediu demonstração. Confira se a reunião está na agenda e confirme presença."
					: "Lead novo. Quanto mais rápido o contato, maior a chance de conversão.",
				dueAt: new Date(Date.now() + FIRST_CONTACT_SLA_MINUTES * 60 * 1000),
				assigneeId: ownerId,
			},
		});
	}
	return { leadId: lead.id, ownerId, created: true, reactivated: false };
}
