import { LoadingContent } from "@/components/feedback/LoadingContent";
import { KanbanBoard } from "@/features/pipeline/components/KanbanBoard";
import { DEFAULT_PIPELINE_FILTERS, PipelineFilters } from "@/features/pipeline/components/PipelineFilters";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useGetLeadsQuery } from "@/store/api/hooks";
import { formatCurrency } from "@/utils/formatters";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { Rows3 } from "lucide-react";
import { useDeferredValue, useMemo } from "react";
import { Link } from "react-router";

export function PipelinePage() {
	const [filters, setFilters] = usePersistentState("pipelineFilters.v2", DEFAULT_PIPELINE_FILTERS);
	const search = useDeferredValue(filters.search.trim().toLowerCase());
	const { data, isLoading } = useGetLeadsQuery(
		{
			status: "OPEN",
			take: 1000,
			mine: filters.scope === "mine",
			ownerId: filters.ownerId || undefined,
			channel: filters.channel || undefined,
			temperature: filters.temperature || undefined,
			orderByColumn: "createdAt",
			orderByAsc: false,
		},
		{ pollingInterval: 60_000 },
	);

	const leads = useMemo(() => {
		const all = data?.data ?? [];
		if (!search) return all;
		return all.filter((l) => [l.name, l.companyName, l.email].some((v) => v?.toLowerCase().includes(search)));
	}, [data, search]);
	const total = leads.reduce((acc, l) => acc + (l.estimatedValue ?? 0), 0);

	return (
		<div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen px-4 lg:px-5 pt-4 pb-3 gap-3">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<div className="mr-2">
					<Typography component="h1" className="text-xl font-bold leading-tight">
						Pipeline
					</Typography>
					<Typography variant="caption" color="text.secondary" className="tabular-nums">
						{leads.length} em aberto · {formatCurrency(total)}/mês
					</Typography>
				</div>
				<PipelineFilters value={filters} onChange={setFilters} />
				<div className="flex gap-2 ml-auto">
					<Tooltip title="Ver em lista">
						<IconButton
							component={Link}
							to="/leads"
							aria-label="Ver em lista"
							sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper" }}
						>
							<Rows3 size={18} strokeWidth={1.75} />
						</IconButton>
					</Tooltip>
				</div>
			</div>
			<div className="flex-1 min-h-0 overflow-x-auto scrollbar-none">
				{isLoading ? <LoadingContent /> : <KanbanBoard leads={leads} />}
			</div>
		</div>
	);
}
