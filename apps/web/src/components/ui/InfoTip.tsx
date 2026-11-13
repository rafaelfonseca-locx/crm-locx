import Tooltip from "@mui/material/Tooltip";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

/** Ícone de informação com explicação ao passar o mouse (ou ao focar pelo teclado). */
export function InfoTip({ title, size = 14, className }: { title: ReactNode; size?: number; className?: string }) {
	return (
		<Tooltip title={title}>
			<button
				type="button"
				aria-label={typeof title === "string" ? title : "Mais informações"}
				className={`inline-flex items-center justify-center rounded-full opacity-45 hover:opacity-90 focus-visible:opacity-90 cursor-help shrink-0 ${className ?? ""}`}
				onClick={(e) => e.stopPropagation()}
				onPointerDown={(e) => e.stopPropagation()}
			>
				<Info size={size} strokeWidth={1.75} />
			</button>
		</Tooltip>
	);
}
