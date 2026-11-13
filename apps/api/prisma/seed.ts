import { type LeadStage, type LeadTemperature, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const STAGES: LeadStage[] = ["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"];

// Gerador determinístico para o seed sempre produzir os mesmos dados
let seed = 42;
const random = () => {
	seed = (seed * 16807) % 2147483647;
	return (seed - 1) / 2147483646;
};
const pickOne = <T>(items: T[]) => items[Math.floor(random() * items.length)];

const FIRST_NAMES = [
	"Mariana",
	"Rafael",
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
const JOB_TITLES = [
	"Sócio-diretor",
	"Gerente de locação",
	"Coordenadora administrativa",
	"Diretor de operações",
	"Gerente financeiro",
	"Corretor responsável",
];
const SIZES = ["1-10 funcionários", "11-50 funcionários", "51-200 funcionários", "201+ funcionários"];
const SEGMENTS = ["Locação residencial", "Locação comercial", "Administração de condomínios", "Locação e venda"];
const CITIES = [
	["São Paulo", "SP"],
	["Campinas", "SP"],
	["Belo Horizonte", "MG"],
	["Curitiba", "PR"],
	["Porto Alegre", "RS"],
	["Florianópolis", "SC"],
	["Rio de Janeiro", "RJ"],
	["Goiânia", "GO"],
	["Recife", "PE"],
];
const UTM = [
	{
		utmSource: "google",
		utmMedium: "cpc",
		utmCampaign: "gestao-locacao",
		conversionIdentifier: "landing-demonstracao",
	},
	{
		utmSource: "facebook",
		utmMedium: "paid-social",
		utmCampaign: "imobiliarias-2026",
		conversionIdentifier: "ebook-inadimplencia",
	},
	{ utmSource: "organic", utmMedium: "blog", utmCampaign: null, conversionIdentifier: "newsletter-blog" },
	{ utmSource: "linkedin", utmMedium: "paid-social", utmCampaign: "decisores", conversionIdentifier: "webinar-gestao" },
	{ utmSource: "google", utmMedium: "organic", utmCampaign: null, conversionIdentifier: "teste-gratis" },
];
const PLANS = [
	["Essencial", 490],
	["Profissional", 990],
	["Enterprise", 2490],
] as const;
const LOST_REASONS = ["Preço", "Escolheu concorrente", "Sem resposta", "Sem fit com o produto", "Momento inadequado"];
const NOTES = [
	"Administra cerca de 400 contratos. Hoje usa planilhas e um sistema legado.",
	"Dor principal: inadimplência e repasse manual aos proprietários.",
	"Quer integração com o banco para conciliação automática.",
	"Decisão envolve os dois sócios. Pediu material comparativo.",
	"Equipe pequena, procura algo simples de implantar.",
];

async function main() {
	await prisma.$transaction([
		prisma.webhookLog.deleteMany(),
		prisma.trialChecklistItem.deleteMany(),
		prisma.trial.deleteMany(),
		prisma.activity.deleteMany(),
		prisma.stageEvent.deleteMany(),
		prisma.leadParticipant.deleteMany(),
		prisma.lead.deleteMany(),
		prisma.setting.deleteMany(),
		prisma.user.deleteMany(),
	]);
	await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Lead_id_seq" RESTART WITH 1001`);

	const passwordHash = await bcrypt.hash("locx@2026", 10);
	const manager = await prisma.user.create({
		data: {
			name: "Gestão Comercial",
			email: "gestor@locx.com.br",
			passwordHash,
			role: "ADMIN",
			color: "#3A271A",
			receivesLeads: false,
		},
	});
	const reps = await Promise.all(
		[
			["Ana Souza", "ana@locx.com.br", "#0288D1"],
			["Bruno Lima", "bruno@locx.com.br", "#2E7D32"],
			["Carla Mendes", "carla@locx.com.br", "#7B1FA2"],
			["Diego Rocha", "diego@locx.com.br", "#EF6C00"],
		].map(([name, email, color]) => prisma.user.create({ data: { name, email, passwordHash, role: "SALES", color } })),
	);
	await prisma.setting.create({ data: { key: "leadAssignment", value: { mode: "ROUND_ROBIN" } } });

	const now = Date.now();
	for (let i = 0; i < COMPANIES.length; i++) {
		const first = pickOne(FIRST_NAMES);
		const last = pickOne(LAST_NAMES);
		const company = COMPANIES[i];
		const owner = reps[i % reps.length];
		const [city, state] = pickOne(CITIES);
		const fromRd = random() > 0.2;
		const utm = pickOne(UTM);
		const [plan, price] = pickOne([...PLANS]);
		const createdAt = new Date(now - Math.floor(random() * 75 + 1) * DAY - Math.floor(random() * 8) * 3600 * 1000);

		// Distribui os leads: ~55% em aberto, ~25% ganhos, ~20% perdidos
		const roll = random();
		const status = i < 4 ? "OPEN" : roll < 0.55 ? "OPEN" : roll < 0.8 ? "WON" : "LOST";
		const stageIndex = status === "WON" ? 4 : i < 4 ? 0 : Math.floor(random() * 5);
		const stage = STAGES[stageIndex];
		const recent = status === "OPEN" && stageIndex <= 1;
		const created = recent
			? new Date(now - Math.floor(random() * 6 + 0.2) * DAY - Math.floor(random() * 10) * 3600 * 1000)
			: createdAt;
		const stepDays = Math.max(1, Math.floor((now - created.getTime()) / DAY / 6));
		const stageChangedAt = new Date(created.getTime() + stageIndex * stepDays * DAY);
		const closedAt = new Date(Math.min(now - DAY / 2, stageChangedAt.getTime() + stepDays * DAY));

		const lead = await prisma.lead.create({
			data: {
				name: `${first} ${last}`,
				email: `${first
					.toLowerCase()
					.normalize("NFD")
					.replace(/\p{Diacritic}/gu, "")}@${company
					.toLowerCase()
					.normalize("NFD")
					.replace(/\p{Diacritic}/gu, "")
					.replace(/[^a-z]/g, "")
					.slice(0, 18)}.com.br`,
				phone: `(${pickOne(["11", "19", "31", "41", "51", "48", "21"])}) 9${Math.floor(random() * 9000 + 1000)}-${Math.floor(random() * 9000 + 1000)}`,
				jobTitle: pickOne(JOB_TITLES),
				companyName: company,
				companySize: pickOne(SIZES),
				segment: pickOne(SEGMENTS),
				city,
				state,
				stage,
				status,
				temperature: pickOne<LeadTemperature | null>(["COLD", "WARM", "HOT", null]),
				estimatedValue: stageIndex >= 2 || status !== "OPEN" ? price : null,
				plan: stageIndex >= 2 || status === "WON" ? plan : null,
				notes: random() > 0.5 ? pickOne(NOTES) : null,
				source: fromRd ? "RD Station" : pickOne(["Indicação", "Manual", "Evento"]),
				...(fromRd ? { ...utm, rdLeadId: `rd-seed-${i}`, rdPublicUrl: null } : {}),
				ownerId: i === 2 ? null : owner.id,
				stageChangedAt: status === "OPEN" ? stageChangedAt : closedAt,
				wonAt: status === "WON" ? closedAt : null,
				lostAt: status === "LOST" ? closedAt : null,
				lostReason: status === "LOST" ? pickOne(LOST_REASONS) : null,
				tags: random() > 0.7 ? ["prioridade"] : [],
				createdAt: created,
			},
		});

		// Histórico de etapas
		await prisma.stageEvent.create({ data: { leadId: lead.id, toStage: "NEW", toStatus: "OPEN", createdAt: created } });
		await prisma.activity.create({
			data: {
				leadId: lead.id,
				type: "SYSTEM",
				title: fromRd ? `Lead recebido do RD Station: ${utm.conversionIdentifier}` : "Lead cadastrado manualmente",
				createdAt: created,
			},
		});
		for (let s = 1; s <= stageIndex; s++) {
			const at = new Date(created.getTime() + s * stepDays * DAY);
			await prisma.stageEvent.create({
				data: {
					leadId: lead.id,
					fromStage: STAGES[s - 1],
					toStage: STAGES[s],
					fromStatus: "OPEN",
					toStatus: "OPEN",
					userId: owner.id,
					createdAt: at,
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

		// Atividades de contato
		if (stageIndex >= 1 || status !== "OPEN") {
			await prisma.activity.create({
				data: {
					leadId: lead.id,
					type: pickOne(["CALL", "WHATSAPP"] as const),
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
					title: "Demonstração do produto",
					dueAt: meetingAt,
					completedAt: stageIndex > 2 || status !== "OPEN" ? meetingAt : null,
					meetingUrl: "https://meet.google.com/abc-defg-hij",
					authorId: owner.id,
					assigneeId: owner.id,
					createdAt: new Date(meetingAt.getTime() - 2 * DAY),
				},
			});
		}

		// Participantes: SDR que fez o pré-atendimento e, às vezes, apoio técnico
		if (stageIndex >= 2 && random() > 0.4) {
			const other = reps[(i + 1) % reps.length];
			await prisma.leadParticipant.create({
				data: { leadId: lead.id, userId: other.id, role: pickOne(["SDR", "TECHNICAL", "ONBOARDING"] as const) },
			});
		}

		// Trial
		if (stageIndex >= 3) {
			const duration = pickOne([5, 7]);
			const isActive = status === "OPEN" && stage === "TRIAL";
			const startDate = isActive
				? new Date(now - Math.floor(random() * duration) * DAY)
				: new Date(created.getTime() + 3 * stepDays * DAY);
			const endDate = new Date(startDate.getTime() + duration * DAY);
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
					endDate,
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
		}

		// Lead em trial ativo: a etapa começou junto com o teste
		if (stageIndex === 3 && status === "OPEN") {
			const trial = await prisma.trial.findUnique({ where: { leadId: lead.id } });
			if (trial) {
				await prisma.lead.update({ where: { id: lead.id }, data: { stageChangedAt: trial.startDate } });
				await prisma.stageEvent.updateMany({
					where: { leadId: lead.id, toStage: "TRIAL" },
					data: { createdAt: trial.startDate },
				});
			}
		}

		// Próximas tarefas para leads em aberto
		if (status === "OPEN" && lead.ownerId) {
			const offsets = [-1.2, -0.1, 0.15, 0.3, 1, 2, 3];
			await prisma.activity.create({
				data: {
					leadId: lead.id,
					type: stage === "MEETING" ? "MEETING" : "TASK",
					title:
						stage === "NEW"
							? "Fazer o primeiro contato"
							: stage === "QUALIFICATION"
								? "Qualificar e agendar reunião"
								: stage === "MEETING"
									? "Reunião de apresentação"
									: stage === "TRIAL"
										? "Check-in do trial"
										: "Enviar proposta revisada",
					dueAt: new Date(now + pickOne(offsets) * DAY),
					meetingUrl: stage === "MEETING" ? "https://meet.google.com/xyz-abcd-efg" : null,
					authorId: owner.id,
					assigneeId: owner.id,
				},
			});
		}
	}

	console.info(`Seed concluído: 1 gestor, ${reps.length} comerciais e ${COMPANIES.length} leads.`);
	console.info(`Login: ${manager.email} ou ana@locx.com.br (senha: locx@2026)`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
