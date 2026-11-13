import type { LeadStage } from "@/store/api/@types/lead.types";
import { STAGE_COLORS } from "@/theme/stages";
import { useColorScheme } from "@mui/material/styles";
import { useCallback } from "react";

/** Cor da etapa já ajustada ao modo claro/escuro. */
export function useStageColor() {
	const { mode, systemMode } = useColorScheme();
	const isDark = (mode === "system" ? systemMode : mode) === "dark";
	return useCallback((stage: LeadStage) => STAGE_COLORS[stage][isDark ? "dark" : "light"], [isDark]);
}

export function useIsDarkMode() {
	const { mode, systemMode } = useColorScheme();
	return (mode === "system" ? systemMode : mode) === "dark";
}
