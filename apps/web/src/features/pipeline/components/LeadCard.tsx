import { UserAvatar } from "@/components/ui/UserAvatar";
import { NextActivityLabel } from "@/features/leads/components/NextActivityLabel";
import { PARTICIPANT_ROLE_LABELS, TEMPERATURE_META } from "@/features/leads/constants";
import { getTrialProgress, trialDaysLeftLabel } from "@/features/trials/trialProgress";
import type { Lead } from "@/store/api/@types/lead.types";
import { daysSince, formatCurrency } from "@/utils/formatters";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Flame, Snowflake, Sun, Timer } from "lucide-react";
import type { CSSProperties } from "react";

const TEMPERATURE_ICONS = { COLD: Snowflake, WARM: Sun, HOT: Flame };

type LeadCardProps = {
	lead: Lead;
	isDragging?: boolean;
	isOverlay?: boolean;
	onClaim?: (lead: Lead) => void;
	style?: CSSProperties;
};

export function LeadCard({ lead, isDragging, isOverlay, onClaim, style }: LeadCardProps) {
	const daysInStage = daysSince(lead.stageChangedAt);
	const trial = lead.trial?.status === "ACTIVE" ? getTrialProgress(lead.trial) : null;
	const TemperatureIcon = lead.temperature ? TEMPERATURE_ICONS[lead.temperature] : null;

	return (
		<Box
			style={style}
			className="rounded-xl border p-3 space-y-2.5 select-none"
			sx={{
				bgcolor: "background.paper",
				opacity: isDragging ? 0.35 : 1,
				boxShadow: isOverlay ? 12 : "0 1px 2px rgba(0,0,0,0.04)",
				transform: isOverlay ? "rotate(2deg)" : undefined,
				cursor: isOverlay ? "grabbing" : "pointer",
				transition: "border-color 120ms, box-shadow 120ms",
				"&:hover": { borderColor: "text.disabled", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" },
			}}
			data-cy={`lead-card-${lead.id}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<Typography variant="body2" fontWeight={600} noWrap title={lead.companyName ?? lead.name}>
						{lead.companyName ?? lead.name}
					</Typography>
					<Typography variant="caption" color="text.secondary" noWrap component="div">
						{lead.companyName ? lead.name : (lead.email ?? "Sem empresa")}
					</Typography>
				</div>
				{lead.temperature && TemperatureIcon && (
					<Tooltip title={`Temperatura: ${TEMPERATURE_META[lead.temperature].label}`}>
						<Chip
							size="small"
							variant="outlined"
							color={TEMPERATURE_META[lead.temperature].color}
							icon={<TemperatureIcon size={12} strokeWidth={1.5} />}
							label={TEMPERATURE_META[lead.temperature].label}
							sx={{ height: 22, fontSize: 11, "& .MuiChip-label": { px: 0.75 } }}
						/>
					</Tooltip>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				{lead.estimatedValue !== null && (
					<Typography variant="caption" fontWeight={600} className="tabular-nums">
						{formatCurrency(lead.estimatedValue)}
						<span className="font-normal opacity-60">/mês</span>
					</Typography>
				)}
				{lead.source === "RD Station" && (
					<Chip
						size="small"
						label="RD"
						sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: "action.selected" }}
					/>
				)}
				{lead.tags.slice(0, 2).map((tag) => (
					<Chip key={tag} size="small" label={tag} sx={{ height: 20, fontSize: 10, bgcolor: "action.hover" }} />
				))}
			</div>

			{trial && lead.trial && (
				<div className="space-y-1">
					<div className="flex justify-between">
						<Typography variant="caption" fontWeight={600}>
							Dia {trial.currentDay} de {trial.totalDays}
						</Typography>
						<Typography
							variant="caption"
							color={trial.isExpired ? "error.main" : trial.isEndingSoon ? "warning.main" : "text.secondary"}
							fontWeight={500}
						>
							{trialDaysLeftLabel(trial.daysLeft)}
						</Typography>
					</div>
					<LinearProgress
						variant="determinate"
						value={trial.timePercent}
						color={trial.isExpired ? "error" : trial.isEndingSoon ? "warning" : "primary"}
						aria-label="Progresso do trial"
					/>
					<Typography variant="caption" color="text.secondary" component="div">
						Checklist {trial.checklistDone}/{trial.checklistTotal}
						{trial.overdueItems > 0 && (
							<Box component="span" sx={{ color: "error.main" }}>
								{" "}
								· {trial.overdueItems} pendente{trial.overdueItems > 1 ? "s" : ""}
							</Box>
						)}
					</Typography>
				</div>
			)}

			<div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed">
				<div className="min-w-0 flex-1 pt-1.5">
					<NextActivityLabel activity={lead.nextActivity} />
				</div>
				<div className="flex items-center gap-1.5 pt-1.5 shrink-0">
					<Tooltip title={`${daysInStage} ${daysInStage === 1 ? "dia" : "dias"} nesta etapa`}>
						<Typography
							variant="caption"
							color={daysInStage > 7 ? "warning.main" : "text.disabled"}
							className="flex items-center gap-0.5 tabular-nums"
						>
							<Timer size={12} strokeWidth={1.5} />
							{daysInStage}d
						</Typography>
					</Tooltip>
					{lead.owner ? (
						<div className="flex -space-x-1.5">
							<UserAvatar user={lead.owner} size={22} tooltip={`Responsável: ${lead.owner.name}`} />
							{lead.participants.slice(0, 2).map((p) => (
								<UserAvatar
									key={p.id}
									user={p.user}
									size={22}
									tooltip={`${p.user.name} · ${PARTICIPANT_ROLE_LABELS[p.role]}`}
								/>
							))}
						</div>
					) : (
						onClaim && (
							<Button
								size="small"
								variant="outlined"
								color="inherit"
								sx={{ height: 24, fontSize: 11, px: 1, minWidth: 0 }}
								onPointerDown={(e) => e.stopPropagation()}
								onClick={(e) => {
									e.stopPropagation();
									onClaim(lead);
								}}
								data-cy={`lead-action-claim-${lead.id}`}
							>
								Assumir
							</Button>
						)
					)}
				</div>
			</div>
		</Box>
	);
}
