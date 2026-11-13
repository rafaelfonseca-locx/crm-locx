import { readFileSync } from "node:fs";
import {
	type ActivityType,
	type LeadStage,
	type LeadStatus,
	type LeadTemperature,
	Prisma,
	PrismaClient,
	type TrialStatus,
} from "@prisma/client";

/**
 * Importa a base do "Handoff RE Patrimonial" (HTML com `const DATA = {...}` ou o JSON puro).
 *
 *   npm run db:import -- caminho/Handoff_RE_Patrimonial.html
 *
 * - Pode rodar mais de uma vez: leads já importados (mesma referência) ou com e-mail já cadastrado são pulados.
 * - Responsáveis que não estão no time entram sem responsável; o nome original fica no histórico.
 * - Pausados entram como perdidos com motivo "Pausado" (dá para reabrir).
 * O arquivo tem dados pessoais: não coloque no repositório.
 */

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

type HandoffLead = {
	id: string;
	grupo: "proposta" | "trial" | "demo" | "qualificar" | "pausado" | "cliente" | "perdido";
	nome: string;
	empresa: string | null;
	email: string | null;
	tel: string | null;
	chegada: string | null;
	origem: string | null;
	resp: string | null;
	farol: string | null;
	estagio: string | null;
	carteira: string | null;
	plano: string | null;
	demo: string | null;
	trial: string | null;
	link: string | null;
	decisor: string | null;
	perda: string | null;
	resumo: string | null;
	proximo: string | null;
	dono: string | null;
	acao: string | null;
	reuniao: { data: string; link?: string | null; texto: string } | null;
	empresaInfo: { nome?: string; texto?: string; fontes?: { rot: string; url: string }[] } | null;
	tempo: [string, string][];
	notas: [string, string][];
};

const PLAN_PRICES: Record<string, { monthly: number | null; annual: number | null }> = {
	Basic: { monthly: 490, annual: 392 },
	Pro: { monthly: 1215, annual: 972 },
	Premium: { monthly: 2400, annual: 1920 },
	Enterprise: { monthly: null, annual: null },
};

const LOST_REASONS: Record<string, string> = {
	"sem contato": "Sem resposta",
	"timing / adiado": "Momento inadequado",
	preço: "Preço",
	funcionalidade: "Sem fit com o produto",
	"testar outros apps": "Escolheu concorrente",
	"aprovação pendente": "Outro",
	outro: "Outro",
};

export function loadHandoff(path: string): HandoffLead[] {
	const raw = readFileSync(path, "utf-8");
	if (path.toLowerCase().endsWith(".json")) return (JSON.parse(raw) as { leads: HandoffLead[] }).leads;
	const match = raw.match(/const DATA = (\{[\s\S]*?\});\s*\n/);
	if (!match) throw new Error("Não encontrei os dados (const DATA = ...) no arquivo");
	return (JSON.parse(match[1]) as { leads: HandoffLead[] }).leads;
}

/** "07/10/2026" → data ao meio-dia de Brasília. */
export function parseFullDate(value: string | null | undefined): Date | null {
	const m = value?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
	return m ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 15)) : null;
}

/** "07/10" → data no ano que faz sentido a partir da chegada do lead. */
export function parseShortDate(value: string, reference: Date | null): Date | null {
	const m = value.match(/(\d{2})\/(\d{2})/);
	if (!m) return null;
	const base = reference ?? new Date();
	let date = new Date(Date.UTC(base.getUTCFullYear(), Number(m[2]) - 1, Number(m[1]), 15));
	if (reference && date.getTime() < reference.getTime() - 31 * DAY)
		date = new Date(Date.UTC(base.getUTCFullYear() + 1, Number(m[2]) - 1, Number(m[1]), 15));
	if (!reference && date.getTime() > Date.now() + 60 * DAY)
		date = new Date(Date.UTC(base.getUTCFullYear() - 1, Number(m[2]) - 1, Number(m[1]), 15));
	return date;
}

export function parsePlan(value: string | null) {
	if (!value) return { plan: null, billingCycle: null, value: null };
	const name = ["Enterprise", "Premium", "Basic", "Pro"].find((p) => new RegExp(`\\b${p}\\b`, "i").test(value)) ?? null;
	if (!name) return { plan: null, billingCycle: null, value: null };
	const billingCycle = name === "Enterprise" ? null : /anual/i.test(value) ? ("ANNUAL" as const) : ("MONTHLY" as const);
	const price = PLAN_PRICES[name];
	return {
		plan: name,
		billingCycle,
		value: billingCycle === "ANNUAL" ? price.annual : billingCycle ? price.monthly : null,
	};
}

/** Quantidade de imóveis/contratos → faixa usada nos formulários de holding. */
export function contractsBucket(value: string | null): string | null {
	if (!value) return null;
	if (!/^\d+$/.test(value.trim())) return value.trim();
	const n = Number(value);
	if (n <= 5) return "1 a 5";
	if (n <= 25) return "6 a 25";
	if (n <= 50) return "26 a 50";
	if (n <= 100) return "51 a 100";
	return "Mais de 100";
}

function stageFromEstagio(estagio: string | null): LeadStage {
	const e = (estagio ?? "").toLowerCase();
	if (/trial|ambiente/.test(e)) return "TRIAL";
	if (/negocia|termo|vendido/.test(e)) return "CLOSING";
	if (/apresenta|oferta/.test(e)) return "MEETING";
	return "QUALIFICATION";
}

export function mapStage(lead: HandoffLead): { stage: LeadStage; status: LeadStatus; lostReason: string | null } {
	switch (lead.grupo) {
		case "qualificar":
			return { stage: "QUALIFICATION", status: "OPEN", lostReason: null };
		case "demo":
			return { stage: "MEETING", status: "OPEN", lostReason: null };
		case "trial":
			return { stage: "TRIAL", status: "OPEN", lostReason: null };
		case "proposta":
			return { stage: "CLOSING", status: "OPEN", lostReason: null };
		case "cliente":
			return { stage: "CLOSING", status: "WON", lostReason: null };
		case "pausado":
			return { stage: stageFromEstagio(lead.estagio), status: "LOST", lostReason: "Pausado" };
		default:
			return {
				stage: stageFromEstagio(lead.estagio),
				status: "LOST",
				lostReason: LOST_REASONS[(lead.perda ?? "").toLowerCase()] ?? (lead.perda ? "Outro" : "Sem resposta"),
			};
	}
}

const TEMPERATURES: Record<string, LeadTemperature> = { QUENTE: "HOT", MORNO: "WARM", FRIO: "COLD" };

function trialDates(text: string | null) {
	if (!text) return null;
	const get = (label: string) => parseFullDate(text.match(new RegExp(`${label}\\s+(\\d{2}/\\d{2}/\\d{4})`, "i"))?.[1]);
	const start = get("início") ?? get("inicio") ?? get("liberado");
	if (!start) return null;
	return { start, end: get("fim") ?? new Date(start.getTime() + 7 * DAY) };
}

async function importLead(lead: HandoffLead, team: { id: string; name: string }[]) {
	const externalRef = `handoff:${lead.id}`;
	const emails = (lead.email ?? "")
		.split(/[/,;]/)
		.map((e) => e.trim().toLowerCase())
		.filter((e) => e.includes("@"));
	const email = emails[0] ?? null;

	const duplicate = await prisma.lead.findFirst({
		where: { OR: [{ externalRef }, ...(email ? [{ email }] : [])] },
		select: { id: true },
	});
	if (duplicate) return { status: "skipped" as const, leadId: duplicate.id };

	const owner = lead.resp
		? team.find((u) => u.name.toLowerCase().split(" ")[0] === lead.resp?.toLowerCase().trim())
		: undefined;
	const arrival = parseFullDate(lead.chegada) ?? parseShortDate(lead.tempo?.[0]?.[0] ?? "", null) ?? new Date();
	const timeline = (lead.tempo ?? [])
		.map(([date, text]) => ({ at: parseShortDate(date, arrival) ?? arrival, text }))
		.sort((a, b) => a.at.getTime() - b.at.getTime());
	const lastTouch = timeline.at(-1)?.at ?? arrival;
	const { stage, status, lostReason } = mapStage(lead);
	const plan = parsePlan(lead.plano);
	const demoDate = parseFullDate(lead.demo);
	const scheduledDemo = timeline.some((t) => /agend\w* (a )?demonstra/i.test(t.text));
	const channel = /site|google ads/i.test(lead.origem ?? "") ? (scheduledDemo ? "DEMO" : "SITE") : "MANUAL";

	const notes = [
		lead.resumo,
		lead.proximo ? `Próximo passo: ${lead.proximo}` : null,
		lead.decisor ? `Decisor: ${lead.decisor === "SIM" ? "sim" : "não"}` : null,
		emails.length > 1 ? `Outros e-mails: ${emails.slice(1).join(", ")}` : null,
		lead.estagio ? `Etapa na planilha: ${lead.estagio}` : null,
	]
		.filter(Boolean)
		.join("\n\n");

	return prisma.$transaction(async (tx) => {
		const created = await tx.lead.create({
			data: {
				externalRef,
				name: lead.nome.trim(),
				email,
				phone: lead.tel?.trim() || null,
				companyName: lead.empresa?.trim() || lead.empresaInfo?.nome?.trim() || null,
				contractsRange: contractsBucket(lead.carteira),
				stage,
				status,
				temperature: lead.farol ? (TEMPERATURES[lead.farol.toUpperCase()] ?? null) : null,
				plan: plan.plan,
				billingCycle: plan.billingCycle,
				estimatedValue: plan.value,
				notes: notes || null,
				tags: ["handoff"],
				channel,
				source: lead.origem?.trim() || "Manual",
				ownerId: owner?.id ?? null,
				lostReason,
				lostAt: status === "LOST" ? lastTouch : null,
				wonAt: status === "WON" ? lastTouch : null,
				stageChangedAt: lastTouch,
				createdAt: arrival,
			},
		});

		await tx.stageEvent.create({ data: { leadId: created.id, toStage: "NEW", toStatus: "OPEN", createdAt: arrival } });
		if (stage !== "NEW") {
			await tx.stageEvent.create({
				data: {
					leadId: created.id,
					fromStage: "NEW",
					toStage: stage,
					fromStatus: "OPEN",
					toStatus: "OPEN",
					createdAt: lastTouch,
				},
			});
		}
		if (status !== "OPEN") {
			await tx.stageEvent.create({
				data: {
					leadId: created.id,
					fromStage: stage,
					toStage: stage,
					fromStatus: "OPEN",
					toStatus: status,
					createdAt: lastTouch,
				},
			});
		}

		const activities: Prisma.ActivityCreateManyInput[] = [
			{
				leadId: created.id,
				type: "SYSTEM",
				title: `Importado do Handoff RE Patrimonial${lead.resp ? ` · responsável na planilha: ${lead.resp}` : ""}`,
				createdAt: arrival,
			},
			...timeline.map((t) => ({
				leadId: created.id,
				type: "NOTE" as ActivityType,
				body: t.text,
				createdAt: t.at,
				metadata: { imported: "handoff" },
			})),
			...(lead.notas ?? []).map(([title, text]) => ({
				leadId: created.id,
				type: "NOTE" as ActivityType,
				title,
				body: text,
				createdAt: lastTouch,
				metadata: { imported: "handoff" },
			})),
		];
		if (lead.empresaInfo?.texto) {
			const sources = (lead.empresaInfo.fontes ?? []).map((f) => `${f.rot}: ${f.url}`).join("\n");
			activities.push({
				leadId: created.id,
				type: "NOTE",
				title: `Sobre a empresa${lead.empresaInfo.nome ? `: ${lead.empresaInfo.nome}` : ""}`,
				body: [lead.empresaInfo.texto, sources].filter(Boolean).join("\n\n"),
				createdAt: arrival,
				metadata: { imported: "handoff" },
			});
		}

		// Demonstração e notas da reunião (o texto da reunião vira o resumo da demonstração)
		const meetingNoteDate = lead.reuniao ? parseShortDate(lead.reuniao.data, arrival) : null;
		const meetingDate = demoDate ?? meetingNoteDate;
		if (meetingDate) {
			const sameDay = meetingNoteDate && Math.abs(meetingNoteDate.getTime() - meetingDate.getTime()) < DAY;
			activities.push({
				leadId: created.id,
				type: "MEETING",
				title: "Demonstração",
				dueAt: meetingDate,
				completedAt: meetingDate.getTime() < Date.now() ? meetingDate : null,
				assigneeId: owner?.id ?? null,
				aiSummary: sameDay ? lead.reuniao?.texto : null,
				metadata:
					sameDay && lead.reuniao?.link ? { docUrl: lead.reuniao.link, imported: "handoff" } : { imported: "handoff" },
				createdAt: new Date(Math.min(meetingDate.getTime(), Date.now())),
			});
			if (lead.reuniao && !sameDay && meetingNoteDate) {
				activities.push({
					leadId: created.id,
					type: "MEETING",
					title: "Reunião",
					dueAt: meetingNoteDate,
					completedAt: meetingNoteDate,
					aiSummary: lead.reuniao.texto,
					metadata: lead.reuniao.link ? { docUrl: lead.reuniao.link, imported: "handoff" } : { imported: "handoff" },
					createdAt: meetingNoteDate,
				});
			}
		}

		// Próximo passo da planilha vira tarefa para quem está em aberto
		if (status === "OPEN" && (lead.acao || lead.proximo)) {
			activities.push({
				leadId: created.id,
				type: "TASK",
				title: lead.acao ?? "Próximo passo",
				body: [lead.proximo, lead.dono ? `Próxima ação com: ${lead.dono}` : null].filter(Boolean).join("\n"),
				dueAt: new Date(Date.now() + DAY),
				assigneeId: owner?.id ?? null,
				metadata: { imported: "handoff" },
			});
		}
		await tx.activity.createMany({ data: activities });

		const trial = trialDates(lead.trial);
		if (trial) {
			const duration = Math.max(1, Math.round((trial.end.getTime() - trial.start.getTime()) / DAY));
			const trialStatus: TrialStatus =
				lead.grupo === "trial"
					? "ACTIVE"
					: lead.grupo === "cliente"
						? "CONVERTED"
						: status === "LOST"
							? "CANCELED"
							: "EXPIRED";
			const middle = Math.max(2, Math.floor(duration / 2));
			await tx.trial.create({
				data: {
					leadId: created.id,
					startDate: trial.start,
					endDate: trial.end,
					status: trialStatus,
					accountUrl: lead.link,
					checklist: {
						create: [
							[0, "Kickoff e configuração da conta de teste"],
							[1, "Check-in de primeiros passos"],
							[middle, "Acompanhamento de uso e dúvidas"],
							[Math.max(duration - 1, middle + 1), "Apresentação de resultados e proposta"],
							[Math.max(duration, middle + 2), "Decisão e fechamento"],
						].map(([dayOffset, title], position) => ({ dayOffset: Number(dayOffset), title: String(title), position })),
					},
				},
			});
		} else if (lead.link) {
			await tx.activity.create({
				data: { leadId: created.id, type: "SYSTEM", title: `Ambiente: ${lead.link}`, createdAt: lastTouch },
			});
		}
		return { status: "imported" as const, leadId: created.id };
	});
}

async function main() {
	const path = process.argv[2];
	if (!path) throw new Error("Informe o arquivo: npm run db:import -- caminho/Handoff_RE_Patrimonial.html");
	const leads = loadHandoff(path);
	const team = await prisma.user.findMany({ select: { id: true, name: true } });
	let imported = 0;
	let skipped = 0;
	for (const lead of leads) {
		const result = await importLead(lead, team);
		if (result.status === "imported") imported++;
		else skipped++;
	}
	console.info(`${imported} leads importados, ${skipped} pulados (já estavam no CRM).`);
}

if (process.argv[1]?.endsWith("import-handoff.ts")) {
	main()
		.catch((error) => {
			console.error(error instanceof Prisma.PrismaClientKnownRequestError ? error.message : error);
			process.exit(1);
		})
		.finally(() => prisma.$disconnect());
}
