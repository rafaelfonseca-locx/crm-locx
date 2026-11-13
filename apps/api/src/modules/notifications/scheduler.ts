import { env } from "../../config/env.js";
import { renderEmail, sendEmail } from "../../lib/mailer.js";
import { prisma } from "../../lib/prisma.js";
import { leadUrl, notify } from "./notifications.service.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DIGEST_HOUR = 8;

const formatTime = (date: Date) =>
	date.toLocaleTimeString("pt-BR", { timeZone: env.APP_TIMEZONE, hour: "2-digit", minute: "2-digit" });
const formatDay = (date: Date) =>
	date.toLocaleDateString("pt-BR", { timeZone: env.APP_TIMEZONE, day: "2-digit", month: "2-digit" });
const leadName = (lead: { name: string; companyName: string | null }) => lead.companyName ?? lead.name;

/** Data (AAAA-MM-DD) e hora no fuso da empresa. */
function localNow(now = new Date()) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: env.APP_TIMEZONE,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			hourCycle: "h23",
		})
			.formatToParts(now)
			.map((p) => [p.type, p.value]),
	);
	return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export async function notifyMeetingsSoon(now = new Date()) {
	const meetings = await prisma.activity.findMany({
		where: {
			type: "MEETING",
			completedAt: null,
			assigneeId: { not: null },
			dueAt: { gte: now, lte: new Date(now.getTime() + 15 * MINUTE) },
		},
		include: { lead: { select: { id: true, name: true, companyName: true } } },
	});
	for (const meeting of meetings) {
		if (!meeting.dueAt) continue;
		await notify([meeting.assigneeId], {
			type: "MEETING_SOON",
			title: `Reunião às ${formatTime(meeting.dueAt)}: ${leadName(meeting.lead)}`,
			body: meeting.meetingUrl ? `Link: ${meeting.meetingUrl}` : meeting.title,
			leadId: meeting.leadId,
			dedupeKey: `meeting-soon:${meeting.id}:${meeting.dueAt.toISOString()}`,
		});
	}
}

export async function notifyOverdueTasks(now = new Date()) {
	const tasks = await prisma.activity.findMany({
		where: {
			type: "TASK",
			completedAt: null,
			assigneeId: { not: null },
			dueAt: { lt: now, gte: new Date(now.getTime() - 24 * HOUR) },
		},
		include: { lead: { select: { id: true, name: true, companyName: true } } },
	});
	for (const task of tasks) {
		if (!task.dueAt) continue;
		await notify([task.assigneeId], {
			type: "TASK_OVERDUE",
			title: `Tarefa atrasada: ${task.title ?? "Tarefa"}`,
			body: leadName(task.lead),
			leadId: task.leadId,
			dedupeKey: `task-overdue:${task.id}:${task.dueAt.toISOString()}`,
		});
	}
}

export async function notifyTrialsEnding(now = new Date()) {
	const trials = await prisma.trial.findMany({
		where: { status: "ACTIVE", endDate: { gte: now, lte: new Date(now.getTime() + 24 * HOUR) } },
		include: {
			lead: {
				select: { id: true, name: true, companyName: true, ownerId: true, participants: { select: { userId: true } } },
			},
		},
	});
	for (const trial of trials) {
		await notify([trial.lead.ownerId, ...trial.lead.participants.map((p) => p.userId)], {
			type: "TRIAL_ENDING",
			title: `Trial termina ${formatDay(trial.endDate)}: ${leadName(trial.lead)}`,
			body: "Hora de apresentar a proposta e levar para a decisão.",
			leadId: trial.lead.id,
			dedupeKey: `trial-ending:${trial.id}:${trial.endDate.toISOString()}`,
		});
	}
}

/** Resumo por e-mail: atrasadas, agenda do dia e trials terminando. Uma vez por dia, às 8h. */
export async function sendDailyDigests(now = new Date()) {
	const { date, hour } = localNow(now);
	if (hour < DIGEST_HOUR) return;
	const key = `dailyDigest:${date}`;
	if (await prisma.setting.findUnique({ where: { key } })) return;
	await prisma.setting.create({ data: { key, value: { sentAt: now.toISOString() } } });

	const endOfDay = new Date(now.getTime() + (24 - hour) * HOUR);
	const users = await prisma.user.findMany({ where: { active: true, emailDailyDigest: true } });
	for (const user of users) {
		const [activities, trials] = await Promise.all([
			prisma.activity.findMany({
				where: { assigneeId: user.id, completedAt: null, type: { in: ["TASK", "MEETING"] }, dueAt: { lte: endOfDay } },
				include: { lead: { select: { id: true, name: true, companyName: true } } },
				orderBy: { dueAt: "asc" },
				take: 30,
			}),
			prisma.trial.findMany({
				where: {
					status: "ACTIVE",
					endDate: { lte: new Date(now.getTime() + 2 * 24 * HOUR) },
					lead: { OR: [{ ownerId: user.id }, { participants: { some: { userId: user.id } } }] },
				},
				include: { lead: { select: { id: true, name: true, companyName: true } } },
			}),
		]);
		if (activities.length === 0 && trials.length === 0) continue;
		const overdue = activities.filter((a) => a.dueAt && a.dueAt < now);
		const today = activities.filter((a) => a.dueAt && a.dueAt >= now);
		const items = [
			...overdue.map((a) => ({
				label: `Atrasada · ${a.title ?? "Tarefa"}`,
				detail: `${leadName(a.lead)} · venceu ${a.dueAt ? formatDay(a.dueAt) : ""}`,
				href: leadUrl(a.leadId),
			})),
			...today.map((a) => ({
				label: `${a.type === "MEETING" ? "Reunião" : "Tarefa"} · ${a.title ?? ""}`,
				detail: `${leadName(a.lead)} · ${a.dueAt ? formatTime(a.dueAt) : ""}`,
				href: leadUrl(a.leadId),
			})),
			...trials.map((t) => ({
				label: `Trial termina ${formatDay(t.endDate)}`,
				detail: leadName(t.lead),
				href: leadUrl(t.lead.id),
			})),
		];
		await sendEmail(
			user.email,
			`Seu dia no CRM: ${overdue.length} atrasada(s), ${today.length} para hoje`,
			renderEmail({
				title: `Bom dia, ${user.name.split(" ")[0]}!`,
				paragraphs: [
					`Você tem ${overdue.length} atividade(s) atrasada(s), ${today.length} para hoje e ${trials.length} trial(s) terminando.`,
				],
				items,
				cta: { label: "Abrir a agenda", href: `${env.WEB_ORIGIN.split(",")[0].trim()}/agenda` },
			}),
		);
	}
}

type Job = { name: string; everyMs: number; run: () => Promise<void> };
const extraJobs: Job[] = [];

/** Outros módulos (ex.: transcrições do Google) registram tarefas periódicas aqui. */
export function registerJob(job: Job) {
	extraJobs.push(job);
}

export function startScheduler() {
	const jobs: Job[] = [
		{ name: "reuniões em breve", everyMs: MINUTE, run: () => notifyMeetingsSoon() },
		{ name: "tarefas atrasadas", everyMs: 5 * MINUTE, run: () => notifyOverdueTasks() },
		{ name: "trials terminando", everyMs: 30 * MINUTE, run: () => notifyTrialsEnding() },
		{ name: "resumo diário", everyMs: 5 * MINUTE, run: () => sendDailyDigests() },
		...extraJobs,
	];
	for (const job of jobs) {
		let running = false;
		const tick = async () => {
			if (running) return;
			running = true;
			try {
				await job.run();
			} catch (error) {
				console.error(`Falha na tarefa agendada "${job.name}":`, error instanceof Error ? error.message : error);
			} finally {
				running = false;
			}
		};
		setTimeout(tick, 5000);
		setInterval(tick, job.everyMs);
	}
}
