import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

type AskOptions = {
	title: string;
	subtitle?: ReactNode;
	confirmText?: string;
	destructive?: boolean;
	onConfirm: () => void | Promise<void>;
};

type AskContextValue = {
	ask: (options: AskOptions) => void;
	askBeforeDelete: (options: { title: string; subtitle: ReactNode; onRemove: () => void | Promise<void> }) => void;
};

const AskContext = createContext<AskContextValue | null>(null);

export function AskDialogProvider({ children }: { children: ReactNode }) {
	const [options, setOptions] = useState<AskOptions | null>(null);
	const [isRunning, setIsRunning] = useState(false);

	const ask = useCallback((o: AskOptions) => setOptions(o), []);
	const askBeforeDelete = useCallback(
		({ title, subtitle, onRemove }: { title: string; subtitle: ReactNode; onRemove: () => void | Promise<void> }) =>
			setOptions({
				title,
				subtitle: <>{subtitle} Essa ação não pode ser desfeita.</>,
				confirmText: "Excluir",
				destructive: true,
				onConfirm: onRemove,
			}),
		[],
	);

	const handleClose = () => !isRunning && setOptions(null);
	const handleConfirm = async () => {
		if (!options) return;
		setIsRunning(true);
		try {
			await options.onConfirm();
		} finally {
			setIsRunning(false);
			setOptions(null);
		}
	};

	const value = useMemo(() => ({ ask, askBeforeDelete }), [ask, askBeforeDelete]);

	return (
		<AskContext.Provider value={value}>
			{children}
			<Dialog open={!!options} onClose={handleClose} maxWidth="xs" data-cy="ask-dialog">
				<DialogTitle>{options?.title}</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary">
						{options?.subtitle}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button variant="outlined" color="inherit" onClick={handleClose} disabled={isRunning}>
						Cancelar
					</Button>
					<Button
						color={options?.destructive ? "error" : "primary"}
						onClick={handleConfirm}
						loading={isRunning}
						data-cy="ask-dialog-confirm"
					>
						{options?.confirmText ?? "Confirmar"}
					</Button>
				</DialogActions>
			</Dialog>
		</AskContext.Provider>
	);
}

export function useAskDialog() {
	const ctx = useContext(AskContext);
	if (!ctx) throw new Error("useAskDialog precisa estar dentro de AskDialogProvider");
	return ctx;
}
