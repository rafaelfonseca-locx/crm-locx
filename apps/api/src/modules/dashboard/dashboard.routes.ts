import type { LeadStage, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { ok, parse } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { userSummarySelect } from "../leads/leads.include.js";

export const dashboardRouter = Router();

const STAGE_ORDER: LeadStage[] = ["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"];
const DAY = 24 * 60 * 60 * 1000;

const querySchema = z.object({
	days: z.coerce
		.number()
		.int()
		.refine((v) => [7, 30, 90, 365].includes(v), "Período inválido")
		.default(30),
	ownerId: z.string().optional(),
});

const sumValue = (rows: { estimatedValue: Prisma.Decimal | null }[]) =>
	rows.reduce((acc, r) => acc + Number(r.estimatedValue ?? 0), 0);

dashboardRouter.get("/", async (req, res) => {
	const { days, ownerId } = parse(querySchema, req.query);
	const now = new Date();
	const since = new Date(now.getTime() - days * DAY);
	const prevSince = new Date(since.getTime() - days * DAY);
	const ownerFilter: Prisma.LeadWhereInput = ownerId ? { ownerId } : {};

	const [
		createdLeads,
		prevCreatedCount,
		wonLeads,
		lostLeads,
		openLeads,
		meetings,
		trialsStarted,
		activeTrials,
		users,
		myOpenTasks,
	] = await Promise.all([
		prisma.lead.findMany({
			where: { ...ownerFilter, createdAt: { gte: since } },
			select: {
				id: true,
				stage: true,
				status: true,
				source: true,
				channel: true,
				createdAt: true,
				stageEvents: { select: { toStage: true } },
			},
		}),
		prisma.lead.count({ where: { ...ownerFilter, createdAt: { gte: prevSince, lt: since } } }),
		prisma.lead.findMany({
			where: { ...ownerFilter, status: "WON", wonAt: { gte: since } },
			select: { id: true, ownerId: true, estimatedValue: true, createdAt: true, wonAt: true },
		}),
		prisma.lead.findMany({
			where: { ...ownerFilter, status: "LOST", lostAt: { gte: since } },
			select: { id: true, lostReason: true },
		}),
		prisma.lead.findMany({
			where: { ...ownerFilter, status: "OPEN" },
			select: { id: true, stage: true, ownerId: true, estimatedValue: true },
		}),
		prisma.activity.findMany({
			where: { type: "MEETING", createdAt: { gte: since }, ...(ownerId ? { assigneeId: ownerId } : {}) },
			select: { id: true, assigneeId: true },
		}),
		prisma.trial.count({ where: { createdAt: { gte: since }, ...(ownerId ? { lead: { ownerId } } : {}) } }),
		prisma.trial.findMany({
			where: { status: "ACTIVE", ...(ownerId ? { lead: { ownerId } } : {}) },
			orderBy: { endDate: "asc" },
			include: {
				checklist: { select: { done: true } },
				lead: {
					select: {
						id: true,
						name: true,
						companyName: true,
						estimatedValue: true,
						owner: { select: userSummarySelect },
					},
				},
			},
		}),
		prisma.user.findMany({ where: { active: true }, select: userSummarySelect, orderBy: { name: "asc" } }),
		prisma.activity.findMany({
			where: { assigneeId: req.user.id, completedAt: null, type: { in: ["TASK", "MEETING"] } },
			select: { dueAt: true },
		}),
	]);

	// Funil: quantos leads criados no período chegaram a cada etapa (ou passaram dela)
	const funnel = STAGE_ORDER.map((stage) => ({ stage, count: 0 }));
	for (const lead of createdLeads) {
		const reached = new Set<LeadStage>([lead.stage, ...lead.stageEvents.map((e) => e.toStage)]);
		const maxIndex = Math.max(...[...reached].map((s) => STAGE_ORDER.indexOf(s)));
		for (let i = 0; i <= maxIndex; i++) funnel[i].count++;
	}
	const wonFromCohort = createdLeads.filter((l) => l.status === "WON").length;

	const pipeline = STAGE_ORDER.map((stage) => {
		const rows = openLeads.filter((l) => l.stage === stage);
		return { stage, count: rows.length, value: sumValue(rows) };
	});

	const sources = new Map<string, { source: string; count: number; won: number }>();
	for (const lead of createdLeads) {
		const entry = sources.get(lead.source) ?? { source: lead.source, count: 0, won: 0 };
		entry.count++;
		if (lead.status === "WON") entry.won++;
		sources.set(lead.source, entry);
	}

	const channels = new Map<string, { channel: string; count: number; won: number }>();
	for (const lead of createdLeads) {
		const entry = channels.get(lead.channel) ?? { channel: lead.channel, count: 0, won: 0 };
		entry.count++;
		if (lead.status === "WON") entry.won++;
		channels.set(lead.channel, entry);
	}

	const leadsPerDay = new Map<string, number>();
	for (let i = Math.min(days, 90) - 1; i >= 0; i--) {
		leadsPerDay.set(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10), 0);
	}
	for (const lead of createdLeads) {
		const key = lead.createdAt.toISOString().slice(0, 10);
		if (leadsPerDay.has(key)) leadsPerDay.set(key, (leadsPerDay.get(key) ?? 0) + 1);
	}

	const lostReasons = new Map<string, number>();
	for (const lead of lostLeads) {
		const reason = lead.lostReason ?? "Sem motivo";
		lostReasons.set(reason, (lostReasons.get(reason) ?? 0) + 1);
	}

	const team = users
		.filter((u) => !ownerId || u.id === ownerId)
		.map((user) => {
			const won = wonLeads.filter((l) => l.ownerId === user.id);
			const open = openLeads.filter((l) => l.ownerId === user.id);
			return {
				user,
				openLeads: open.length,
				pipelineValue: sumValue(open),
				meetings: meetings.filter((m) => m.assigneeId === user.id).length,
				activeTrials: activeTrials.filter((t) => t.lead.owner?.id === user.id).length,
				won: won.length,
				wonValue: sumValue(won),
			};
		})
		.sort((a, b) => b.wonValue - a.wonValue || b.won - a.won);

	const cycleDays = wonLeads.map((l) => ((l.wonAt?.getTime() ?? 0) - l.createdAt.getTime()) / DAY);
	const closed = wonLeads.length + lostLeads.length;
	const startOfTomorrow = new Date(now);
	startOfTomorrow.setHours(24, 0, 0, 0);

	return ok(res, {
		period: { days, since },
		kpis: {
			newLeads: createdLeads.length,
			newLeadsPrev: prevCreatedCount,
			meetings: meetings.length,
			trialsStarted,
			activeTrials: activeTrials.length,
			won: wonLeads.length,
			wonValue: sumValue(wonLeads),
			lost: lostLeads.length,
			winRate: closed ? wonLeads.length / closed : null,
			leadToWinRate: createdLeads.length ? wonFromCohort / createdLeads.length : null,
			avgCycleDays: cycleDays.length ? cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length : null,
			openLeads: openLeads.length,
			pipelineValue: sumValue(openLeads),
		},
		funnel: [...funnel, { stage: "WON", count: wonFromCohort }],
		pipeline,
		sources: [...sources.values()].sort((a, b) => b.count - a.count),
		channels: [...channels.values()].sort((a, b) => b.count - a.count),
		leadsPerDay: [...leadsPerDay.entries()].map(([date, count]) => ({ date, count })),
		lostReasons: [...lostReasons.entries()]
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count),
		team,
		trialsEnding: activeTrials
			.filter((t) => t.endDate.getTime() - now.getTime() <= 2 * DAY)
			.map((t) => ({
				id: t.id,
				startDate: t.startDate,
				endDate: t.endDate,
				checklistDone: t.checklist.filter((c) => c.done).length,
				checklistTotal: t.checklist.length,
				lead: { ...t.lead, estimatedValue: t.lead.estimatedValue === null ? null : Number(t.lead.estimatedValue) },
			})),
		myAgenda: {
			overdue: myOpenTasks.filter((t) => t.dueAt && t.dueAt < now).length,
			today: myOpenTasks.filter((t) => t.dueAt && t.dueAt >= now && t.dueAt < startOfTomorrow).length,
		},
	});
});
