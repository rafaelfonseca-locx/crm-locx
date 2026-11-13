import { STAGE_META } from "@/features/leads/constants";
import { useStageColor } from "@/hooks/useStageColor";
import type { LeadStage, LeadStatus } from "@/store/api/@types/lead.types";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { CircleCheck, CircleX } from "lucide-react";

/** Etapa (cor de identidade + nome) ou status final (ícone + texto, nunca só cor). */
export function StageChip({
	stage,
	status = "OPEN",
	size = "small",
}: { stage: LeadStage; status?: LeadStatus; size?: "small" | "medium" }) {
	const stageColor = useStageColor();
	if (status === "WON") {
		return (
			<Chip
				size={size}
				color="success"
				variant="outlined"
				icon={<CircleCheck size={14} strokeWidth={1.5} />}
				label="Ganho"
			/>
		);
	}
	if (status === "LOST") {
		return (
			<Chip
				size={size}
				color="error"
				variant="outlined"
				icon={<CircleX size={14} strokeWidth={1.5} />}
				label="Perdido"
			/>
		);
	}
	return (
		<Chip
			size={size}
			variant="outlined"
			icon={
				<Box
					component="span"
					sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: stageColor(stage), ml: "8px !important" }}
				/>
			}
			label={STAGE_META[stage].label}
		/>
	);
}
