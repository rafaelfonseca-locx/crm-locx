import type { Prisma } from "@prisma/client";

export const userSummarySelect = {
	id: true,
	name: true,
	email: true,
	color: true,
	role: true,
	avatarUrl: true,
} satisfies Prisma.UserSelect;

export const leadListInclude = {
	owner: { select: userSummarySelect },
	participants: { include: { user: { select: userSummarySelect } }, orderBy: { createdAt: "asc" } },
	trial: { include: { checklist: { orderBy: { position: "asc" } } } },
	activities: {
		where: { type: { in: ["TASK", "MEETING"] }, completedAt: null },
		orderBy: { dueAt: "asc" },
		take: 1,
		select: { id: true, type: true, title: true, dueAt: true },
	},
	_count: { select: { activities: true } },
} satisfies Prisma.LeadInclude;

export const leadDetailInclude = {
	owner: { select: userSummarySelect },
	participants: { include: { user: { select: userSummarySelect } }, orderBy: { createdAt: "asc" } },
	trial: {
		include: { checklist: { orderBy: { position: "asc" }, include: { doneBy: { select: userSummarySelect } } } },
	},
} satisfies Prisma.LeadInclude;

type LeadList = Prisma.LeadGetPayload<{ include: typeof leadListInclude }>;

/** Converte o lead para o formato da API, com a próxima atividade em destaque. */
export function serializeLead(lead: LeadList | Prisma.LeadGetPayload<{ include: typeof leadDetailInclude }>) {
	const { activities, ...rest } = lead as LeadList;
	return {
		...rest,
		estimatedValue: lead.estimatedValue === null ? null : Number(lead.estimatedValue),
		nextActivity: activities?.[0] ?? null,
	};
}
