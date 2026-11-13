import { useNotify } from "@/hooks/useNotify";
import type { Activity } from "@/store/api/@types/activity.types";
import { useSyncTranscriptMutation } from "@/store/api/hooks";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { FileText, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

/** Resumo, transcrição e notas de uma reunião, dentro da linha do tempo. */
export function MeetingInsights({ activity }: { activity: Activity }) {
	const notify = useNotify();
	const [showTranscript, setShowTranscript] = useState(false);
	const [syncTranscript, { isLoading }] = useSyncTranscriptMutation();
	const docUrl = (activity.metadata as { docUrl?: string } | null)?.docUrl;
	const isPast = activity.dueAt ? new Date(activity.dueAt).getTime() < Date.now() : false;
	const canFetch = !!activity.meetingCode && !activity.transcript && isPast;

	if (!activity.aiSummary && !activity.transcript && !docUrl && !canFetch) return null;

	const handleSync = async () => {
		try {
			const result = await syncTranscript({ activityId: activity.id, leadId: activity.leadId }).unwrap();
			notify.success(result.data.message);
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<div className="mt-2 space-y-2">
			{activity.aiSummary && (
				<Box
					className="rounded-lg border px-3 py-2.5"
					sx={{ bgcolor: "rgba(255,204,0,0.08)", borderColor: "rgba(242,183,5,0.35)" }}
				>
					<Typography variant="caption" fontWeight={700} className="flex items-center gap-1.5 pb-1">
						<Sparkles size={13} strokeWidth={1.75} /> Resumo da reunião
					</Typography>
					<Typography variant="body2" component="div" className="whitespace-pre-wrap leading-relaxed">
						{activity.aiSummary}
					</Typography>
				</Box>
			)}
			<div className="flex flex-wrap items-center gap-3">
				{activity.transcript && (
					<Button
						size="small"
						variant="text"
						color="inherit"
						startIcon={<FileText size={14} strokeWidth={1.75} />}
						onClick={() => setShowTranscript((v) => !v)}
					>
						{showTranscript ? "Ocultar transcrição" : "Ver transcrição"}
					</Button>
				)}
				{docUrl && (
					<Link
						href={docUrl}
						target="_blank"
						rel="noreferrer"
						variant="caption"
						className="inline-flex items-center gap-1"
					>
						<FileText size={13} strokeWidth={1.5} /> Notas da reunião (Google Docs)
					</Link>
				)}
				{canFetch && (
					<Button
						size="small"
						variant="outlined"
						color="inherit"
						startIcon={<RefreshCw size={14} strokeWidth={1.75} />}
						onClick={handleSync}
						loading={isLoading}
						data-cy={`transcript-sync-${activity.id}`}
					>
						Buscar transcrição
					</Button>
				)}
			</div>
			<Collapse in={showTranscript} unmountOnExit>
				<Box
					className="rounded-lg border px-3 py-2 max-h-80 overflow-y-auto text-[12px] whitespace-pre-wrap leading-relaxed"
					sx={{ bgcolor: "surface.subtle" }}
				>
					{activity.transcript}
				</Box>
			</Collapse>
		</div>
	);
}
