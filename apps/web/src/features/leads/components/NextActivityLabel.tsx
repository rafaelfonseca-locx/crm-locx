import type { Lead } from "@/store/api/@types/lead.types";
import { formatRelativeDay } from "@/utils/formatters";
import Typography from "@mui/material/Typography";
import { AlarmClockOff, CalendarClock, CircleAlert, ListTodo } from "lucide-react";

/** Próxima tarefa/reunião do lead, com destaque para atrasos e ausência de próximo passo. */
export function NextActivityLabel({ activity }: { activity: Lead["nextActivity"] }) {
	if (!activity?.dueAt) {
		return (
			<Typography
				variant="caption"
				color="warning.main"
				className="flex items-center gap-1 min-w-0 font-medium"
				title="Sem próximo passo"
			>
				<AlarmClockOff size={13} strokeWidth={1.5} className="shrink-0" />
				<span className="truncate">Sem próximo passo</span>
			</Typography>
		);
	}
	const overdue = new Date(activity.dueAt) < new Date();
	const Icon = overdue ? CircleAlert : activity.type === "MEETING" ? CalendarClock : ListTodo;
	return (
		<Typography
			variant="caption"
			color={overdue ? "error.main" : "text.secondary"}
			className="flex items-center gap-1 min-w-0 font-medium"
			title={activity.title ?? undefined}
		>
			<Icon size={13} strokeWidth={1.5} className="shrink-0" />
			<span className="truncate">
				{overdue ? "Atrasada · " : ""}
				{formatRelativeDay(activity.dueAt)}
			</span>
		</Typography>
	);
}
