import type { LeadStage } from "@/store/api/@types/lead.types";

/**
 * Cores de identidade das etapas (ordem categórica fixa, validada para daltonismo).
 * São cores de dado: sempre acompanhadas do nome da etapa, nunca sozinhas.
 */
export const STAGE_COLORS: Record<LeadStage, { light: string; dark: string }> = {
	NEW: { light: "#2a78d6", dark: "#3987e5" },
	QUALIFICATION: { light: "#eb6834", dark: "#d95926" },
	MEETING: { light: "#1baf7a", dark: "#199e70" },
	TRIAL: { light: "#eda100", dark: "#c98500" },
	CLOSING: { light: "#e87ba4", dark: "#d55181" },
};
