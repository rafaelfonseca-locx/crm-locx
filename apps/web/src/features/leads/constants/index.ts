import type { ActivityType } from "@/store/api/@types/activity.types";
import type {
	BillingCycle,
	LeadChannel,
	LeadStage,
	LeadTemperature,
	ParticipantRole,
} from "@/store/api/@types/lead.types";

export const STAGE_ORDER: LeadStage[] = ["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"];

export const STAGE_META: Record<LeadStage, { label: string; description: string }> = {
	NEW: {
		label: "Novo lead",
		description: "Chegou pelo RD Station, Cal.com ou cadastro manual e aguarda o primeiro contato.",
	},
	QUALIFICATION: {
		label: "Pré-atendimento",
		description: "SDR em contato: entende o cenário, confirma o perfil e tenta agendar a demonstração.",
	},
	MEETING: {
		label: "Reunião",
		description: "Demonstração agendada ou realizada. Leads do Cal.com já chegam aqui com data e link.",
	},
	TRIAL: { label: "Trial", description: "Teste gratuito de 5 a 7 dias, com roteiro diário de acompanhamento." },
	CLOSING: { label: "Venda", description: "Proposta enviada e negociação. Termina como Ganho ou Perdido." },
};

export const TEMPERATURE_META: Record<
	LeadTemperature,
	{ label: string; color: "info" | "warning" | "error"; hint: string }
> = {
	COLD: { label: "Frio", color: "info", hint: "Sem prazo definido ou só pesquisando" },
	WARM: { label: "Morno", color: "warning", hint: "Pretende começar em até 3 meses" },
	HOT: { label: "Quente", color: "error", hint: "Pretende começar agora ou em até 30 dias" },
};

export const CHANNEL_META: Record<LeadChannel, { label: string; short: string; description: string }> = {
	DEMO: {
		label: "Agendamento de demonstração",
		short: "Demonstração",
		description: "Preencheu o formulário completo e agendou no Cal.com. Já chega com reunião marcada.",
	},
	WHATSAPP: {
		label: "Formulário do WhatsApp",
		short: "WhatsApp",
		description: "Formulário curto do WhatsApp. Precisa de pré-atendimento para qualificar.",
	},
	SITE: {
		label: "Formulário do site",
		short: "Site",
		description: "Formulário curto da página. Precisa de pré-atendimento.",
	},
	MANUAL: {
		label: "Cadastro manual",
		short: "Manual",
		description: "Cadastrado pelo time: indicação, evento, prospecção.",
	},
};

/** Planos e preços mensais. O anual é o valor mensal com 20% de desconto (cobrado no ano). */
export const PLANS = [
	{ name: "Basic", monthly: 490, annual: 392 },
	{ name: "Pro", monthly: 1215, annual: 972 },
	{ name: "Premium", monthly: 2400, annual: 1920 },
	{ name: "Enterprise", monthly: null, annual: null },
] as const;

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = { MONTHLY: "Mensal", ANNUAL: "Anual" };

export function planPrice(plan: string | null | undefined, cycle: BillingCycle | null | undefined) {
	const found = PLANS.find((p) => p.name === plan);
	if (!found) return null;
	return cycle === "ANNUAL" ? found.annual : found.monthly;
}

/** Perguntas padronizadas dos formulários (as mesmas opções valem para RD, Cal.com e cadastro manual). */
export const QUALIFICATION_OPTIONS = {
	businessType: [
		"Pessoa física com imóveis próprios",
		"Holding patrimonial familiar",
		"Family office",
		"Empresa com imóveis para renda",
		"Administradora/consultoria patrimonial",
		"Outro",
	],
	managementRole: [
		"Sócio ou diretor",
		"Gestor do patrimônio",
		"Financeiro ou administrativo",
		"Consultor ou assessor",
		"Outro",
	],
	contractsRange: ["1 a 5", "6 a 25", "26 a 50", "51 a 100", "Mais de 100"],
	currentTool: ["Não, uso planilha", "Sim, outro sistema", "Não gerencio ainda"],
	startTimeline: ["Imediatamente", "Em até 30 dias", "Em até 3 meses", "Só estou pesquisando"],
} as const;

export const QUALIFICATION_LABELS = {
	businessType: "Perfil do negócio",
	managementRole: "Papel na gestão",
	contractsRange: "Imóveis/contratos administrados",
	currentTool: "Já usa sistema de gestão?",
	startTimeline: "Quando pretende começar",
} as const;

export const BRAZIL_STATES = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
];

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
	SDR: "SDR",
	CLOSER: "Closer",
	ONBOARDING: "Onboarding",
	TECHNICAL: "Técnico",
	OBSERVER: "Acompanhando",
};

export const PARTICIPANT_ROLE_HINTS: Record<ParticipantRole, string> = {
	SDR: "Faz o pré-atendimento e a qualificação",
	CLOSER: "Conduz a negociação e o fechamento",
	ONBOARDING: "Ajuda na configuração durante o trial",
	TECHNICAL: "Tira dúvidas técnicas e de integração",
	OBSERVER: "Só acompanha o andamento",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
	NOTE: "Nota",
	CALL: "Ligação",
	EMAIL: "E-mail",
	WHATSAPP: "WhatsApp",
	MEETING: "Reunião",
	TASK: "Tarefa",
	STAGE_CHANGE: "Etapa",
	SYSTEM: "Sistema",
};

export const LOST_REASONS = [
	"Preço",
	"Escolheu concorrente",
	"Sem resposta",
	"Sem fit com o produto",
	"Momento inadequado",
	"Outro",
];

export const COMPANY_SIZES = ["1-10 funcionários", "11-50 funcionários", "51-200 funcionários", "201+ funcionários"];

export const LEAD_SOURCES = ["Manual", "RD Station", "Cal.com", "Indicação", "Evento", "Prospecção ativa", "Parceiro"];

export const ROLE_LABELS = { ADMIN: "Administrador", MANAGER: "Gestor", SALES: "Vendedor" } as const;
