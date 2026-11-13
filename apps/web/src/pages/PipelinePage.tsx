import { LoadingContent } from "@/components/feedback/LoadingContent";
import { PageActions, PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { useLeadDialogs } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { KanbanBoard } from "@/features/pipeline/components/KanbanBoard";
import { DEFAULT_PIPELINE_FILTERS, PipelineFilters } from "@/features/pipeline/components/PipelineFilters";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useGetLeadsQuery } from "@/store/api/hooks";
import { formatCurrency } from "@/utils/formatters";
import Button from "@mui/material/Button";
import { KanbanSquare, Plus, Rows3 } from "lucide-react";
import { useDeferredValue, useMemo } from "react";
import { Link } from "react-router";

export function PipelinePage() {
	const { openCreateLead } = useLeadDialogs();
	const [filters, setFilters] = usePersistentState("pipelineFilters", DEFAULT_PIPELINE_FILTERS);
	const search = useDeferredValue(filters.search.trim().toLowerCase());
	const { data, isLoading } = useGetLeadsQuery(
		{
			status: "OPEN",
			take: 1000,
			mine: filters.scope === "mine",
			ownerId: filters.ownerId || undefined,
			source: filters.source || undefined,
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
		<PageSimple
			header={
				<div className="space-y-4">
					<PageHeader>
						<PageTitle
							title="Pipeline"
							icon={<KanbanSquare strokeWidth={1.5} size={16} />}
							subInfo={`${leads.length} leads em aberto · ${formatCurrency(total)}/mês estimado`}
						/>
						<PageActions>
							<Button
								component={Link}
								to="/leads"
								variant="outlined"
								color="inherit"
								startIcon={<Rows3 size={16} strokeWidth={1.5} />}
							>
								Ver em lista
							</Button>
							<Button startIcon={<Plus size={16} strokeWidth={2} />} onClick={openCreateLead}>
								Novo lead
							</Button>
						</PageActions>
					</PageHeader>
					<PipelineFilters value={filters} onChange={setFilters} />
				</div>
			}
			content={isLoading ? <LoadingContent /> : <KanbanBoard leads={leads} />}
		/>
	);
}
