import { EmptyState } from "@/components/ui/EmptyState";
import { getTrialProgress, trialDaysLeftLabel } from "@/features/trials/trialProgress";
import { useAskDialog } from "@/hooks/useAskDialog";
import { useNotify } from "@/hooks/useNotify";
import type { Lead, TrialStatus } from "@/store/api/@types/lead.types";
import {
	useAddChecklistItemMutation,
	useDeleteChecklistItemMutation,
	useToggleChecklistItemMutation,
	useUpdateTrialMutation,
} from "@/store/api/hooks";
import { formatShortDate } from "@/utils/formatters";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { addDays } from "date-fns";
import { CalendarPlus, ExternalLink, FlaskConical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLeadDialogs } from "../dialogs/LeadDialogsProvider";
import { DetailField } from "./InfoCards";

const STATUS_LABELS: Record<TrialStatus, { label: string; severity: "success" | "info" | "warning" | "error" }> = {
	ACTIVE: { label: "Em andamento", severity: "info" },
	CONVERTED: { label: "Convertido em venda", severity: "success" },
	EXPIRED: { label: "Encerrado sem conversão", severity: "warning" },
	CANCELED: { label: "Cancelado", severity: "error" },
};

/** Acompanhamento do trial: prazo, roteiro diário (checklist) e ações de extensão/encerramento. */
export function TrialPanel({ lead }: { lead: Lead }) {
	const notify = useNotify();
	const { ask } = useAskDialog();
	const { openStartTrial, openWin } = useLeadDialogs();
	const [toggleItem] = useToggleChecklistItemMutation();
	const [addItem, { isLoading: isAdding }] = useAddChecklistItemMutation();
	const [deleteItem] = useDeleteChecklistItemMutation();
	const [updateTrial, { isLoading: isUpdating }] = useUpdateTrialMutation();
	const [newTitle, setNewTitle] = useState("");
	const [newDay, setNewDay] = useState(0);

	const trial = lead.trial;
	if (!trial) {
		return (
			<EmptyState
				icon={<FlaskConical size={40} strokeWidth={1.5} />}
				title="Nenhum trial iniciado"
				description="Inicie um teste de 5 a 7 dias. O CRM cria um roteiro de acompanhamento com o que fazer em cada dia."
				action={
					lead.status === "OPEN" && (
						<Button onClick={() => openStartTrial(lead)} data-cy="start-trial">
							Iniciar trial
						</Button>
					)
				}
			/>
		);
	}

	const progress = getTrialProgress(trial);
	const isActive = trial.status === "ACTIVE";
	const leadId = lead.id;

	const handleToggle = async (itemId: string, done: boolean) => {
		try {
			await toggleItem({ trialId: trial.id, itemId, leadId, done }).unwrap();
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleExtend = async (days: number) => {
		try {
			await updateTrial({
				id: trial.id,
				leadId,
				endDate: addDays(new Date(trial.endDate), days).toISOString(),
			}).unwrap();
			notify.success(`Trial estendido em ${days} ${days === 1 ? "dia" : "dias"}`);
		} catch (error) {
			notify.apiError(error);
		}
	};

	const handleEnd = () =>
		ask({
			title: "Encerrar trial sem conversão",
			subtitle: "O trial será encerrado e o lead continua em aberto para você decidir os próximos passos.",
			confirmText: "Encerrar trial",
			destructive: true,
			onConfirm: async () => {
				try {
					await updateTrial({ id: trial.id, leadId, status: "EXPIRED" }).unwrap();
					notify.success("Trial encerrado");
				} catch (error) {
					notify.apiError(error);
				}
			},
		});

	const handleAdd = async () => {
		if (!newTitle.trim()) return;
		try {
			await addItem({ trialId: trial.id, leadId, title: newTitle.trim(), dayOffset: newDay }).unwrap();
			setNewTitle("");
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<div className="space-y-4" data-cy="trial-panel">
			<Paper className="rounded-xl p-4 space-y-4" sx={{ border: 1, borderColor: "divider" }}>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<Typography variant="subtitle1" className="font-bold">
							{isActive ? `Dia ${progress.currentDay} de ${progress.totalDays}` : STATUS_LABELS[trial.status].label}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{formatShortDate(trial.startDate)} até {formatShortDate(trial.endDate)}
							{isActive && (
								<Box
									component="span"
									sx={{
										color: progress.isExpired ? "error.main" : progress.isEndingSoon ? "warning.main" : "inherit",
										fontWeight: 600,
									}}
								>
									{" "}
									· {trialDaysLeftLabel(progress.daysLeft)}
								</Box>
							)}
						</Typography>
					</div>
					<div className="flex flex-wrap gap-2">
						{isActive ? (
							<>
								<Button
									size="small"
									variant="outlined"
									color="inherit"
									startIcon={<CalendarPlus size={15} strokeWidth={1.5} />}
									onClick={() => handleExtend(2)}
									loading={isUpdating}
								>
									Estender 2 dias
								</Button>
								<Button size="small" variant="outlined" color="inherit" onClick={handleEnd} disabled={isUpdating}>
									Encerrar
								</Button>
								<Button size="small" color="success" onClick={() => openWin(lead)}>
									Converter em venda
								</Button>
							</>
						) : (
							lead.status === "OPEN" && (
								<Button size="small" variant="outlined" color="inherit" onClick={() => openStartTrial(lead)}>
									Novo trial
								</Button>
							)
						)}
					</div>
				</div>

				{isActive && (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<div className="flex justify-between">
								<Typography variant="caption" color="text.secondary">
									Tempo decorrido
								</Typography>
								<Typography variant="caption" fontWeight={600}>
									{progress.timePercent}%
								</Typography>
							</div>
							<LinearProgress
								variant="determinate"
								value={progress.timePercent}
								color={progress.isExpired ? "error" : progress.isEndingSoon ? "warning" : "primary"}
								aria-label="Tempo decorrido do trial"
							/>
						</div>
						<div className="space-y-1.5">
							<div className="flex justify-between">
								<Typography variant="caption" color="text.secondary">
									Roteiro concluído
								</Typography>
								<Typography variant="caption" fontWeight={600}>
									{progress.checklistDone}/{progress.checklistTotal}
								</Typography>
							</div>
							<LinearProgress
								variant="determinate"
								value={progress.checklistPercent}
								color="success"
								aria-label="Checklist concluído"
							/>
						</div>
					</div>
				)}

				{progress.isExpired && (
					<Alert severity="error">O prazo do trial acabou. Converta em venda, estenda ou encerre o teste.</Alert>
				)}
				{!progress.isExpired && progress.overdueItems > 0 && isActive && (
					<Alert severity="warning">
						{progress.overdueItems}{" "}
						{progress.overdueItems === 1 ? "etapa do roteiro está atrasada" : "etapas do roteiro estão atrasadas"}.
					</Alert>
				)}

				<div className="grid grid-cols-2 gap-3">
					<DetailField label="Conta de teste">
						{trial.accountUrl && (
							<Link
								href={trial.accountUrl}
								target="_blank"
								rel="noreferrer"
								underline="hover"
								className="inline-flex items-center gap-1 break-all"
							>
								{trial.accountUrl.replace(/^https?:\/\//, "")} <ExternalLink size={12} strokeWidth={1.5} />
							</Link>
						)}
					</DetailField>
					<DetailField label="Objetivos do teste" value={trial.notes} />
				</div>
			</Paper>

			<Paper className="rounded-xl p-4 space-y-2" sx={{ border: 1, borderColor: "divider" }}>
				<Typography variant="subtitle2" className="font-bold">
					Roteiro de acompanhamento
				</Typography>
				<ol className="space-y-0.5">
					{trial.checklist.map((item) => {
						const isLate = isActive && !item.done && item.dayOffset < progress.currentDay;
						const isToday = isActive && !item.done && item.dayOffset === progress.currentDay;
						return (
							<li
								key={item.id}
								className="flex items-center gap-2 rounded-lg px-1 py-1 group hover:bg-[var(--mui-palette-action-hover)]"
							>
								<Checkbox
									size="small"
									checked={item.done}
									disabled={!isActive}
									onChange={(e) => handleToggle(item.id, e.target.checked)}
									slotProps={{ input: { "aria-label": item.title } }}
									data-cy={`trial-checklist-${item.position}`}
								/>
								<Box
									className="w-9 shrink-0 text-center rounded text-xs font-bold py-0.5"
									sx={{
										bgcolor: isToday ? "primary.main" : "action.selected",
										color: isToday ? "primary.contrastText" : "text.secondary",
									}}
								>
									D{item.dayOffset}
								</Box>
								<div className="flex-1 min-w-0">
									<Typography
										variant="body2"
										sx={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.6 : 1 }}
									>
										{item.title}
									</Typography>
									{item.done && item.doneBy && (
										<Typography variant="caption" color="text.secondary">
											{item.doneBy.name} · {formatShortDate(item.doneAt)}
										</Typography>
									)}
								</div>
								{isLate && (
									<Typography variant="caption" color="error.main" fontWeight={600}>
										Atrasado
									</Typography>
								)}
								{isToday && (
									<Typography variant="caption" fontWeight={600}>
										Hoje
									</Typography>
								)}
								{isActive && (
									<Tooltip title="Remover etapa">
										<IconButton
											size="small"
											className="opacity-0 group-hover:opacity-100"
											onClick={() => deleteItem({ trialId: trial.id, itemId: item.id, leadId })}
											aria-label="Remover etapa"
										>
											<Trash2 size={14} strokeWidth={1.5} />
										</IconButton>
									</Tooltip>
								)}
							</li>
						);
					})}
				</ol>
				{isActive && (
					<div className="flex gap-2 pt-2">
						<TextField
							select
							label="Dia"
							value={newDay}
							onChange={(e) => setNewDay(Number(e.target.value))}
							sx={{ width: 90 }}
							fullWidth={false}
						>
							{Array.from({ length: progress.totalDays + 1 }, (_, day) => day).map((d) => (
								<MenuItem key={d} value={d}>
									D{d}
								</MenuItem>
							))}
						</TextField>
						<TextField
							label="Nova etapa do roteiro"
							value={newTitle}
							onChange={(e) => setNewTitle(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAdd()}
							slotProps={{ htmlInput: { maxLength: 160 } }}
						/>
						<Button
							variant="outlined"
							color="inherit"
							onClick={handleAdd}
							loading={isAdding}
							disabled={!newTitle.trim()}
							aria-label="Adicionar etapa"
							sx={{ minWidth: 40, px: 1.25 }}
						>
							<Plus size={18} strokeWidth={1.5} />
						</Button>
					</div>
				)}
			</Paper>
		</div>
	);
}
