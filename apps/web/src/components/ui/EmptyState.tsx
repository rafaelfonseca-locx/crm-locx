import Typography from "@mui/material/Typography";
import { Telescope } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
	title?: string;
	description?: ReactNode;
	icon?: ReactNode;
	action?: ReactNode;
	compact?: boolean;
};

export function EmptyState({
	title = "Nenhum registro encontrado",
	description,
	icon,
	action,
	compact,
}: EmptyStateProps) {
	return (
		<div className={`flex flex-col items-center justify-center text-center gap-2 ${compact ? "py-6" : "py-14"}`}>
			<Typography color="text.disabled" component="div">
				{icon ?? <Telescope size={compact ? 28 : 40} strokeWidth={1.5} />}
			</Typography>
			<Typography variant="subtitle2" className="font-semibold">
				{title}
			</Typography>
			{description && (
				<Typography variant="body2" color="text.secondary" className="max-w-sm">
					{description}
				</Typography>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
