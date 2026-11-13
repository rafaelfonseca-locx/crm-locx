import type { ActivityType } from "@/store/api/@types/activity.types";
import type { LeadStage, LeadTemperature, ParticipantRole } from "@/store/api/@types/lead.types";

export const STAGE_ORDER: LeadStage[] = ["NEW", "QUALIFICATION", "MEETING", "TRIAL", "CLOSING"];

export const STAGE_META: Record<LeadStage, { label: string; description: string }> = {
	NEW: { label: "Novo lead", description: "Chegou pelo RD Station ou cadastro manual e aguarda o primeiro contato" },
	QUALIFICATION: { label: "Pré-atendimento", description: "SDR em contato, entendendo o cenário e qualificando" },
	MEETING: { label: "Reunião", description: "Reunião de apresentação agendada ou realizada" },
	TRIAL: { label: "Trial", description: "Teste gratuito de 5 a 7 dias com acompanhamento" },
	CLOSING: { label: "Venda", description: "Proposta enviada e negociação para fechamento" },
};

export const TEMPERATURE_META: Record<LeadTemperature, { label: string; color: "info" | "warning" | "error" }> = {
	COLD: { label: "Frio", color: "info" },
	WARM: { label: "Morno", color: "warning" },
	HOT: { label: "Quente", color: "error" },
};

export const PARTICIPANT_ROLE_LABELS: Record<ParticipantRole, string> = {
	SDR: "SDR",
	CLOSER: "Closer",
	ONBOARDING: "Onboarding",
	TECHNICAL: "Técnico",
	OBSERVER: "Acompanhando",
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

export const PLANS = ["Essencial", "Profissional", "Enterprise"];

export const LEAD_SOURCES = ["Manual", "RD Station", "Indicação", "Evento", "Prospecção ativa", "Parceiro"];

export const ROLE_LABELS = { ADMIN: "Administrador", MANAGER: "Gestor", SALES: "Comercial" } as const;
