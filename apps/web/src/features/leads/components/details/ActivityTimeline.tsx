import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAskDialog } from "@/hooks/useAskDialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import type { Activity } from "@/store/api/@types/activity.types";
import { useDeleteActivityMutation, useGetLeadActivitiesQuery, useUpdateActivityMutation } from "@/store/api/hooks";
import { formatRelativeDay, formatTime } from "@/utils/formatters";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, Video } from "lucide-react";
import { ACTIVITY_LABELS } from "../../constants";
import { ACTIVITY_ICONS } from "./activityIcons";

function dayLabel(date: Date) {
	if (isToday(date)) return "Hoje";
	if (isYesterday(date)) return "Ontem";
	return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

function useActivityActions(leadId: number) {
	const notify = useNotify();
	const { askBeforeDelete } = useAskDialog();
	const [updateActivity] = useUpdateActivityMutation();
	const [deleteActivity] = useDeleteActivityMutation();

	const toggle = async (activity: Activity) => {
		try {
			await updateActivity({ id: activity.id, leadId, completed: !activity.completedAt }).unwrap();
			notify.success(activity.completedAt ? "Atividade reaberta" : `${ACTIVITY_LABELS[activity.type]} concluída`);
		} catch (error) {
			notify.apiError(error);
		}
	};

	const remove = (activity: Activity) =>
		askBeforeDelete({
			title: `Excluir ${ACTIVITY_LABELS[activity.type].toLowerCase()}`,
			subtitle: "Tem certeza que deseja excluir este registro?",
			onRemove: async () => {
				try {
					await deleteActivity({ id: activity.id, leadId }).unwrap();
					notify.success("Atividade excluída com sucesso");
				} catch (error) {
					notify.apiError(error);
				}
			},
		});

	return { toggle, remove };
}

/** Tarefas e reuniões em aberto, ordenadas pelo prazo. */
export function UpcomingActivities({ leadId }: { leadId: number }) {
	const { data } = useGetLeadActivitiesQuery(leadId);
	const { toggle } = useActivityActions(leadId);
	const open = (data?.data ?? [])
		.filter((a) => (a.type === "TASK" || a.type === "MEETING") && !a.completedAt)
		.sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime());

	if (open.length === 0) return null;

	return (
		<Paper
			className="rounded-xl p-3 space-y-1"
			sx={{ border: 1, borderColor: "divider" }}
			data-cy="upcoming-activities"
		>
			<Typography variant="subtitle2" className="font-bold px-1 pb-1">
				Próximos passos
			</Typography>
			{open.map((activity) => {
				const Icon = ACTIVITY_ICONS[activity.type];
				const overdue = activity.dueAt && new Date(activity.dueAt) < new Date();
				return (
					<div
						key={activity.id}
						className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-[var(--mui-palette-action-hover)]"
					>
						<Checkbox
							size="small"
							checked={false}
							onChange={() => toggle(activity)}
							slotProps={{ input: { "aria-label": `Concluir ${activity.title ?? ""}` } }}
							data-cy={`activity-action-complete-${activity.id}`}
						/>
						<Icon size={16} strokeWidth={1.5} className="shrink-0 opacity-70" />
						<div className="flex-1 min-w-0">
							<Typography variant="body2" fontWeight={500} noWrap>
								{activity.title}
							</Typography>
							{activity.body && (
								<Typography variant="caption" color="text.secondary" noWrap component="div">
									{activity.body}
								</Typography>
							)}
						</div>
						{activity.meetingUrl && (
							<Tooltip title="Entrar na reunião">
								<IconButton
									size="small"
									component="a"
									href={activity.meetingUrl}
									target="_blank"
									rel="noreferrer"
									aria-label="Entrar na reunião"
								>
									<Video size={16} strokeWidth={1.5} />
								</IconButton>
							</Tooltip>
						)}
						<Typography
							variant="caption"
							fontWeight={600}
							color={overdue ? "error.main" : "text.secondary"}
							className="shrink-0 tabular-nums"
						>
							{overdue ? "Atrasada · " : ""}
							{activity.dueAt && formatRelativeDay(activity.dueAt)}
						</Typography>
						{activity.assignee && (
							<UserAvatar user={activity.assignee} size={22} tooltip={`Para ${activity.assignee.name}`} />
						)}
					</div>
				);
			})}
		</Paper>
	);
}

function TimelineItem({
	activity,
	onToggle,
	onDelete,
	canDelete,
}: { activity: Activity; onToggle: () => void; onDelete: () => void; canDelete: boolean }) {
	const Icon = ACTIVITY_ICONS[activity.type];
	const isAutomatic = activity.type === "SYSTEM" || activity.type === "STAGE_CHANGE";
	const isSchedulable = activity.type === "TASK" || activity.type === "MEETING";

	return (
		<li className="relative flex gap-3 pb-5 group">
			<Box
				className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 border"
				sx={{
					bgcolor: isAutomatic ? "background.default" : "background.paper",
					color: activity.type === "STAGE_CHANGE" ? "primary.dark" : "text.secondary",
				}}
			>
				<Icon size={15} strokeWidth={1.5} />
			</Box>
			<div className="flex-1 min-w-0 pt-1">
				<div className="flex flex-wrap items-baseline gap-x-2">
					<Typography
						variant="body2"
						fontWeight={isAutomatic ? 500 : 600}
						color={isAutomatic ? "text.secondary" : "text.primary"}
					>
						{activity.title ?? ACTIVITY_LABELS[activity.type]}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{activity.author ? `${activity.author.name} · ` : ""}
						{formatTime(activity.createdAt)}
						{isSchedulable && activity.dueAt && ` · prazo ${formatRelativeDay(activity.dueAt)}`}
						{isSchedulable && (activity.completedAt ? " · concluída" : " · em aberto")}
					</Typography>
				</div>
				{activity.body && (
					<Box
						className="mt-1.5 rounded-lg px-3 py-2 whitespace-pre-wrap text-[13px]"
						sx={{ bgcolor: activity.type === "NOTE" ? "rgba(255,204,0,0.10)" : "action.hover" }}
					>
						{activity.body}
					</Box>
				)}
				{activity.meetingUrl && (
					<Link
						href={activity.meetingUrl}
						target="_blank"
						rel="noreferrer"
						variant="caption"
						className="inline-flex items-center gap-1 mt-1"
					>
						<Video size={13} strokeWidth={1.5} /> Link da reunião
					</Link>
				)}
			</div>
			{!isAutomatic && (
				<div className="flex items-start gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
					{isSchedulable && (
						<Tooltip title={activity.completedAt ? "Reabrir" : "Concluir"}>
							<Checkbox
								size="small"
								checked={!!activity.completedAt}
								onChange={onToggle}
								slotProps={{ input: { "aria-label": "Concluir atividade" } }}
							/>
						</Tooltip>
					)}
					{canDelete && (
						<Tooltip title="Excluir">
							<IconButton
								size="small"
								onClick={onDelete}
								aria-label="Excluir atividade"
								data-cy={`activity-action-delete-${activity.id}`}
							>
								<Trash2 size={15} strokeWidth={1.5} />
							</IconButton>
						</Tooltip>
					)}
				</div>
			)}
		</li>
	);
}

export function ActivityTimeline({ leadId }: { leadId: number }) {
	const { user, isManager } = useAuth();
	const { data, isLoading } = useGetLeadActivitiesQuery(leadId);
	const { toggle, remove } = useActivityActions(leadId);

	if (isLoading) {
		return (
			<div className="space-y-3">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} variant="rounded" height={48} />
				))}
			</div>
		);
	}

	const groups = new Map<string, Activity[]>();
	for (const activity of data?.data ?? []) {
		const key = format(new Date(activity.createdAt), "yyyy-MM-dd");
		groups.set(key, [...(groups.get(key) ?? []), activity]);
	}

	return (
		<div className="space-y-2" data-cy="activity-timeline">
			{[...groups.entries()].map(([key, items]) => (
				<section key={key}>
					<Typography
						variant="caption"
						color="text.secondary"
						className="block font-semibold uppercase tracking-wide pb-3 first-letter:uppercase"
					>
						{dayLabel(new Date(`${key}T12:00:00`))}
					</Typography>
					<ol className="relative before:absolute before:left-4 before:top-2 before:bottom-4 before:w-px before:bg-[var(--mui-palette-divider)]">
						{items.map((activity) => (
							<TimelineItem
								key={activity.id}
								activity={activity}
								onToggle={() => toggle(activity)}
								onDelete={() => remove(activity)}
								canDelete={isManager || activity.author?.id === user?.id}
							/>
						))}
					</ol>
				</section>
			))}
		</div>
	);
}
