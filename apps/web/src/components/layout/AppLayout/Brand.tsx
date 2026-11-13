import { useIsDarkMode } from "@/hooks/useStageColor";

/** Logo LocX: versão escura no tema claro e versão branca no tema escuro. */
export function LocxLogo({
	compact,
	height = 26,
	forceDark,
}: { compact?: boolean; height?: number; forceDark?: boolean }) {
	const isDark = useIsDarkMode() || forceDark;
	if (compact) return <img src="/brand/locx-x.png" alt="LocX" style={{ height, width: "auto" }} />;
	return (
		<div className="flex items-center gap-2">
			<img
				src={isDark ? "/brand/locx-on-dark.png" : "/brand/locx-on-light.png"}
				alt="LocX"
				style={{ height, width: "auto" }}
			/>
			<span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-50 pt-1">CRM</span>
		</div>
	);
}
