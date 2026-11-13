import { LoadingContent } from "@/components/feedback/LoadingContent";
import { StageChip } from "@/components/ui/StageChip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useGetLeadHistoryQuery } from "@/store/api/hooks";
import { formatDateTime } from "@/utils/formatters";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { differenceInHours } from "date-fns";

function durationLabel(hours: number) {
	if (hours < 24) return `${Math.max(1, hours)}h`;
	const days = Math.round(hours / 24);
	return `${days} ${days === 1 ? "dia" : "dias"}`;
}

/** Linha do tempo de etapas com o tempo de permanência em cada uma. */
export function StageHistory({ leadId }: { leadId: number }) {
	const { data, isLoading } = useGetLeadHistoryQuery(leadId);
	if (isLoading) return <LoadingContent />;
	const events = data?.data ?? [];

	return (
		<Paper className="rounded-xl p-4" sx={{ border: 1, borderColor: "divider" }}>
			<ol className="space-y-0">
				{events.map((event, index) => {
					const next = events[index + 1];
					const hours = differenceInHours(next ? new Date(next.createdAt) : new Date(), new Date(event.createdAt));
					const isLast = index === events.length - 1;
					return (
						<li key={event.id} className="flex gap-3 items-start py-2.5 border-b last:border-b-0">
							<div className="w-32 shrink-0">
								<StageChip stage={event.toStage} status={event.toStatus} />
							</div>
							<div className="flex-1 min-w-0">
								<Typography variant="body2" fontWeight={500}>
									{event.fromStatus && event.fromStatus !== "OPEN" && event.toStatus === "OPEN"
										? "Reaberto"
										: event.fromStage
											? "Mudou de etapa"
											: "Entrou no funil"}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{formatDateTime(event.createdAt)}
								</Typography>
							</div>
							<Typography variant="caption" color="text.secondary" className="shrink-0 pt-0.5 tabular-nums">
								{isLast && event.toStatus === "OPEN"
									? `há ${durationLabel(hours)}`
									: event.toStatus === "OPEN"
										? durationLabel(hours)
										: ""}
							</Typography>
							{event.user ? <UserAvatar user={event.user} size={22} /> : <span className="w-[22px]" />}
						</li>
					);
				})}
			</ol>
		</Paper>
	);
}
