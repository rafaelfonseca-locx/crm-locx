import { PageActions, PageHeader, PageSimple, PageTitle } from "@/components/layout/Page";
import { EmptyState } from "@/components/ui/EmptyState";
import { StageChip } from "@/components/ui/StageChip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ChannelIcon } from "@/features/leads/components/ChannelIcon";
import { NextActivityLabel } from "@/features/leads/components/NextActivityLabel";
import { useLeadDialogs } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { CHANNEL_META, STAGE_META, STAGE_ORDER } from "@/features/leads/constants";
import { usePersistentState } from "@/hooks/usePersistentState";
import type { Lead, LeadChannel, LeadStage, LeadStatus } from "@/store/api/@types/lead.types";
import { useGetLeadsQuery, useGetUsersQuery } from "@/store/api/hooks";
import { formatCurrency, formatShortDate } from "@/utils/formatters";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { Eye, KanbanSquare, Plus, Rows3, Search } from "lucide-react";
import {
	type MRT_ColumnDef,
	type MRT_PaginationState,
	type MRT_SortingState,
	MaterialReactTable,
	useMaterialReactTable,
} from "material-react-table";
import { MRT_Localization_PT_BR } from "material-react-table/locales/pt-BR";
import { useDeferredValue, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

type ListFilters = {
	status: LeadStatus | "ALL";
	stage: LeadStage | "";
	ownerId: string;
	scope: "all" | "mine";
	channel: LeadChannel | "";
};

export function LeadsListingPage() {
	const navigate = useNavigate();
	const { openCreateLead } = useLeadDialogs();
	const { data: users } = useGetUsersQuery();
	const [filters, setFilters] = usePersistentState<ListFilters>("leadListFilters", {
		status: "OPEN",
		stage: "",
		ownerId: "",
		scope: "all",
		channel: "",
	});
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search.trim());
	const [pagination, setPagination] = useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 25 });
	const [sorting, setSorting] = useState<MRT_SortingState>([{ id: "createdAt", desc: true }]);

	const { data, isLoading, isFetching } = useGetLeadsQuery({
		status: filters.status,
		stage: filters.stage || undefined,
		ownerId: filters.ownerId || undefined,
		channel: filters.channel || undefined,
		mine: filters.scope === "mine",
		search: deferredSearch || undefined,
		skip: pagination.pageIndex * pagination.pageSize,
		take: pagination.pageSize,
		orderByColumn: sorting[0]?.id ?? "createdAt",
		orderByAsc: sorting[0] ? !sorting[0].desc : false,
	});

	const columns = useMemo<MRT_ColumnDef<Lead>[]>(
		() => [
			{
				accessorKey: "id",
				header: "Id",
				size: 80,
				Cell: ({ row }) => <span className="opacity-60 tabular-nums">#{row.original.id}</span>,
			},
			{
				accessorKey: "companyName",
				header: "Empresa e contato",
				size: 280,
				Cell: ({ row }) => (
					<div className="min-w-0">
						<div className="font-semibold truncate">{row.original.companyName ?? "N/A"}</div>
						<div className="text-sm opacity-60 truncate">
							{[row.original.name, row.original.email].filter(Boolean).join(" · ")}
						</div>
					</div>
				),
			},
			{
				id: "stage",
				header: "Etapa",
				enableSorting: false,
				size: 150,
				Cell: ({ row }) => <StageChip stage={row.original.stage} status={row.original.status} />,
			},
			{
				id: "owner",
				header: "Responsável",
				enableSorting: false,
				size: 180,
				Cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<UserAvatar user={row.original.owner} size={24} tooltip={false} />
						<span className="truncate">{row.original.owner?.name ?? "Sem responsável"}</span>
					</div>
				),
			},
			{
				accessorKey: "estimatedValue",
				header: "Valor/mês",
				size: 120,
				Cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.estimatedValue)}</span>,
			},
			{
				id: "next",
				header: "Próximo passo",
				enableSorting: false,
				size: 170,
				Cell: ({ row }) =>
					row.original.status === "OPEN" ? <NextActivityLabel activity={row.original.nextActivity} /> : "N/A",
			},
			{
				id: "channel",
				header: "Canal",
				enableSorting: false,
				size: 140,
				Cell: ({ row }) => (
					<span className="inline-flex items-center gap-1.5">
						<ChannelIcon channel={row.original.channel} />
						{CHANNEL_META[row.original.channel].short}
					</span>
				),
			},
			{
				accessorKey: "createdAt",
				header: "Criado em",
				size: 120,
				Cell: ({ row }) => formatShortDate(row.original.createdAt),
			},
		],
		[],
	);

	const table = useMaterialReactTable({
		columns,
		data: data?.data ?? [],
		localization: MRT_Localization_PT_BR,
		manualPagination: true,
		manualSorting: true,
		rowCount: data?.count ?? 0,
		state: { pagination, sorting, isLoading, showProgressBars: isFetching },
		onPaginationChange: setPagination,
		onSortingChange: setSorting,
		enableTopToolbar: false,
		enableColumnActions: false,
		enableColumnFilters: false,
		enableGlobalFilter: false,
		enableDensityToggle: false,
		enableFullScreenToggle: false,
		enableStickyHeader: true,
		enableRowActions: true,
		positionActionsColumn: "last",
		layoutMode: "grid",
		muiPaginationProps: { rowsPerPageOptions: [10, 25, 50, 100] },
		muiTablePaperProps: {
			elevation: 0,
			sx: { borderRadius: 3, border: 1, borderColor: "divider", overflow: "hidden" },
		},
		muiTableContainerProps: { sx: { maxHeight: "calc(100vh - 300px)" } },
		muiTableHeadCellProps: { sx: { fontWeight: 600, fontSize: 12 } },
		muiTableBodyRowProps: ({ row }) => ({
			onClick: () => navigate(`/leads/${row.original.id}`),
			sx: { cursor: "pointer" },
		}),
		renderRowActionMenuItems: ({ row, closeMenu }) => [
			<MenuItem
				key="view"
				dense
				className="flex items-center gap-3"
				onClick={() => {
					closeMenu();
					navigate(`/leads/${row.original.id}`);
				}}
				data-cy={`lead-action-view-${row.original.id}`}
			>
				<ListItemIcon className="min-w-0">
					<Eye size={18} strokeWidth={1.5} />
				</ListItemIcon>
				<ListItemText primary="Abrir" />
			</MenuItem>,
		],
		renderEmptyRowsFallback: () => (
			<EmptyState title="Nenhum registro encontrado" description="Ajuste os filtros ou a busca." />
		),
	});

	const update = (patch: Partial<ListFilters>) => {
		setFilters({ ...filters, ...patch });
		setPagination((p) => ({ ...p, pageIndex: 0 }));
	};

	return (
		<PageSimple
			header={
				<div className="space-y-4">
					<PageHeader>
						<PageTitle
							title="Leads"
							icon={<Rows3 strokeWidth={1.5} size={16} />}
							subInfo={`${data?.count ?? 0} registros`}
						/>
						<PageActions>
							<Button
								component={Link}
								to="/pipeline"
								variant="outlined"
								color="inherit"
								startIcon={<KanbanSquare size={16} strokeWidth={1.5} />}
							>
								Ver pipeline
							</Button>
							<Button startIcon={<Plus size={16} strokeWidth={2} />} onClick={openCreateLead}>
								Novo lead
							</Button>
						</PageActions>
					</PageHeader>
					<div className="flex flex-wrap gap-2 items-center">
						<ToggleButtonGroup
							exclusive
							size="small"
							value={filters.scope}
							onChange={(_, v) => v && update({ scope: v })}
							sx={{ "& .MuiToggleButton-root": { height: 36, px: 1.75, textTransform: "none", fontWeight: 600 } }}
						>
							<ToggleButton value="all">Todos</ToggleButton>
							<ToggleButton value="mine">Meus leads</ToggleButton>
						</ToggleButtonGroup>
						<TextField
							select
							size="small"
							label="Status"
							value={filters.status}
							onChange={(e) => update({ status: e.target.value as ListFilters["status"] })}
							sx={{ width: 150 }}
							fullWidth={false}
						>
							<MenuItem value="OPEN">Em aberto</MenuItem>
							<MenuItem value="WON">Ganhos</MenuItem>
							<MenuItem value="LOST">Perdidos</MenuItem>
							<MenuItem value="ALL">Todos</MenuItem>
						</TextField>
						<TextField
							select
							size="small"
							label="Canal"
							value={filters.channel}
							onChange={(e) => update({ channel: e.target.value as LeadChannel | "" })}
							sx={{ width: 160 }}
							fullWidth={false}
						>
							<MenuItem value="">Todos</MenuItem>
							{Object.entries(CHANNEL_META).map(([k, m]) => (
								<MenuItem key={k} value={k}>
									{m.short}
								</MenuItem>
							))}
						</TextField>
						<TextField
							select
							size="small"
							label="Etapa"
							value={filters.stage}
							onChange={(e) => update({ stage: e.target.value as LeadStage | "" })}
							sx={{ width: 170 }}
							fullWidth={false}
						>
							<MenuItem value="">Todas</MenuItem>
							{STAGE_ORDER.map((s) => (
								<MenuItem key={s} value={s}>
									{STAGE_META[s].label}
								</MenuItem>
							))}
						</TextField>
						<TextField
							select
							size="small"
							label="Responsável"
							value={filters.ownerId}
							onChange={(e) => update({ ownerId: e.target.value })}
							sx={{ width: 180 }}
							fullWidth={false}
							disabled={filters.scope === "mine"}
						>
							<MenuItem value="">Todos</MenuItem>
							<MenuItem value="none">Sem responsável</MenuItem>
							{(users?.data ?? []).map((u) => (
								<MenuItem key={u.id} value={u.id}>
									{u.name}
								</MenuItem>
							))}
						</TextField>
						<TextField
							size="small"
							placeholder="Buscar por nome, empresa, e-mail ou telefone"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPagination((p) => ({ ...p, pageIndex: 0 }));
							}}
							sx={{ width: 320 }}
							fullWidth={false}
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											<Search size={16} strokeWidth={1.5} />
										</InputAdornment>
									),
								},
							}}
						/>
					</div>
				</div>
			}
			content={<MaterialReactTable table={table} />}
		/>
	);
}
