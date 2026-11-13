import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageActions, PageHeader, PageSimple } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { StageChip } from "@/components/ui/StageChip";
import { ActivityComposer } from "@/features/leads/components/details/ActivityComposer";
import { ActivityTimeline, UpcomingActivities } from "@/features/leads/components/details/ActivityTimeline";
import { CompanyCard, ContactCard, OpportunityCard, OriginCard } from "@/features/leads/components/details/InfoCards";
import { StageHistory } from "@/features/leads/components/details/StageHistory";
import { StagePath } from "@/features/leads/components/details/StagePath";
import { TeamCard } from "@/features/leads/components/details/TeamCard";
import { TrialPanel } from "@/features/leads/components/details/TrialPanel";
import { useLeadDialogs } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { getTrialProgress, trialDaysLeftLabel } from "@/features/trials/trialProgress";
import { useAskDialog } from "@/hooks/useAskDialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import {
	useClaimLeadMutation,
	useDeleteLeadMutation,
	useGetLeadByIdQuery,
	useReopenLeadMutation,
} from "@/store/api/hooks";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
	ArrowLeft,
	CalendarPlus,
	CircleCheck,
	CircleX,
	EllipsisVertical,
	FlaskConical,
	Pencil,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";

const TABS = ["atividades", "trial", "historico"] as const;
type TabKey = (typeof TABS)[number];

export function LeadDetailsPage() {
	const { id } = useParams();
	const leadId = Number(id);
	const navigate = useNavigate();
	const notify = useNotify();
	const { isManager } = useAuth();
	const { askBeforeDelete } = useAskDialog();
	const dialogs = useLeadDialogs();
	const [searchParams, setSearchParams] = useSearchParams();
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const { data, isLoading, isError } = useGetLeadByIdQuery(leadId, { skip: !Number.isInteger(leadId) });
	const [reopenLead, { isLoading: isReopening }] = useReopenLeadMutation();
	const [deleteLead] = useDeleteLeadMutation();
	const [claimLead, { isLoading: isClaiming }] = useClaimLeadMutation();

	const tabParam = searchParams.get("aba") as TabKey | null;
	const tab: TabKey = tabParam && TABS.includes(tabParam) ? tabParam : "atividades";
	const setTab = (value: TabKey) => setSearchParams(value === "atividades" ? {} : { aba: value }, { replace: true });

	if (isLoading) return <LoadingContent />;
	if (isError || !data) {
		return (
			<EmptyState
				title="Lead não encontrado"
				description="Ele pode ter sido excluído ou o link está incorreto."
				action={
					<Button component={Link} to="/pipeline" variant="outlined" color="inherit">
						Voltar ao pipeline
					</Button>
				}
			/>
		);
	}

	const lead = data.data;
	const isOpen = lead.status === "OPEN";
	const activeTrial = lead.trial?.status === "ACTIVE" ? getTrialProgress(lead.trial) : null;

	const handleReopen = async () => {
		try {
			await reopenLead(lead.id).unwrap();
			notify.success("Lead reaberto");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleClaim = async () => {
		try {
			await claimLead(lead.id).unwrap();
			notify.success("Lead assumido com sucesso");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleDelete = () => {
		setMenuAnchor(null);
		askBeforeDelete({
			title: "Excluir lead",
			subtitle: `Tem certeza que deseja excluir o lead #${lead.id}? Atividades e trial também serão excluídos.`,
			onRemove: async () => {
				try {
					await deleteLead(lead.id).unwrap();
					notify.success("Lead excluído com sucesso");
					navigate("/pipeline");
				} catch (error) {
					notify.apiError(error);
				}
			},
		});
	};

	return (
		<PageSimple
			header={
				<div className="space-y-4">
					<PageHeader>
						<div className="flex items-start gap-2 min-w-0">
							<IconButton onClick={() => navigate(-1)} aria-label="Voltar" className="mt-0.5">
								<ArrowLeft size={20} strokeWidth={1.5} />
							</IconButton>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<Typography component="h1" className="text-xl font-bold truncate">
										{lead.companyName ?? lead.name}
									</Typography>
									<StageChip stage={lead.stage} status={lead.status} />
									{activeTrial && (
										<Chip
											size="small"
											icon={<FlaskConical size={13} strokeWidth={1.5} />}
											color={activeTrial.isExpired ? "error" : activeTrial.isEndingSoon ? "warning" : "default"}
											variant="outlined"
											label={`Trial · ${trialDaysLeftLabel(activeTrial.daysLeft)}`}
										/>
									)}
								</div>
								<Typography variant="body2" color="text.secondary" className="truncate">
									#{lead.id} · {lead.name}
									{lead.jobTitle ? ` · ${lead.jobTitle}` : ""}
									{lead.estimatedValue !== null ? ` · ${formatCurrency(lead.estimatedValue)}/mês` : ""}
								</Typography>
							</div>
						</div>
						<PageActions>
							{isOpen ? (
								<>
									<Button
										variant="outlined"
										color="inherit"
										startIcon={<CalendarPlus size={16} strokeWidth={1.5} />}
										onClick={() => dialogs.openScheduleMeeting(lead)}
										data-cy="lead-action-meeting"
									>
										Agendar reunião
									</Button>
									{!activeTrial && (
										<Button
											variant="outlined"
											color="inherit"
											startIcon={<FlaskConical size={16} strokeWidth={1.5} />}
											onClick={() => dialogs.openStartTrial(lead)}
											data-cy="lead-action-trial"
										>
											Iniciar trial
										</Button>
									)}
									<Button
										variant="outlined"
										color="error"
										startIcon={<CircleX size={16} strokeWidth={1.5} />}
										onClick={() => dialogs.openLose(lead)}
										data-cy="lead-action-lose"
									>
										Perdido
									</Button>
									<Button
										color="success"
										startIcon={<CircleCheck size={16} strokeWidth={1.5} />}
										onClick={() => dialogs.openWin(lead)}
										data-cy="lead-action-win"
									>
										Ganho
									</Button>
								</>
							) : (
								<Button
									variant="outlined"
									color="inherit"
									startIcon={<RotateCcw size={16} strokeWidth={1.5} />}
									onClick={handleReopen}
									loading={isReopening}
									data-cy="lead-action-reopen"
								>
									Reabrir lead
								</Button>
							)}
							<IconButton
								onClick={(e) => setMenuAnchor(e.currentTarget)}
								aria-label="Mais ações"
								data-cy="lead-more-actions"
							>
								<EllipsisVertical size={20} strokeWidth={1.5} />
							</IconButton>
							<Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
								<MenuItem
									dense
									onClick={() => {
										setMenuAnchor(null);
										dialogs.openEditLead(lead);
									}}
								>
									<ListItemIcon>
										<Pencil size={18} strokeWidth={1.5} />
									</ListItemIcon>
									Editar
								</MenuItem>
								<MenuItem dense onClick={handleDelete} disabled={!isManager} data-cy="lead-action-delete">
									<ListItemIcon>
										<Trash2 size={18} strokeWidth={1.5} color="var(--mui-palette-error-main)" />
									</ListItemIcon>
									{isManager ? "Excluir" : "Excluir (somente gestão)"}
								</MenuItem>
							</Menu>
						</PageActions>
					</PageHeader>
					<StagePath lead={lead} onSelect={(stage) => dialogs.requestStageChange(lead, stage)} />
					{lead.status === "WON" && (
						<Alert severity="success" icon={<CircleCheck size={20} strokeWidth={1.5} />}>
							Venda ganha em {formatShortDate(lead.wonAt)}
							{lead.estimatedValue !== null ? ` · ${formatCurrency(lead.estimatedValue)}/mês` : ""}
							{lead.plan ? ` · plano ${lead.plan}` : ""}
						</Alert>
					)}
					{lead.status === "LOST" && (
						<Alert severity="error" icon={<CircleX size={20} strokeWidth={1.5} />}>
							Perdido em {formatShortDate(lead.lostAt)} · motivo: {lead.lostReason}
						</Alert>
					)}
					{!lead.owner && isOpen && (
						<Alert
							severity="warning"
							action={
								<Button
									size="small"
									color="inherit"
									onClick={handleClaim}
									loading={isClaiming}
									data-cy="lead-action-claim"
								>
									Assumir lead
								</Button>
							}
						>
							Este lead está sem responsável.
						</Alert>
					)}
				</div>
			}
			content={
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
					<div className="lg:col-span-8 space-y-4 min-w-0">
						<Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} aria-label="Seções do lead">
							<Tab value="atividades" label="Atividades" data-cy="tab-activities" />
							<Tab
								value="trial"
								label={
									<span className="flex items-center gap-1.5">
										Trial
										{activeTrial &&
											(activeTrial.isEndingSoon || activeTrial.isExpired || activeTrial.overdueItems > 0) && (
												<span
													className="w-2 h-2 rounded-full bg-[var(--mui-palette-warning-main)]"
													aria-label="requer atenção"
												/>
											)}
									</span>
								}
								data-cy="tab-trial"
							/>
							<Tab value="historico" label="Histórico de etapas" data-cy="tab-history" />
						</Tabs>
						{tab === "atividades" && (
							<div className="space-y-4">
								<ActivityComposer lead={lead} />
								<UpcomingActivities leadId={lead.id} />
								<ActivityTimeline leadId={lead.id} />
							</div>
						)}
						{tab === "trial" && <TrialPanel lead={lead} />}
						{tab === "historico" && <StageHistory leadId={lead.id} />}
					</div>
					<aside className="lg:col-span-4 space-y-4">
						<TeamCard lead={lead} />
						<ContactCard lead={lead} onEdit={() => dialogs.openEditLead(lead)} />
						<OpportunityCard lead={lead} />
						<CompanyCard lead={lead} />
						<OriginCard lead={lead} />
					</aside>
				</div>
			}
		/>
	);
}
