import { useIsDarkMode } from "@/hooks/useStageColor";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

/** Cor única para gráficos de uma série: marrom LocX no claro, amarelo LocX no escuro. */
export function useSeriesColor() {
	return useIsDarkMode() ? "#FFCC00" : "#6B4F3E";
}

export function Panel({
	title,
	subtitle,
	action,
	children,
	className,
}: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
	return (
		<Paper
			className={`rounded-xl p-4 flex flex-col gap-3 min-w-0 ${className ?? ""}`}
			sx={{ border: 1, borderColor: "divider" }}
		>
			<div className="flex items-start justify-between gap-2">
				<div>
					<Typography variant="subtitle2" className="font-bold">
						{title}
					</Typography>
					{subtitle && (
						<Typography variant="caption" color="text.secondary">
							{subtitle}
						</Typography>
					)}
				</div>
				{action}
			</div>
			{children}
		</Paper>
	);
}

type KpiTileProps = { label: string; value: string; hint?: string; delta?: number | null; icon: ReactNode };

/** Indicador único: o número é o protagonista, sem gráfico. */
export function KpiTile({ label, value, hint, delta, icon }: KpiTileProps) {
	return (
		<Paper className="rounded-xl p-4 flex flex-col gap-2 min-w-0" sx={{ border: 1, borderColor: "divider" }}>
			<div className="flex items-center justify-between gap-2">
				<Typography variant="caption" color="text.secondary" fontWeight={500} noWrap>
					{label}
				</Typography>
				<Box className="opacity-60">{icon}</Box>
			</div>
			<Typography className="text-2xl font-bold tabular-nums tracking-tight leading-none">{value}</Typography>
			<div className="flex items-center gap-1.5 min-h-4">
				{delta !== undefined && delta !== null && (
					<Typography
						variant="caption"
						fontWeight={600}
						className="flex items-center gap-0.5"
						color={delta >= 0 ? "success.main" : "error.main"}
					>
						{delta >= 0 ? <TrendingUp size={13} strokeWidth={2} /> : <TrendingDown size={13} strokeWidth={2} />}
						{delta >= 0 ? "+" : ""}
						{Math.round(delta * 100)}%
					</Typography>
				)}
				{hint && (
					<Typography variant="caption" color="text.secondary" noWrap>
						{hint}
					</Typography>
				)}
			</div>
		</Paper>
	);
}

type BarRow = { key: string; label: ReactNode; value: number; display: string; tooltip: string; aside?: ReactNode };

/** Barras horizontais de uma série, com rótulo direto e tooltip por barra. */
export function HorizontalBars({ rows, labelWidth = 120 }: { rows: BarRow[]; labelWidth?: number }) {
	const color = useSeriesColor();
	const max = Math.max(1, ...rows.map((r) => r.value));
	return (
		<ul className="space-y-2">
			{rows.map((row) => (
				<li key={row.key} className="flex items-center gap-3">
					<Typography variant="body2" className="shrink-0 truncate" sx={{ width: labelWidth }}>
						{row.label}
					</Typography>
					<Tooltip title={row.tooltip} placement="top" followCursor>
						<div className="flex-1 flex items-center gap-2 h-7 cursor-default min-w-0">
							<Box
								className="h-full"
								sx={{
									width: `${Math.max(row.value > 0 ? 2 : 0, (row.value / max) * 100)}%`,
									bgcolor: color,
									borderRadius: "0 4px 4px 0",
									transition: "width 300ms",
								}}
							/>
							<Typography variant="body2" fontWeight={600} className="tabular-nums shrink-0">
								{row.display}
							</Typography>
						</div>
					</Tooltip>
					{row.aside && <div className="shrink-0 w-14 text-right">{row.aside}</div>}
				</li>
			))}
		</ul>
	);
}
