import { type LeadChannel, type LeadStage, type LeadTemperature, PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Seed do CRM.
 * - Time: cria ou atualiza as pessoas (sem trocar a senha de quem já existe).
 * - Leads de exemplo: só são criados quando o banco ainda não tem leads.
 * Para apagar os leads de exemplo antes de usar de verdade: npm run db:clear
 */

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const INITIAL_PASSWORD = "locx@2026";
const STAGES: LeadStage[] = ["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"];

const TEAM: { name: string; email: string; role: Role; photo: string; color: string; receivesLeads: boolean }[] = [
	{
		name: "Douglas Andrade",
		email: "douglas.andrade@locx.com.br",
		role: "MANAGER",
		photo: "douglas",
		color: "#455A64",
		receivesLeads: false,
	},
	{
		name: "Rafael Fonseca",
		email: "rafael.fonseca@locx.com.br",
		role: "MANAGER",
		photo: "rafael",
		color: "#0288D1",
		receivesLeads: false,
	},
	{
		name: "Isabela Silva",
		email: "isabela.silva@locx.com.br",
		role: "MANAGER",
		photo: "isabela",
		color: "#C2185B",
		receivesLeads: false,
	},
	{
		name: "Cristian Cabral",
		email: "cristian.cabral@locx.com.br",
		role: "SALES",
		photo: "cristian",
		color: "#2E7D32",
		receivesLeads: true,
	},
	{
		name: "Guilherme Rodrigues",
		email: "guilherme.rodrigues@locx.com.br",
		role: "SALES",
		photo: "guilherme",
		color: "#7B1FA2",
		receivesLeads: true,
	},
	{
		name: "Maria Teresa",
		email: "maria.teresa@locx.com.br",
		role: "SALES",
		photo: "maria-teresa",
		color: "#EF6C00",
		receivesLeads: true,
	},
	{
		name: "Pedro Henrique Evaristo",
		email: "pedro.henrique@locx.com.br",
		role: "SALES",
		photo: "pedro",
		color: "#00838F",
		receivesLeads: true,
	},
];

// Usuários da primeira versão de demonstração, removidos ao rodar este seed
const LEGACY_DEMO_EMAILS = [
	"gestor@locx.com.br",
	"ana@locx.com.br",
	"bruno@locx.com.br",
	"carla@locx.com.br",
	"diego@locx.com.br",
];

// Preço mensal de cada plano (o anual é o valor mensal com 20% de desconto)
const PLANS = [
	{ name: "Basic", monthly: 490, annual: 392 },
	{ name: "Pro", monthly: 1215, annual: 972 },
	{ name: "Premium", monthly: 2400, annual: 1920 },
] as const;

let seed = 42;
const random = () => {
	seed = (seed * 16807) % 2147483647;
	return (seed - 1) / 2147483646;
};
const pickOne = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
const slug = (value: string) =>
	value
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z]/g, "");

const FIRST_NAMES = [
	"Mariana",
	"Rafaela",
	"Juliana",
	"Felipe",
	"Patrícia",
	"Gustavo",
	"Camila",
	"Thiago",
	"Fernanda",
	"Lucas",
	"Renata",
	"André",
	"Beatriz",
	"Rodrigo",
	"Larissa",
	"Marcelo",
	"Aline",
	"Eduardo",
	"Vanessa",
	"Ricardo",
];
const LAST_NAMES = [
	"Almeida",
	"Barbosa",
	"Cardoso",
	"Dias",
	"Ferreira",
	"Gomes",
	"Martins",
	"Nogueira",
	"Oliveira",
	"Pereira",
	"Ribeiro",
	"Santos",
	"Teixeira",
	"Vieira",
];
const COMPANIES = [
	"Imobiliária Horizonte",
	"Casa & Cia Imóveis",
	"Prime Administradora",
	"Lar Ideal Locações",
	"Viva Bem Imóveis",
	"Atlântica Gestão Imobiliária",
	"Nova Morada",
	"Chave Certa Imóveis",
	"Grupo Alicerce",
	"Solar Administração de Bens",
	"Bairro Nobre Imóveis",
	"Porto Seguro Locações",
	"Ponto Imóveis",
	"Central Imobiliária",
	"Estilo Lar",
	"Ágil Locações",
	"Rede Moradas",
	"Fortaleza Imóveis",
	"Vila Rica Administradora",
	"Cidade Jardim Imóveis",
	"Tríade Imobiliária",
	"Bom Lugar Imóveis",
	"Âncora Gestão Patrimonial",
	"Mirante Locações",
	"Parque Imóveis",
	"Litoral Sul Imobiliária",
	"Metrópole Administradora",
	"Raiz Imóveis",
	"Vértice Imobiliária",
	"Recanto Locações",
	"Panorama Imóveis",
	"Alameda Gestão",
	"Dom Pedro Imóveis",
	"Ipê Administradora",
	"Morada Fácil",
	"Jardins Locações",
	"Capital Imóveis",
	"Sertão Imobiliária",
	"Aurora Gestão Imobiliária",
	"Pilar Imóveis",
	"Serra Azul Locações",
	"Oeste Imóveis",
];
const STATES = ["SP", "SP", "MG", "PR", "RS", "SC", "RJ", "GO", "PE", "BA"];
const BUSINESS_TYPES = ["Imobiliária", "Administradora de imóveis", "Proprietário ou investidor", "Corretor autônomo"];
const ROLES = ["Sócio ou diretor", "Gerente", "Corretor", "Administrativo ou financeiro"];
const CONTRACTS = ["Até 50", "51 a 200", "201 a 500", "501 a 1.000", "Mais de 1.000"];
const TOOLS = ["Planilhas", "Outro sistema", "Papel ou manual"];
const TIMELINES = ["Imediatamente", "Em até 30 dias", "Em até 3 meses", "Só estou pesquisando"];
const CHANNEL_CONFIG: Record<
	Exclude<LeadChannel, "MANUAL">,
	{ identifier: string; utm: { utmSource: string; utmMedium: string; utmCampaign: string | null } }
> = {
	DEMO: {
		identifier: "agendar-demonstracao",
		utm: { utmSource: "google", utmMedium: "cpc", utmCampaign: "gestao-locacao" },
	},
	WHATSAPP: {
		identifier: "formulario-whatsapp",
		utm: { utmSource: "facebook", utmMedium: "paid-social", utmCampaign: "imobiliarias-2026" },
	},
	SITE: { identifier: "formulario-homepage", utm: { utmSource: "organic", utmMedium: "blog", utmCampaign: null } },
};
const LOST_REASONS = ["Preço", "Escolheu concorrente", "Sem resposta", "Sem fit com o produto", "Momento inadequado"];
const NOTES = [
	"Administra cerca de 400 contratos. Hoje usa planilhas e um sistema legado.",
	"Dor principal: inadimplência e repasse manual aos proprietários.",
	"Quer integração com o banco para conciliação automática.",
	"Decisão envolve os dois sócios. Pediu material comparativo.",
];

async function upsertTeam() {
	const legacy = await prisma.user.findMany({ where: { email: { in: LEGACY_DEMO_EMAILS } }, select: { id: true } });
	if (legacy.length > 0) {
		// Primeira versão de demonstração: apaga os dados fictícios para recomeçar com o time real
		await clearLeads();
		await prisma.user.deleteMany({ where: { id: { in: legacy.map((u) => u.id) } } });
		console.info("Usuários e leads da versão de demonstração anterior foram removidos.");
	}
	const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, 10);
	const users = [];
	for (const member of TEAM) {
		// E-mails antigos (@locximoveis.com.br) passam para o domínio atual, mantendo senha e histórico
		const oldEmail = member.email.replace("@locx.com.br", "@locximoveis.com.br");
		const old = await prisma.user.findUnique({ where: { email: oldEmail }, select: { id: true } });
		const current = await prisma.user.findUnique({ where: { email: member.email }, select: { id: true } });
		if (old && !current) await prisma.user.update({ where: { id: old.id }, data: { email: member.email } });
		const data = {
			name: member.name,
			role: member.role,
			color: member.color,
			avatarUrl: `/team/${member.photo}.webp`,
			receivesLeads: member.receivesLeads,
		};
		users.push(
			await prisma.user.upsert({
				where: { email: member.email },
				update: data,
				create: { ...data, email: member.email, passwordHash, mustChangePassword: true },
			}),
		);
	}
	await prisma.setting.upsert({
		where: { key: "leadAssignment" },
		update: {},
		create: { key: "leadAssignment", value: { mode: "ROUND_ROBIN" } },
	});
	return users;
}

export async function clearLeads() {
	await prisma.$transaction([
		prisma.webhookLog.deleteMany(),
		prisma.trialChecklistItem.deleteMany(),
		prisma.trial.deleteMany(),
		prisma.activity.deleteMany(),
		prisma.stageEvent.deleteMany(),
		prisma.leadParticipant.deleteMany(),
		prisma.lead.deleteMany(),
	]);
	await prisma.user.updateMany({ data: { lastAssignedAt: null } });
}

async function createDemoLeads(sellers: { id: string }[]) {
	await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Lead_id_seq" RESTART WITH 1001`);
	const now = Date.now();

	for (let i = 0; i < COMPANIES.length; i++) {
		const first = pickOne(FIRST_NAMES);
		const last = pickOne(LAST_NAMES);
		const company = COMPANIES[i];
		const owner = sellers[i % sellers.length];
		const channel = pickOne<LeadChannel>(["DEMO", "DEMO", "WHATSAPP", "WHATSAPP", "SITE", "SITE", "MANUAL"]);
		const isFullForm = channel === "DEMO" || channel === "MANUAL";
		const plan = pickOne(PLANS);
		const cycle = random() > 0.6 ? "ANNUAL" : "MONTHLY";
		const price = cycle === "ANNUAL" ? plan.annual : plan.monthly;

		const roll = random();
		const status = i < 4 ? "OPEN" : roll < 0.55 ? "OPEN" : roll < 0.8 ? "WON" : "LOST";
		const stageIndex = status === "WON" ? 4 : i < 4 ? 0 : Math.floor(random() * 5);
		const stage = STAGES[stageIndex];
		const recent = status === "OPEN" && stageIndex <= 1;
		const created = recent
			? new Date(now - Math.floor(random() * 6 + 0.2) * DAY - Math.floor(random() * 10) * 3600 * 1000)
			: new Date(now - Math.floor(random() * 75 + 1) * DAY - Math.floor(random() * 8) * 3600 * 1000);
		const stepDays = Math.max(1, Math.floor((now - created.getTime()) / DAY / 6));
		const stageChangedAt = new Date(created.getTime() + stageIndex * stepDays * DAY);
		const closedAt = new Date(Math.min(now - DAY / 2, stageChangedAt.getTime() + stepDays * DAY));
		const timeline = pickOne(TIMELINES);
		const config = channel === "MANUAL" ? null : CHANNEL_CONFIG[channel];

		const lead = await prisma.lead.create({
			data: {
				name: `${first} ${last}`,
				email: `${slug(first)}@${slug(company).slice(0, 18)}.com.br`,
				phone: `(${pickOne(["11", "19", "31", "41", "51", "48", "21"])}) 9${Math.floor(random() * 9000 + 1000)}-${Math.floor(random() * 9000 + 1000)}`,
				companyName: company,
				state: pickOne(STATES),
				businessType: pickOne(BUSINESS_TYPES),
				contractsRange: pickOne(CONTRACTS),
				currentTool: channel === "WHATSAPP" ? null : pickOne(TOOLS),
				managementRole: isFullForm ? pickOne(ROLES) : null,
				startTimeline: isFullForm ? timeline : null,
				stage,
				status,
				channel,
				temperature: isFullForm
					? timeline === "Imediatamente" || timeline === "Em até 30 dias"
						? "HOT"
						: timeline === "Em até 3 meses"
							? "WARM"
							: "COLD"
					: pickOne<LeadTemperature | null>(["COLD", "WARM", "HOT", null]),
				estimatedValue: stageIndex >= 2 || status !== "OPEN" ? price : null,
				plan: stageIndex >= 2 || status === "WON" ? plan.name : null,
				billingCycle: stageIndex >= 2 || status === "WON" ? cycle : null,
				notes: random() > 0.6 ? pickOne(NOTES) : null,
				source: config ? "RD Station" : pickOne(["Indicação", "Evento", "Prospecção ativa"]),
				...(config ? { ...config.utm, conversionIdentifier: config.identifier, rdLeadId: `rd-seed-${i}` } : {}),
				ownerId: i === 2 ? null : owner.id,
				stageChangedAt: status === "OPEN" ? stageChangedAt : closedAt,
				wonAt: status === "WON" ? closedAt : null,
				lostAt: status === "LOST" ? closedAt : null,
				lostReason: status === "LOST" ? pickOne(LOST_REASONS) : null,
				tags: random() > 0.75 ? ["prioridade"] : [],
				createdAt: created,
			},
		});

		await prisma.stageEvent.create({ data: { leadId: lead.id, toStage: "NEW", toStatus: "OPEN", createdAt: created } });
		await prisma.activity.create({
			data: {
				leadId: lead.id,
				type: "SYSTEM",
				title: config ? `Conversão no RD Station (${config.identifier})` : "Lead cadastrado manualmente",
				createdAt: created,
			},
		});
		for (let s = 1; s <= stageIndex; s++) {
			await prisma.stageEvent.create({
				data: {
					leadId: lead.id,
					fromStage: STAGES[s - 1],
					toStage: STAGES[s],
					fromStatus: "OPEN",
					toStatus: "OPEN",
					userId: owner.id,
					createdAt: new Date(created.getTime() + s * stepDays * DAY),
				},
			});
		}
		if (status !== "OPEN") {
			await prisma.stageEvent.create({
				data: {
					leadId: lead.id,
					fromStage: stage,
					toStage: stage,
					fromStatus: "OPEN",
					toStatus: status,
					userId: owner.id,
					createdAt: closedAt,
				},
			});
			await prisma.activity.create({
				data: {
					leadId: lead.id,
					type: "STAGE_CHANGE",
					title: status === "WON" ? "Venda ganha 🎉" : "Marcado como perdido",
					authorId: owner.id,
					createdAt: closedAt,
				},
			});
		}
		if (stageIndex >= 1 || status !== "OPEN") {
			await prisma.activity.create({
				data: {
					leadId: lead.id,
					type: channel === "WHATSAPP" ? "WHATSAPP" : pickOne(["CALL", "WHATSAPP"] as const),
					body: "Primeiro contato feito. Entendemos o cenário atual e a quantidade de contratos administrados.",
					authorId: owner.id,
					createdAt: new Date(created.getTime() + 3 * 3600 * 1000),
				},
			});
		}
		if (stageIndex >= 2) {
			const meetingAt = new Date(created.getTime() + 2 * stepDays * DAY);
			await prisma.activity.create({
				data: {
					leadId: lead.id,
					type: "MEETING",
					title: `Demonstração · ${company}`,
					dueAt: meetingAt,
					completedAt: stageIndex > 2 || status !== "OPEN" ? meetingAt : null,
					meetingUrl: "https://meet.google.com/abc-defg-hij",
					authorId: owner.id,
					assigneeId: owner.id,
					createdAt: new Date(meetingAt.getTime() - 2 * DAY),
				},
			});
		}
		if (stageIndex >= 2 && random() > 0.4) {
			await prisma.leadParticipant.create({
				data: {
					leadId: lead.id,
					userId: sellers[(i + 1) % sellers.length].id,
					role: pickOne(["SDR", "TECHNICAL", "ONBOARDING"] as const),
				},
			});
		}
		if (stageIndex >= 3) {
			const duration = pickOne([5, 7]);
			const isActive = status === "OPEN" && stage === "TRIAL";
			const startDate = isActive
				? new Date(now - Math.floor(random() * duration) * DAY)
				: new Date(created.getTime() + 3 * stepDays * DAY);
			const elapsed = Math.floor((now - startDate.getTime()) / DAY);
			const middle = Math.max(2, Math.floor(duration / 2));
			const checklist = [
				[0, "Kickoff e configuração da conta de teste"],
				[1, "Check-in de primeiros passos"],
				[middle, "Acompanhamento de uso e dúvidas"],
				[duration - 1, "Apresentação de resultados e proposta"],
				[duration, "Decisão e fechamento"],
			] as const;
			await prisma.trial.create({
				data: {
					leadId: lead.id,
					startDate,
					endDate: new Date(startDate.getTime() + duration * DAY),
					status: isActive ? "ACTIVE" : status === "WON" ? "CONVERTED" : status === "LOST" ? "CANCELED" : "EXPIRED",
					accountUrl: `https://app.locx.com.br/conta/${lead.id}`,
					createdAt: startDate,
					checklist: {
						create: checklist.map(([dayOffset, title], position) => {
							const done = !isActive || dayOffset < elapsed;
							return {
								dayOffset,
								title,
								position,
								done,
								doneAt: done ? new Date(startDate.getTime() + dayOffset * DAY) : null,
								doneById: done ? owner.id : null,
							};
						}),
					},
				},
			});
			if (isActive) {
				await prisma.lead.update({ where: { id: lead.id }, data: { stageChangedAt: startDate } });
				await prisma.stageEvent.updateMany({
					where: { leadId: lead.id, toStage: "TRIAL" },
					data: { createdAt: startDate },
				});
			}
		}
		if (status === "OPEN" && lead.ownerId) {
			const titles: Record<LeadStage, string> = {
				NEW: channel === "WHATSAPP" ? "Fazer o pré-atendimento pelo WhatsApp" : "Fazer o primeiro contato",
				QUALIFICATION: "Qualificar e agendar demonstração",
				MEETING: `Demonstração · ${company}`,
				TRIAL: "Check-in do trial",
				CLOSING: "Enviar proposta revisada",
			};
			await prisma.activity.create({
				data: {
					leadId: lead.id,
					type: stage === "MEETING" ? "MEETING" : "TASK",
					title: titles[stage],
					dueAt: new Date(now + pickOne([-1.2, -0.1, 0.15, 0.3, 1, 2, 3]) * DAY),
					meetingUrl: stage === "MEETING" ? "https://meet.google.com/xyz-abcd-efg" : null,
					authorId: owner.id,
					assigneeId: owner.id,
				},
			});
		}
	}
}

async function main() {
	const users = await upsertTeam();
	const sellers = users.filter((u) => u.role === "SALES");
	const existingLeads = await prisma.lead.count();
	if (existingLeads === 0 && !process.argv.includes("--team-only")) {
		await createDemoLeads(sellers);
		console.info(`Time cadastrado (${users.length} pessoas) e ${COMPANIES.length} leads de exemplo criados.`);
	} else {
		console.info(`Time cadastrado (${users.length} pessoas). Leads existentes mantidos (${existingLeads}).`);
	}
	console.info(`Senha inicial: ${INITIAL_PASSWORD} (cada pessoa troca no primeiro acesso).`);
}

if (process.argv[1]?.endsWith("seed.ts")) {
	main()
		.catch((error) => {
			console.error(error);
			process.exit(1);
		})
		.finally(() => prisma.$disconnect());
}
