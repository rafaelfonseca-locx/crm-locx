import CircularProgress from "@mui/material/CircularProgress";

export function LoadingContent({ label = "Carregando..." }: { label?: string }) {
	return (
		<output className="flex flex-1 items-center justify-center py-20 gap-3">
			<CircularProgress size={22} />
			<span className="text-sm opacity-70">{label}</span>
		</output>
	);
}
