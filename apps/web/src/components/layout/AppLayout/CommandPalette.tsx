import { StageChip } from "@/components/ui/StageChip";
import { useLeadDialogs } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { useGetLeadsQuery } from "@/store/api/hooks";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import InputBase from "@mui/material/InputBase";
import Typography from "@mui/material/Typography";
import { CornerDownLeft, type LucideIcon, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { NAVIGATION } from "./navigation";

function useDebounced<T>(value: T, delay = 200) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

type Item = {
	key: string;
	group: string;
	label: string;
	hint?: string;
	icon?: LucideIcon;
	right?: React.ReactNode;
	run: () => void;
};

/** Busca global e atalhos (Ctrl/⌘ + K): leads por nome, empresa, e-mail, telefone ou #id, e navegação. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
	const navigate = useNavigate();
	const { openCreateLead } = useLeadDialogs();
	const [query, setQuery] = useState("");
	const [highlight, setHighlight] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);
	const search = useDebounced(query.trim().replace(/^#/, ""));
	const { data, isFetching } = useGetLeadsQuery(
		{ search, status: "ALL", kind: "ALL", take: 8 },
		{ skip: !open || search.length < 2 },
	);

	useEffect(() => {
		if (open) {
			setQuery("");
			setHighlight(0);
		}
	}, [open]);

	const items = useMemo<Item[]>(() => {
		const close = (fn: () => void) => () => {
			onClose();
			fn();
		};
		const q = query.trim().toLowerCase();
		const leads: Item[] =
			search.length >= 2
				? (data?.data ?? []).map((lead) => ({
						key: `lead-${lead.id}`,
						group: "Leads",
						label: lead.companyName ?? lead.name,
						hint: [lead.companyName ? lead.name : null, lead.email, `#${lead.id}`].filter(Boolean).join(" · "),
						right:
							lead.kind === "PARTNER" ? (
								<Chip size="small" variant="outlined" color="info" label="Parceiro" />
							) : (
								<StageChip stage={lead.stage} status={lead.status} />
							),
						run: close(() => navigate(`/leads/${lead.id}`)),
					}))
				: [];
		const actions: Item[] = [
			{ key: "new-lead", group: "Ações", label: "Novo lead", icon: Plus, run: close(openCreateLead) },
			...NAVIGATION.flatMap((section) =>
				section.items.map((nav) => ({
					key: `nav-${nav.id}`,
					group: "Ir para",
					label: nav.label,
					icon: nav.icon,
					run: close(() => navigate(nav.to)),
				})),
			),
		].filter((a) => !q || a.label.toLowerCase().includes(q));
		return [...leads, ...actions];
	}, [data, search, query, navigate, onClose, openCreateLead]);

	useEffect(() => {
		listRef.current?.querySelector(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
	}, [highlight]);

	let lastGroup = "";

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth="sm"
			slotProps={{ paper: { sx: { alignSelf: "flex-start", mt: "12vh" } } }}
		>
			<div className="flex items-center gap-3 px-4 h-14 border-b">
				<Search size={18} strokeWidth={1.75} className="opacity-50 shrink-0" />
				<InputBase
					autoFocus
					fullWidth
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setHighlight(0);
					}}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown") {
							e.preventDefault();
							setHighlight((h) => Math.min(h + 1, items.length - 1));
						}
						if (e.key === "ArrowUp") {
							e.preventDefault();
							setHighlight((h) => Math.max(h - 1, 0));
						}
						if (e.key === "Enter") items[highlight]?.run();
					}}
					placeholder="Buscar lead, empresa, e-mail, telefone ou #id"
					inputProps={{ "aria-label": "Buscar", "data-cy": "global-search" }}
					sx={{ fontSize: 15 }}
				/>
				<Typography variant="caption" color="text.disabled" className="border rounded px-1.5 py-0.5 shrink-0">
					Esc
				</Typography>
			</div>
			{/* biome-ignore lint/a11y/useSemanticElements: listbox de comandos, controlado pelo teclado no campo de busca */}
			<div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2" role="listbox" tabIndex={-1}>
				{search.length >= 2 && !isFetching && (data?.data ?? []).length === 0 && (
					<Typography variant="body2" color="text.secondary" className="px-4 py-3">
						Nenhum lead encontrado para “{query}”
					</Typography>
				)}
				{items.map((item, index) => {
					const showGroup = item.group !== lastGroup;
					lastGroup = item.group;
					const Icon = item.icon;
					return (
						<div key={item.key}>
							{showGroup && (
								<Typography variant="caption" color="text.secondary" className="block px-4 pt-2 pb-1 font-semibold">
									{item.group}
								</Typography>
							)}
							{/* biome-ignore lint/a11y/useSemanticElements: lista de comandos navegada pelas setas a partir do campo de busca */}
							{/* biome-ignore lint/a11y/useFocusableInteractive: o foco fica no campo de busca (padrão combobox) */}
							<Box
								role="option"
								aria-selected={index === highlight}
								data-index={index}
								onMouseEnter={() => setHighlight(index)}
								onClick={item.run}
								className="mx-2 flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer"
								sx={{ bgcolor: index === highlight ? "action.selected" : "transparent" }}
							>
								{Icon && <Icon size={16} strokeWidth={1.75} className="opacity-70 shrink-0" />}
								<div className="min-w-0 flex-1">
									<Typography variant="body2" fontWeight={600} noWrap>
										{item.label}
									</Typography>
									{item.hint && (
										<Typography variant="caption" color="text.secondary" noWrap component="div">
											{item.hint}
										</Typography>
									)}
								</div>
								{item.right}
								{index === highlight && <CornerDownLeft size={14} strokeWidth={1.75} className="opacity-40 shrink-0" />}
							</Box>
						</div>
					);
				})}
			</div>
		</Dialog>
	);
}
