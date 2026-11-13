import MuiDialog, { type DialogProps } from "@mui/material/Dialog";
import MuiDialogActions from "@mui/material/DialogActions";
import MuiDialogContent, { type DialogContentProps } from "@mui/material/DialogContent";
import MuiDialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Dialog(props: DialogProps) {
	return <MuiDialog fullWidth {...props} />;
}

export function DialogTitle({
	children,
	onClose,
	subtitle,
}: { children: ReactNode; onClose?: () => void; subtitle?: ReactNode }) {
	return (
		<MuiDialogTitle className="flex items-start justify-between gap-3 pr-3" component="div">
			<div className="min-w-0">
				<h2 className="text-base md:text-lg font-semibold leading-snug">{children}</h2>
				{subtitle && <div className="text-sm opacity-70 font-normal mt-0.5">{subtitle}</div>}
			</div>
			{onClose && (
				<IconButton aria-label="Fechar" onClick={onClose} size="small">
					<X size={18} strokeWidth={1.5} />
				</IconButton>
			)}
		</MuiDialogTitle>
	);
}

export function DialogContent(props: DialogContentProps) {
	return <MuiDialogContent dividers {...props} />;
}

export const DialogActions = MuiDialogActions;
