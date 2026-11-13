import { CHANNEL_META, TEMPERATURE_META } from "@/features/leads/constants";
import type { LeadChannel, LeadTemperature } from "@/store/api/@types/lead.types";
import { useGetUsersQuery } from "@/store/api/hooks";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { Search } from "lucide-react";

export type PipelineFilterValues = {
	scope: "all" | "mine";
	ownerId: string;
	channel: LeadChannel | "";
	temperature: LeadTemperature | "";
	search: string;
};

export const DEFAULT_PIPELINE_FILTERS: PipelineFilterValues = {
	scope: "all",
	ownerId: "",
	channel: "",
	temperature: "",
	search: "",
};

type Props = { value: PipelineFilterValues; onChange: (value: PipelineFilterValues) => void };

const selectSx = { "& .MuiInputBase-root": { height: 34 } };

/** Filtros compactos em uma linha. "Meus leads" = sou responsável ou participante. */
export function PipelineFilters({ value, onChange }: Props) {
	const { data: users } = useGetUsersQuery();
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
				sx={{ "& .MuiToggleButton-root": { px: 1.5, height: 34 } }}
			>
				<ToggleButton value="all" data-cy="filter-scope-all">
					Todos
				</ToggleButton>
				<Tooltip title="Leads em que você é o responsável ou foi adicionado ao processo">
					<ToggleButton value="mine" data-cy="filter-scope-mine">
						Meus leads
					</ToggleButton>
				</Tooltip>
			</ToggleButtonGroup>
			<TextField
				select
				size="small"
				value={value.ownerId}
				onChange={(e) => onChange({ ...value, ownerId: e.target.value, scope: e.target.value ? "all" : value.scope })}
				sx={{ width: 160, ...selectSx }}
				fullWidth={false}
				disabled={value.scope === "mine"}
				data-cy="filter-owner"
				slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Responsável" } }}
			>
				<MenuItem value="">Responsável</MenuItem>
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
				value={value.channel}
				onChange={(e) => set("channel", e.target.value as LeadChannel | "")}
				sx={{ width: 140, ...selectSx }}
				fullWidth={false}
				slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Canal de entrada" } }}
			>
				<MenuItem value="">Canal</MenuItem>
				{Object.entries(CHANNEL_META).map(([k, m]) => (
					<MenuItem key={k} value={k}>
						{m.short}
					</MenuItem>
				))}
			</TextField>
			<TextField
				select
				size="small"
				value={value.temperature}
				onChange={(e) => set("temperature", e.target.value as LeadTemperature | "")}
				sx={{ width: 140, ...selectSx }}
				fullWidth={false}
				slotProps={{ select: { displayEmpty: true }, htmlInput: { "aria-label": "Temperatura" } }}
			>
				<MenuItem value="">Temperatura</MenuItem>
				{Object.entries(TEMPERATURE_META).map(([k, m]) => (
					<MenuItem key={k} value={k}>
						{m.label}
					</MenuItem>
				))}
			</TextField>
			<TextField
				size="small"
				placeholder="Filtrar"
				value={value.search}
				onChange={(e) => set("search", e.target.value)}
				sx={{ width: 160, ...selectSx }}
				fullWidth={false}
				slotProps={{
					input: {
						startAdornment: (
							<InputAdornment position="start">
								<Search size={15} strokeWidth={1.75} />
							</InputAdornment>
						),
					},
				}}
			/>
		</div>
	);
}
