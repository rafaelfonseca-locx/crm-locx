import { UserAvatar } from "@/components/ui/UserAvatar";
import { ChannelIcon } from "@/features/leads/components/ChannelIcon";
import { PARTICIPANT_ROLE_LABELS, TEMPERATURE_META } from "@/features/leads/constants";
import { getTrialProgress, trialDaysLeftLabel } from "@/features/trials/trialProgress";
import type { Lead } from "@/store/api/@types/lead.types";
import { daysSince, formatCurrency, formatRelativeDay } from "@/utils/formatters";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { AlarmClockOff, CalendarClock, CircleAlert, Clock, Flame, Handshake, Snowflake, Sun } from "lucide-react";
import type { CSSProperties } from "react";
import { ROTTING_DAYS } from "../rotting";

const TEMPERATURE_ICONS = { COLD: Snowflake, WARM: Sun, HOT: Flame };
const TEMPERATURE_COLORS = { COLD: "info.main", WARM: "warning.main", HOT: "error.main" };

/** Ícone do próximo passo: verde (agendado), vermelho (atrasado) ou laranja (sem próximo passo). */
function NextStepIndicator({ activity }: { activity: Lead["nextActivity"] }) {
	if (!activity?.dueAt) {
		return (
			<Tooltip title="Sem próximo passo. Crie uma tarefa ou agende uma reunião para não esquecer este lead.">
				<Box
					className="flex items-center justify-center w-6 h-6 rounded-full"
					sx={{ bgcolor: "rgba(230,81,0,0.12)", color: "warning.main" }}
					aria-label="Sem próximo passo"
				>
					<AlarmClockOff size={13} strokeWidth={2} />
				</Box>
			</Tooltip>
		);
	}
	const overdue = new Date(activity.dueAt) < new Date();
	const Icon = overdue ? CircleAlert : activity.type === "MEETING" ? CalendarClock : Clock;
	return (
		<Tooltip
			title={`${overdue ? "Atrasada" : "Próximo passo"}: ${activity.title ?? ""} · ${formatRelativeDay(activity.dueAt)}`}
		>
			<Box
				className="flex items-center justify-center w-6 h-6 rounded-full"
				sx={{
					bgcolor: overdue ? "rgba(211,47,47,0.12)" : "rgba(46,125,50,0.12)",
					color: overdue ? "error.main" : "success.main",
				}}
				aria-label={overdue ? "Próximo passo atrasado" : "Próximo passo agendado"}
			>
				<Icon size={13} strokeWidth={2} />
			</Box>
		</Tooltip>
	);
}

type LeadCardProps = {
	lead: Lead;
	isDragging?: boolean;
	isOverlay?: boolean;
	onClaim?: (lead: Lead) => void;
	style?: CSSProperties;
};

export function LeadCard({ lead, isDragging, isOverlay, onClaim, style }: LeadCardProps) {
	const daysInStage = daysSince(lead.stageChangedAt);
	const rotLimit = ROTTING_DAYS[lead.stage];
	const isRotting = rotLimit !== null && daysInStage > rotLimit;
	const trial = lead.trial?.status === "ACTIVE" ? getTrialProgress(lead.trial) : null;
	const TemperatureIcon = lead.temperature ? TEMPERATURE_ICONS[lead.temperature] : null;
	const subtitle = [
		lead.companyName ? lead.name : (lead.email ?? null),
		lead.contractsRange ? `${lead.contractsRange} contratos` : null,
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<Box
			style={style}
			className="rounded-lg border px-3 py-2.5 select-none"
			sx={{
				bgcolor: "background.paper",
				opacity: isDragging ? 0.35 : 1,
				boxShadow: isOverlay ? "0 12px 32px rgba(0,0,0,0.18)" : "0 1px 2px rgba(16,24,40,0.05)",
				transform: isOverlay ? "rotate(1.5deg)" : undefined,
				cursor: isOverlay ? "grabbing" : "pointer",
				borderLeft: isRotting ? "3px solid" : undefined,
				borderLeftColor: isRotting ? "error.main" : undefined,
				transition: "border-color 120ms, box-shadow 120ms",
				"&:hover": { borderColor: "text.disabled", boxShadow: "0 4px 12px rgba(16,24,40,0.08)" },
			}}
			data-cy={`lead-card-${lead.id}`}
		>
			<div className="flex items-start gap-1.5">
				<Typography
					variant="body2"
					fontWeight={600}
					className="flex-1 min-w-0 leading-snug"
					noWrap
					title={lead.companyName ?? lead.name}
				>
					{lead.companyName ?? lead.name}
				</Typography>
				{lead.temperature && TemperatureIcon && (
					<Tooltip title={`${TEMPERATURE_META[lead.temperature].label}: ${TEMPERATURE_META[lead.temperature].hint}`}>
						<Box
							component="span"
							className="inline-flex pt-0.5"
							sx={{ color: TEMPERATURE_COLORS[lead.temperature] }}
							aria-label={`Temperatura ${TEMPERATURE_META[lead.temperature].label}`}
						>
							<TemperatureIcon size={14} strokeWidth={2} />
						</Box>
					</Tooltip>
				)}
			</div>
			{subtitle && (
				<Typography variant="caption" color="text.secondary" noWrap component="div" className="mt-0.5">
					{subtitle}
				</Typography>
			)}

			{lead.referredBy && (
				<Typography
					variant="caption"
					color="text.secondary"
					noWrap
					component="div"
					className="mt-0.5 flex items-center gap-1"
				>
					<Handshake size={12} strokeWidth={1.75} aria-hidden />
					via {lead.referredBy.companyName ?? lead.referredBy.name}
				</Typography>
			)}

			{(lead.estimatedValue !== null || lead.plan) && (
				<Typography variant="caption" component="div" className="mt-1.5 tabular-nums" color="text.secondary">
					{lead.estimatedValue !== null && (
						<Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
							{formatCurrency(lead.estimatedValue)}
						</Box>
					)}
					{lead.estimatedValue !== null && "/mês"}
					{lead.plan && ` · ${lead.plan}${lead.billingCycle === "ANNUAL" ? " anual" : ""}`}
				</Typography>
			)}

			{trial && (
				<div className="mt-2 space-y-1">
					<div className="flex justify-between items-baseline">
						<Typography variant="caption" fontWeight={600}>
							Dia {trial.currentDay}/{trial.totalDays}
							<Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
								{" "}
								· roteiro {trial.checklistDone}/{trial.checklistTotal}
							</Box>
						</Typography>
						<Typography
							variant="caption"
							fontWeight={600}
							color={trial.isExpired ? "error.main" : trial.isEndingSoon ? "warning.main" : "text.secondary"}
						>
							{trial.daysLeft < 0 ? "Vencido" : `${trial.daysLeft}d`}
						</Typography>
					</div>
					<Tooltip title={trialDaysLeftLabel(trial.daysLeft)}>
						<LinearProgress
							variant="determinate"
							value={trial.timePercent}
							color={trial.isExpired ? "error" : trial.isEndingSoon ? "warning" : "primary"}
							sx={{ height: 4 }}
							aria-label="Progresso do trial"
						/>
					</Tooltip>
				</div>
			)}

			<div className="flex items-center gap-2 mt-2.5">
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
							sx={{ height: 22, fontSize: 11, px: 1, minWidth: 0, borderRadius: 1.5 }}
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
				<ChannelIcon channel={lead.channel} size={13} />
				<div className="flex-1" />
				<Tooltip
					title={
						isRotting
							? `Parado há ${daysInStage} dias nesta etapa (o normal é até ${rotLimit})`
							: `${daysInStage} ${daysInStage === 1 ? "dia" : "dias"} nesta etapa`
					}
				>
					<Typography
						variant="caption"
						color={isRotting ? "error.main" : "text.disabled"}
						fontWeight={isRotting ? 600 : 400}
						className="tabular-nums"
					>
						{daysInStage}d
					</Typography>
				</Tooltip>
				<NextStepIndicator activity={lead.nextActivity} />
			</div>
		</Box>
	);
}
