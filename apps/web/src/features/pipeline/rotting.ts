import type { LeadStage } from "@/store/api/@types/lead.types";

/** Dias na mesma etapa a partir dos quais o lead é considerado parado. */
export const ROTTING_DAYS: Record<LeadStage, number | null> = {
	NEW: 1,
	QUALIFICATION: 3,
	MEETING: 7,
	TRIAL: null, // o trial tem prazo próprio
	CLOSING: 7,
};
