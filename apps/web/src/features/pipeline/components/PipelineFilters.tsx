import { TEMPERATURE_META } from "@/features/leads/constants";
import type { LeadTemperature } from "@/store/api/@types/lead.types";
import { useGetLeadSourcesQuery, useGetUsersQuery } from "@/store/api/hooks";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { Search } from "lucide-react";

export type PipelineFilterValues = {
	scope: "all" | "mine";
	ownerId: string;
	source: string;
	temperature: LeadTemperature | "";
	search: string;
};

export const DEFAULT_PIPELINE_FILTERS: PipelineFilterValues = {
	scope: "all",
	ownerId: "",
	source: "",
	temperature: "",
	search: "",
};

type Props = { value: PipelineFilterValues; onChange: (value: PipelineFilterValues) => void };

/** Filtros em uma linha acima do quadro. "Meus leads" = sou responsável ou participante. */
export function PipelineFilters({ value, onChange }: Props) {
	const { data: users } = useGetUsersQuery();
	const { data: sources } = useGetLeadSourcesQuery();
	const set = <K extends keyof PipelineFilterValues>(key: K, v: PipelineFilterValues[K]) =>
		onChange({ ...value, [key]: v });

	return (
		<div className="flex flex-wrap items-center gap-2">
			<ToggleButtonGroup
				exclusive
				size="small"
				value={value.scope}
				onChange={(_, v) => v && onChange({ ...value, scope: v, ownerId: v === "mine" ? "" : value.ownerId })}
				aria-label="Escopo"
				sx={{ "& .MuiToggleButton-root": { px: 1.75, height: 36, textTransform: "none", fontWeight: 600 } }}
			>
				<ToggleButton value="all" data-cy="filter-scope-all">
					Todos
				</ToggleButton>
				<ToggleButton value="mine" data-cy="filter-scope-mine">
					Meus leads
				</ToggleButton>
			</ToggleButtonGroup>
			<TextField
				select
				size="small"
				label="Responsável"
				value={value.ownerId}
				onChange={(e) => onChange({ ...value, ownerId: e.target.value, scope: e.target.value ? "all" : value.scope })}
				sx={{ width: 180 }}
				fullWidth={false}
				disabled={value.scope === "mine"}
				data-cy="filter-owner"
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
				select
				size="small"
				label="Origem"
				value={value.source}
				onChange={(e) => set("source", e.target.value)}
				sx={{ width: 160 }}
				fullWidth={false}
			>
				<MenuItem value="">Todas</MenuItem>
				{(sources?.data ?? []).map((s) => (
					<MenuItem key={s.source} value={s.source}>
						{s.source}
					</MenuItem>
				))}
			</TextField>
			<TextField
				select
				size="small"
				label="Temperatura"
				value={value.temperature}
				onChange={(e) => set("temperature", e.target.value as LeadTemperature | "")}
				sx={{ width: 150 }}
				fullWidth={false}
			>
				<MenuItem value="">Todas</MenuItem>
				{Object.entries(TEMPERATURE_META).map(([k, m]) => (
					<MenuItem key={k} value={k}>
						{m.label}
					</MenuItem>
				))}
			</TextField>
			<TextField
				size="small"
				placeholder="Filtrar por nome ou empresa"
				value={value.search}
				onChange={(e) => set("search", e.target.value)}
				sx={{ width: 240 }}
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
	);
}
