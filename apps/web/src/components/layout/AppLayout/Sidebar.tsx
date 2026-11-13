import { useAuth } from "@/hooks/useAuth";
import { useGetDashboardQuery } from "@/store/api/hooks";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { NavLink } from "react-router";
import { NAVIGATION } from "./navigation";

export function LocxLogo({ compact }: { compact?: boolean }) {
	return (
		<div className="flex items-center gap-2.5">
			<Box
				className="flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm"
				sx={{ bgcolor: "primary.main", color: "#000" }}
			>
				LX
			</Box>
			{!compact && (
				<div className="leading-none">
					<div className="font-bold text-base tracking-tight">LocX</div>
					<div className="text-xs uppercase tracking-[0.14em] opacity-60 mt-0.5">CRM</div>
				</div>
			)}
		</div>
	);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
	const { user } = useAuth();
	const { data } = useGetDashboardQuery({ days: 30 }, { pollingInterval: 120_000 });
	const agendaAlerts = (data?.data.myAgenda.overdue ?? 0) + (data?.data.myAgenda.today ?? 0);
	const trialsEnding = data?.data.trialsEnding.length ?? 0;

	const badgeFor = (id: string) => (id === "agenda" ? agendaAlerts : id === "trials" ? trialsEnding : 0);

	return (
		<Box
			component="nav"
			aria-label="Navegação principal"
			className="flex flex-col h-full w-[248px] px-3 py-4"
			sx={{ bgcolor: "sidebar.background", color: "sidebar.text" }}
		>
			<div className="px-2 pb-6">
				<LocxLogo />
			</div>
			<div className="flex-1 space-y-6 overflow-y-auto scrollbar-thin">
				{NAVIGATION.map((section) => (
					<div key={section.title}>
						<Typography
							component="div"
							className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em]"
							sx={{ color: "sidebar.muted" }}
						>
							{section.title}
						</Typography>
						<ul className="space-y-0.5">
							{section.items.map(({ id, label, to, icon: Icon }) => {
								const badge = badgeFor(id);
								return (
									<li key={id}>
										<Box
											component={NavLink}
											to={to}
											end={to === "/"}
											onClick={onNavigate}
											data-cy={`nav-${id}`}
											className="relative flex items-center gap-3 px-3 h-10 rounded-lg text-[13px] font-medium transition-colors"
											sx={{
												color: "sidebar.text",
												"&:hover": { bgcolor: "sidebar.hover" },
												"&.active": { bgcolor: "sidebar.active", color: "primary.main" },
												"&.active::before": {
													content: '""',
													position: "absolute",
													left: -12,
													top: 8,
													bottom: 8,
													width: 3,
													borderRadius: "0 3px 3px 0",
													bgcolor: "primary.main",
												},
											}}
										>
											<Icon size={18} strokeWidth={1.5} />
											<span className="flex-1">{label}</span>
											{badge > 0 && (
												<Badge
													badgeContent={badge}
													color={id === "agenda" ? "error" : "warning"}
													sx={{ "& .MuiBadge-badge": { position: "static", transform: "none" } }}
													aria-label={
														id === "agenda"
															? `${badge} atividades para hoje ou atrasadas`
															: `${badge} trials terminando`
													}
												/>
											)}
										</Box>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
			{user && (
				<Box className="mt-4 rounded-lg p-3 text-xs" sx={{ bgcolor: "sidebar.hover", color: "sidebar.muted" }}>
					Leads do RD Station chegam automaticamente no Pipeline.
				</Box>
			)}
		</Box>
	);
}
