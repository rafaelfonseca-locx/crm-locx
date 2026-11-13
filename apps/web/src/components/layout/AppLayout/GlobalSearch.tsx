import { StageChip } from "@/components/ui/StageChip";
import { useGetLeadsQuery } from "@/store/api/hooks";
import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Typography from "@mui/material/Typography";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

function useDebounced<T>(value: T, delay = 250) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

/** Busca rápida de leads por nome, empresa, e-mail, telefone ou #id. Atalho: Ctrl/⌘ + K. */
export function GlobalSearch() {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState(0);
	const anchorRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const search = useDebounced(query.trim().replace(/^#/, ""));
	const { data, isFetching } = useGetLeadsQuery({ search, status: "ALL", take: 8 }, { skip: search.length < 2 });
	const results = search.length >= 2 ? (data?.data ?? []) : [];

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				inputRef.current?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const goTo = (id: number) => {
		navigate(`/leads/${id}`);
		setOpen(false);
		setQuery("");
		inputRef.current?.blur();
	};

	return (
		<ClickAwayListener onClickAway={() => setOpen(false)}>
			<div className="flex-1 max-w-xl">
				<Box
					ref={anchorRef}
					className="flex items-center gap-2 h-10 px-3 rounded-lg border"
					sx={{ bgcolor: "background.default", "&:focus-within": { borderColor: "primary.main" } }}
				>
					<Search size={16} strokeWidth={1.5} className="opacity-60 shrink-0" />
					<InputBase
						inputRef={inputRef}
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setOpen(true);
							setHighlight(0);
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={(e) => {
							if (e.key === "ArrowDown") setHighlight((h) => Math.min(h + 1, results.length - 1));
							if (e.key === "ArrowUp") setHighlight((h) => Math.max(h - 1, 0));
							if (e.key === "Enter" && results[highlight]) goTo(results[highlight].id);
							if (e.key === "Escape") setOpen(false);
						}}
						placeholder="Buscar lead, empresa, e-mail ou #id"
						className="flex-1 text-[13px]"
						inputProps={{ "aria-label": "Buscar leads", "data-cy": "global-search" }}
					/>
					<Typography
						variant="caption"
						color="text.disabled"
						className="hidden md:block border rounded px-1.5 py-0.5 font-medium"
					>
						Ctrl K
					</Typography>
				</Box>
				<Popper
					open={open && search.length >= 2}
					anchorEl={anchorRef.current}
					placement="bottom-start"
					style={{ zIndex: 1300, width: anchorRef.current?.offsetWidth }}
				>
					<Paper className="mt-1 overflow-hidden" sx={{ border: 1, borderColor: "divider", boxShadow: 6 }}>
						{results.length === 0 ? (
							<Typography variant="body2" color="text.secondary" className="p-4">
								{isFetching ? "Buscando..." : "Nenhum lead encontrado"}
							</Typography>
						) : (
							<List dense disablePadding>
								{results.map((lead, index) => (
									<ListItemButton
										key={lead.id}
										selected={index === highlight}
										onClick={() => goTo(lead.id)}
										className="flex items-center gap-3 !rounded-none"
									>
										<div className="min-w-0 flex-1">
											<Typography variant="body2" fontWeight={600} noWrap>
												{lead.name} <span className="opacity-50 font-normal">#{lead.id}</span>
											</Typography>
											<Typography variant="caption" color="text.secondary" noWrap component="div">
												{[lead.companyName, lead.email].filter(Boolean).join(" · ")}
											</Typography>
										</div>
										<StageChip stage={lead.stage} status={lead.status} />
									</ListItemButton>
								))}
							</List>
						)}
					</Paper>
				</Popper>
			</div>
		</ClickAwayListener>
	);
}
