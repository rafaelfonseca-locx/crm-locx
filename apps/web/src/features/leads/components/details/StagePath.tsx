import { useStageColor } from "@/hooks/useStageColor";
import type { Lead, LeadStage } from "@/store/api/@types/lead.types";
import { daysSince } from "@/utils/formatters";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Check } from "lucide-react";
import { STAGE_META, STAGE_ORDER } from "../../constants";

/** Trilha de etapas clicável (estilo "path"): passado com check, atual destacada. */
export function StagePath({ lead, onSelect }: { lead: Lead; onSelect: (stage: LeadStage) => void }) {
	const stageColor = useStageColor();
	const currentIndex = STAGE_ORDER.indexOf(lead.stage);
	const isClosed = lead.status !== "OPEN";

	return (
		<nav aria-label="Etapas do lead" className="grid grid-cols-5 gap-1.5">
			{STAGE_ORDER.map((stage, index) => {
				const isCurrent = index === currentIndex;
				const isPast = index < currentIndex || (lead.status === "WON" && isCurrent);
				const color = stageColor(stage);
				return (
					<Tooltip
						key={stage}
						title={
							isClosed
								? "Reabra o lead para mudar a etapa"
								: isCurrent
									? STAGE_META[stage].description
									: `Mover para ${STAGE_META[stage].label}`
						}
					>
						<span>
							<ButtonBase
								disabled={isClosed || isCurrent}
								onClick={() => onSelect(stage)}
								aria-current={isCurrent ? "step" : undefined}
								data-cy={`stage-path-${stage}`}
								className="w-full flex-col !items-start rounded-lg px-3 py-2 text-left"
								sx={{
									border: 1,
									borderColor: isCurrent ? color : "divider",
									bgcolor: isCurrent ? "background.paper" : isPast ? "action.hover" : "transparent",
									boxShadow: isCurrent ? `inset 0 -3px 0 ${color}` : "none",
									opacity: isClosed && !isCurrent ? 0.55 : 1,
									"&:hover": { bgcolor: "action.hover" },
								}}
							>
								<div className="flex items-center gap-1.5 w-full">
									{isPast ? (
										<Box
											className="flex items-center justify-center w-4 h-4 rounded-full shrink-0"
											sx={{ bgcolor: color, color: "#fff" }}
										>
											<Check size={11} strokeWidth={3} />
										</Box>
									) : (
										<Box
											className="w-2.5 h-2.5 rounded-full shrink-0 m-[3px]"
											sx={{ bgcolor: isCurrent ? color : "action.disabled" }}
										/>
									)}
									<Typography variant="body2" fontWeight={isCurrent ? 700 : 500} noWrap>
										{STAGE_META[stage].label}
									</Typography>
								</div>
								<Typography variant="caption" color="text.secondary" className="pl-[22px] hidden md:block">
									{isCurrent && lead.status === "OPEN" ? `há ${daysSince(lead.stageChangedAt)} dia(s)` : " "}
								</Typography>
							</ButtonBase>
						</span>
					</Tooltip>
				);
			})}
		</nav>
	);
}
