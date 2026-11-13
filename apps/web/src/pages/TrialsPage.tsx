import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageActions, PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { StageChip } from "@/components/ui/StageChip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getTrialProgress, trialDaysLeftLabel } from "@/features/trials/trialProgress";
import type { Lead } from "@/store/api/@types/lead.types";
import { useGetTrialsQuery } from "@/store/api/hooks";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { CircleAlert, FlaskConical } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

const ENDED_LABELS = { CONVERTED: "Convertido", EXPIRED: "Encerrado", CANCELED: "Cancelado", ACTIVE: "Ativo" } as const;

function TrialCard({ lead }: { lead: Lead }) {
	const navigate = useNavigate();
	const trial = lead.trial;
	if (!trial) return null;
	const p = getTrialProgress(trial);
	const isActive = trial.status === "ACTIVE";
	const tone = p.isExpired ? "error" : p.isEndingSoon ? "warning" : "primary";

	return (
		<ButtonBase
			onClick={() => navigate(`/leads/${lead.id}?aba=trial`)}
			className="!block !text-left !rounded-xl w-full"
			data-cy={`trial-card-${lead.id}`}
		>
			<Paper
				className="rounded-xl p-4 space-y-3 h-full"
				sx={{
					border: 1,
					borderColor: p.isExpired && isActive ? "error.main" : "divider",
					"&:hover": { borderColor: "text.disabled" },
				}}
			>
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0">
						<Typography variant="body2" fontWeight={700} noWrap>
							{lead.companyName ?? lead.name}
						</Typography>
						<Typography variant="caption" color="text.secondary" noWrap component="div">
							{lead.name} · {formatCurrency(lead.estimatedValue)}/mês
						</Typography>
					</div>
					<UserAvatar user={lead.owner} size={28} />
				</div>
				{isActive ? (
					<>
						<div className="space-y-1">
							<div className="flex justify-between">
								<Typography variant="caption" fontWeight={600}>
									Dia {p.currentDay} de {p.totalDays}
								</Typography>
								<Typography
									variant="caption"
									fontWeight={600}
									color={p.isExpired ? "error.main" : p.isEndingSoon ? "warning.main" : "text.secondary"}
								>
									{trialDaysLeftLabel(p.daysLeft)}
								</Typography>
							</div>
							<LinearProgress variant="determinate" value={p.timePercent} color={tone} aria-label="Tempo decorrido" />
						</div>
						<div className="space-y-1">
							<div className="flex justify-between">
								<Typography variant="caption" color="text.secondary">
									Roteiro
								</Typography>
								<Typography variant="caption" fontWeight={600}>
									{p.checklistDone}/{p.checklistTotal}
								</Typography>
							</div>
							<LinearProgress
								variant="determinate"
								value={p.checklistPercent}
								color="success"
								aria-label="Roteiro concluído"
							/>
						</div>
						<Box className="rounded-lg px-2.5 py-2 flex items-center gap-2" sx={{ bgcolor: "action.hover" }}>
							{p.overdueItems > 0 && <CircleAlert size={15} strokeWidth={1.5} color="var(--mui-palette-error-main)" />}
							<Typography variant="caption" className="truncate">
								{p.nextItem ? (
									<>
										<b>Próximo · D{p.nextItem.dayOffset}:</b> {p.nextItem.title}
									</>
								) : (
									"Roteiro concluído. Hora da decisão!"
								)}
							</Typography>
						</Box>
					</>
				) : (
					<div className="flex items-center justify-between">
						<Typography variant="caption" color="text.secondary">
							{formatShortDate(trial.startDate)} a {formatShortDate(trial.endDate)} · {ENDED_LABELS[trial.status]}
						</Typography>
						<StageChip stage={lead.stage} status={lead.status} />
					</div>
				)}
			</Paper>
		</ButtonBase>
	);
}

export function TrialsPage() {
	const [tab, setTab] = useState<"ACTIVE" | "ENDED">("ACTIVE");
	const [scope, setScope] = useState<"all" | "mine">("all");
	const { data, isLoading } = useGetTrialsQuery({ status: tab, mine: scope === "mine" });
	const leads = data?.data ?? [];
	const attention =
		tab === "ACTIVE"
			? leads.filter((l) => l.trial && (getTrialProgress(l.trial).isEndingSoon || getTrialProgress(l.trial).isExpired))
					.length
			: 0;

	return (
		<PageSimple
			header={
				<div className="space-y-3">
					<PageHeader>
						<PageTitle
							title="Trials"
							icon={<FlaskConical strokeWidth={1.5} size={16} />}
							subInfo={
								tab === "ACTIVE"
									? `${leads.length} em andamento${attention ? ` · ${attention} precisam de atenção` : ""}`
									: `${leads.length} encerrados`
							}
						/>
						<PageActions>
							<ToggleButtonGroup
								exclusive
								size="small"
								value={scope}
								onChange={(_, v) => v && setScope(v)}
								sx={{ "& .MuiToggleButton-root": { height: 36, px: 1.75, textTransform: "none", fontWeight: 600 } }}
							>
								<ToggleButton value="all">Todos</ToggleButton>
								<ToggleButton value="mine">Meus trials</ToggleButton>
							</ToggleButtonGroup>
						</PageActions>
					</PageHeader>
					<Tabs value={tab} onChange={(_, v) => setTab(v)}>
						<Tab value="ACTIVE" label="Em andamento" data-cy="tab-trials-active" />
						<Tab value="ENDED" label="Encerrados" data-cy="tab-trials-ended" />
					</Tabs>
				</div>
			}
			content={
				isLoading ? (
					<LoadingContent />
				) : leads.length === 0 ? (
					<EmptyState
						icon={<FlaskConical size={40} strokeWidth={1.5} />}
						title={tab === "ACTIVE" ? "Nenhum trial em andamento" : "Nenhum trial encerrado"}
						description="Inicie um trial pela página do lead ou arrastando o card para a etapa Trial no pipeline."
					/>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
						{leads.map((lead) => (
							<TrialCard key={lead.id} lead={lead} />
						))}
					</div>
				)
			}
		/>
	);
}
