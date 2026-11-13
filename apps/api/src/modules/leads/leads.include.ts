import type { Prisma } from "@prisma/client";

export const userSummarySelect = {
	id: true,
	name: true,
	email: true,
	color: true,
	role: true,
	avatarUrl: true,
} satisfies Prisma.UserSelect;

/** Último encerramento (ganho ou perdido), para saber quem marcou e quando. */
function closingEvent() {
	return {
		where: { toStatus: { in: ["WON", "LOST"] } },
		orderBy: { createdAt: "desc" },
		take: 1,
		select: { createdAt: true, toStatus: true, user: { select: userSummarySelect } },
	} satisfies Prisma.Lead$stageEventsArgs;
}

const referrerSelect = { id: true, name: true, companyName: true } satisfies Prisma.LeadSelect;

export const leadListInclude = {
	owner: { select: userSummarySelect },
	referredBy: { select: referrerSelect },
	participants: { include: { user: { select: userSummarySelect } }, orderBy: { createdAt: "asc" } },
	trial: { include: { checklist: { orderBy: { position: "asc" } } } },
	activities: {
		where: { type: { in: ["TASK", "MEETING"] }, completedAt: null },
		orderBy: { dueAt: "asc" },
		take: 1,
		select: { id: true, type: true, title: true, dueAt: true },
	},
	_count: { select: { activities: true } },
	stageEvents: closingEvent(),
} satisfies Prisma.LeadInclude;

export const leadDetailInclude = {
	owner: { select: userSummarySelect },
	referredBy: { select: referrerSelect },
	participants: { include: { user: { select: userSummarySelect } }, orderBy: { createdAt: "asc" } },
	trial: {
		include: { checklist: { orderBy: { position: "asc" }, include: { doneBy: { select: userSummarySelect } } } },
	},
	stageEvents: closingEvent(),
} satisfies Prisma.LeadInclude;

type LeadList = Prisma.LeadGetPayload<{ include: typeof leadListInclude }>;

/** Converte o lead para o formato da API, com a próxima atividade em destaque. */
export function serializeLead(lead: LeadList | Prisma.LeadGetPayload<{ include: typeof leadDetailInclude }>) {
	const { activities, stageEvents, ...rest } = lead as LeadList;
	const closing = lead.status === "OPEN" ? null : (stageEvents?.[0] ?? null);
	return {
		...rest,
		estimatedValue: lead.estimatedValue === null ? null : Number(lead.estimatedValue),
		nextActivity: activities?.[0] ?? null,
		// Quem fechou: o responsável pelo lead; sem responsável, quem marcou como ganho ou perdido
		closedBy: lead.status === "OPEN" ? null : (lead.owner ?? closing?.user ?? null),
		closedMarkedBy: closing?.user ?? null,
		referredBy: lead.referredBy ?? null,
	};
}
