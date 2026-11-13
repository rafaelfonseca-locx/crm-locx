import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

/**
 * Aplica em lote decisões de uma reunião (responsáveis, parceiros, indicações, tags, reaberturas e notas).
 * O plano é um JSON fora do repositório (tem dados pessoais).
 *
 *   npm run db:apply-plan -- caminho/plano.json            → só mostra o que faria
 *   npm run db:apply-plan -- caminho/plano.json --aplicar  → grava no banco
 *
 * Rodar duas vezes não duplica: tags e notas iguais são ignoradas.
 */

type Match = { externalRef?: string; name?: string };
type PartnerSpec = { key: string; name: string; companyName?: string; notes?: string };
type Item = {
	match: Match;
	label?: string;
	owner?: string; // e-mail do responsável
	kind?: "PROSPECT" | "PARTNER";
	referredBy?: string; // key de um parceiro do plano, ou externalRef de um lead existente
	reopen?: boolean;
	source?: string;
	tags?: string[];
	note?: string;
};
type Plan = { title: string; actor: string; partners?: PartnerSpec[]; items: Item[] };

const prisma = new PrismaClient();
const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();

async function findLead(match: Match) {
	if (match.externalRef) {
		const lead = await prisma.lead.findUnique({ where: { externalRef: match.externalRef } });
		if (lead) return lead;
	}
	if (match.name) {
		const target = normalize(match.name);
		const all = await prisma.lead.findMany();
		const found = all.filter((l) => normalize(`${l.name} ${l.companyName ?? ""}`).includes(target));
		if (found.length === 1) return found[0];
		if (found.length > 1) throw new Error(`"${match.name}" encontrou ${found.length} leads; use externalRef`);
	}
	return null;
}

async function main() {
	const [path, flag] = process.argv.slice(2);
	if (!path) throw new Error("Informe o plano: npm run db:apply-plan -- plano.json [--aplicar]");
	const apply = flag === "--aplicar";
	const plan = JSON.parse(readFileSync(path, "utf8")) as Plan;
	const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
	const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));
	const actor = userByEmail.get(plan.actor.toLowerCase());
	if (!actor) throw new Error(`Usuário ${plan.actor} não existe no banco`);

	console.info(`${plan.title}\n${apply ? "APLICANDO" : "SIMULAÇÃO (nada será gravado; use --aplicar)"}\n`);
	const problems: string[] = [];

	// Parceiros novos (ex.: influenciadora), criados uma vez só
	const partnerIds = new Map<string, number>();
	for (const p of plan.partners ?? []) {
		const existing = await prisma.lead.findFirst({ where: { kind: "PARTNER", name: p.name } });
		if (existing) {
			partnerIds.set(p.key, existing.id);
			console.info(`= parceiro já existe: ${p.name} (#${existing.id})`);
			continue;
		}
		console.info(`+ criar parceiro: ${p.name}`);
		if (!apply) {
			partnerIds.set(p.key, -1);
			continue;
		}
		const created = await prisma.lead.create({
			data: {
				name: p.name,
				companyName: p.companyName ?? null,
				notes: p.notes ?? null,
				kind: "PARTNER",
				source: "Parceiro",
				ownerId: actor.id,
				stageEvents: { create: { toStage: "NEW", toStatus: "OPEN", userId: actor.id } },
				activities: { create: { type: "SYSTEM", title: "Parceiro cadastrado", authorId: actor.id } },
			},
		});
		partnerIds.set(p.key, created.id);
	}

	for (const item of plan.items) {
		const label = item.label ?? item.match.name ?? item.match.externalRef ?? "?";
		const lead = await findLead(item.match);
		if (!lead) {
			problems.push(`não encontrado: ${label}`);
			continue;
		}
		const changes: string[] = [];
		const data: Record<string, unknown> = {};

		if (item.owner) {
			const owner = userByEmail.get(item.owner.toLowerCase());
			if (!owner) problems.push(`responsável ${item.owner} não existe (${label})`);
			else if (lead.ownerId !== owner.id) {
				data.ownerId = owner.id;
				changes.push(`responsável → ${owner.name}`);
			}
		}
		if (item.kind && lead.kind !== item.kind) {
			data.kind = item.kind;
			if (item.kind === "PARTNER") data.referredById = null;
			changes.push(item.kind === "PARTNER" ? "marcar como parceiro" : "voltar para o funil");
		}
		if (item.referredBy) {
			let referrerId = partnerIds.get(item.referredBy);
			if (referrerId === undefined) referrerId = (await findLead({ externalRef: item.referredBy }))?.id;
			if (referrerId === undefined) problems.push(`parceiro ${item.referredBy} não encontrado (${label})`);
			else if (lead.referredById !== referrerId) {
				data.referredById = referrerId;
				changes.push(`indicado por → ${item.referredBy}`);
			}
		}
		if (item.source && lead.source !== item.source) {
			data.source = item.source;
			changes.push(`origem → ${item.source}`);
		}
		const newTags = (item.tags ?? []).filter((t) => !lead.tags.includes(t));
		if (newTags.length) {
			data.tags = [...lead.tags, ...newTags];
			changes.push(`tags + ${newTags.join(", ")}`);
		}
		const reopen = item.reopen && lead.status !== "OPEN";
		if (reopen) changes.push(`reabrir (estava ${lead.status === "LOST" ? `perdido: ${lead.lostReason}` : "ganho"})`);
		const noteExists = item.note
			? await prisma.activity.findFirst({ where: { leadId: lead.id, type: "NOTE", body: item.note } })
			: null;
		if (item.note && !noteExists) changes.push("nota da reunião");

		console.info(`${changes.length ? "*" : "="} #${lead.id} ${lead.companyName ?? lead.name}  ←  ${label}`);
		for (const c of changes) console.info(`    ${c}`);
		if (!apply || changes.length === 0) continue;

		await prisma.$transaction(async (tx) => {
			if (reopen) {
				await tx.stageEvent.create({
					data: {
						leadId: lead.id,
						fromStage: lead.stage,
						toStage: lead.stage,
						fromStatus: lead.status,
						toStatus: "OPEN",
						userId: actor.id,
					},
				});
				Object.assign(data, {
					status: "OPEN",
					wonAt: null,
					lostAt: null,
					lostReason: null,
					stageChangedAt: new Date(),
				});
			}
			if (Object.keys(data).length) await tx.lead.update({ where: { id: lead.id }, data });
			const summary = changes.filter((c) => c !== "nota da reunião").join("; ");
			if (summary) {
				await tx.activity.create({
					data: { leadId: lead.id, type: "SYSTEM", title: `${plan.title}: ${summary}`, authorId: actor.id },
				});
			}
			if (item.note && !noteExists) {
				await tx.activity.create({
					data: { leadId: lead.id, type: "NOTE", title: plan.title, body: item.note, authorId: actor.id },
				});
			}
		});
	}

	if (problems.length) {
		console.warn("\nAtenção:");
		for (const p of problems) console.warn(`  - ${p}`);
	}
	console.info(apply ? "\nPronto." : "\nSimulação concluída. Confira e rode de novo com --aplicar.");
}

main()
	.catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
