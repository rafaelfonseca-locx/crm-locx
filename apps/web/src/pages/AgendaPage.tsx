import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageActions, PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { StageChip } from "@/components/ui/StageChip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ACTIVITY_ICONS } from "@/features/leads/components/details/activityIcons";
import { useNotify } from "@/hooks/useNotify";
import type { Activity } from "@/store/api/@types/activity.types";
import { useGetAgendaQuery, useGetUsersQuery, useUpdateActivityMutation } from "@/store/api/hooks";
import { formatDateTime, formatRelativeDay } from "@/utils/formatters";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { endOfDay, isBefore } from "date-fns";
import { CalendarClock, CircleCheckBig, Video } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

type Group = { key: string; title: string; tone?: string; items: Activity[] };

function groupActivities(items: Activity[]): Group[] {
	const now = new Date();
	const todayEnd = endOfDay(now);
	const groups: Group[] = [
		{ key: "overdue", title: "Atrasadas", tone: "error.main", items: [] },
		{ key: "today", title: "Hoje", items: [] },
		{ key: "upcoming", title: "Próximas", items: [] },
	];
	for (const item of items) {
		const due = item.dueAt ? new Date(item.dueAt) : null;
		if (due && isBefore(due, now)) groups[0].items.push(item);
		else if (due && isBefore(due, todayEnd)) groups[1].items.push(item);
		else groups[2].items.push(item);
	}
	return groups.filter((g) => g.items.length > 0);
}

function AgendaItem({ activity, showAssignee }: { activity: Activity; showAssignee: boolean }) {
	const notify = useNotify();
	const [updateActivity, { isLoading }] = useUpdateActivityMutation();
	const Icon = ACTIVITY_ICONS[activity.type];
	const isDone = !!activity.completedAt;
	const overdue = !isDone && activity.dueAt && new Date(activity.dueAt) < new Date();

	const toggle = async () => {
		try {
			await updateActivity({ id: activity.id, leadId: activity.leadId, completed: !isDone }).unwrap();
			notify.success(isDone ? "Atividade reaberta" : "Atividade concluída");
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<li className="flex items-center gap-3 px-3 py-2.5 border-b last:border-b-0">
			<Checkbox
				checked={isDone}
				onChange={toggle}
				disabled={isLoading}
				slotProps={{ input: { "aria-label": `Concluir ${activity.title ?? ""}` } }}
				data-cy={`agenda-action-complete-${activity.id}`}
			/>
			<Box className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" sx={{ bgcolor: "action.hover" }}>
				<Icon size={16} strokeWidth={1.5} />
			</Box>
			<div className="flex-1 min-w-0">
				<Typography
					variant="body2"
					fontWeight={600}
					noWrap
					sx={{ textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.6 : 1 }}
				>
					{activity.title}
				</Typography>
				<Typography variant="caption" color="text.secondary" component="div" noWrap>
					<Link to={`/leads/${activity.lead.id}`} className="hover:underline font-medium">
						{activity.lead.companyName ?? activity.lead.name}
					</Link>
					{activity.lead.companyName ? ` · ${activity.lead.name}` : ""}
				</Typography>
			</div>
			<div className="hidden md:block">
				<StageChip stage={activity.lead.stage} status={activity.lead.status} />
			</div>
			{activity.meetingUrl && !isDone && (
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
				className="w-28 text-right tabular-nums shrink-0"
			>
				{isDone
					? `Feita ${formatDateTime(activity.completedAt)}`
					: activity.dueAt
						? formatRelativeDay(activity.dueAt)
						: "Sem prazo"}
			</Typography>
			{showAssignee && <UserAvatar user={activity.assignee} size={24} />}
		</li>
	);
}

export function AgendaPage() {
	const [scope, setScope] = useState<"mine" | "team">("mine");
	const [status, setStatus] = useState<"open" | "done">("open");
	const [types, setTypes] = useState("TASK,MEETING");
	const [userId, setUserId] = useState("");
	const { data: users } = useGetUsersQuery();
	const { data, isLoading } = useGetAgendaQuery({
		scope,
		status,
		types,
		userId: scope === "team" ? userId || undefined : undefined,
	});
	const items = data?.data ?? [];
	const groups =
		status === "open" ? groupActivities(items) : [{ key: "done", title: "Concluídas recentemente", items }];

	return (
		<PageSimple
			header={
				<div className="space-y-3">
					<PageHeader>
						<PageTitle
							title="Agenda"
							icon={<CalendarClock strokeWidth={1.5} size={16} />}
							subInfo="Tarefas e reuniões com prazo"
						/>
						<PageActions>
							<ToggleButtonGroup
								exclusive
								size="small"
								value={scope}
								onChange={(_, v) => v && setScope(v)}
								sx={{ "& .MuiToggleButton-root": { height: 36, px: 1.75, textTransform: "none", fontWeight: 600 } }}
							>
								<ToggleButton value="mine" data-cy="agenda-scope-mine">
									Minha agenda
								</ToggleButton>
								<ToggleButton value="team" data-cy="agenda-scope-team">
									Equipe
								</ToggleButton>
							</ToggleButtonGroup>
							{scope === "team" && (
								<TextField
									select
									size="small"
									value={userId}
									onChange={(e) => setUserId(e.target.value)}
									sx={{ width: 170 }}
									fullWidth={false}
									slotProps={{ select: { displayEmpty: true } }}
									aria-label="Pessoa"
								>
									<MenuItem value="">Todas as pessoas</MenuItem>
									{(users?.data ?? []).map((u) => (
										<MenuItem key={u.id} value={u.id}>
											{u.name}
										</MenuItem>
									))}
								</TextField>
							)}
							<TextField
								select
								size="small"
								value={types}
								onChange={(e) => setTypes(e.target.value)}
								sx={{ width: 170 }}
								fullWidth={false}
								aria-label="Tipo"
							>
								<MenuItem value="TASK,MEETING">Tarefas e reuniões</MenuItem>
								<MenuItem value="TASK">Só tarefas</MenuItem>
								<MenuItem value="MEETING">Só reuniões</MenuItem>
							</TextField>
						</PageActions>
					</PageHeader>
					<Tabs value={status} onChange={(_, v) => setStatus(v)}>
						<Tab value="open" label="Em aberto" />
						<Tab value="done" label="Concluídas" />
					</Tabs>
				</div>
			}
			content={
				isLoading ? (
					<LoadingContent />
				) : items.length === 0 ? (
					<EmptyState
						icon={<CircleCheckBig size={40} strokeWidth={1.5} />}
						title={status === "open" ? "Tudo em dia" : "Nada concluído ainda"}
						description={
							status === "open"
								? "Nenhuma tarefa ou reunião em aberto. Crie próximos passos pela página do lead."
								: undefined
						}
					/>
				) : (
					<div className="space-y-4">
						{groups.map((group) => (
							<section key={group.key} className="space-y-2">
								<Typography
									variant="subtitle2"
									className="font-bold flex items-center gap-2"
									sx={{ color: group.tone }}
								>
									{group.title}
									<Box
										component="span"
										className="px-1.5 rounded text-xs tabular-nums"
										sx={{ bgcolor: "action.selected", color: "text.primary" }}
									>
										{group.items.length}
									</Box>
								</Typography>
								<Paper className="rounded-xl overflow-hidden" sx={{ border: 1, borderColor: "divider" }}>
									<ul>
										{group.items.map((activity) => (
											<AgendaItem key={activity.id} activity={activity} showAssignee={scope === "team"} />
										))}
									</ul>
								</Paper>
							</section>
						))}
					</div>
				)
			}
		/>
	);
}
