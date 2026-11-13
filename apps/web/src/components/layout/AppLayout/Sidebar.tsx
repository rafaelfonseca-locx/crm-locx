import { UserAvatar } from "@/components/ui/UserAvatar";
import { useLeadDialogs } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { ROLE_LABELS } from "@/features/leads/constants";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { PreferencesDialog } from "@/features/notifications/PreferencesDialog";
import { useOnboarding } from "@/features/onboarding/OnboardingProvider";
import { useAuth } from "@/hooks/useAuth";
import { useIsDarkMode } from "@/hooks/useStageColor";
import { apiService } from "@/store/api/apiService";
import { useGetDashboardQuery } from "@/store/api/hooks";
import { logout } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import { BookOpen, ChevronsLeft, ChevronsRight, LogOut, Moon, Plus, Search, Settings, Sun } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { LocxLogo } from "./Brand";
import { NAVIGATION } from "./navigation";

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

type SidebarProps = {
	collapsed?: boolean;
	onToggleCollapsed?: () => void;
	onNavigate?: () => void;
	onOpenSearch: () => void;
};

/** Rótulo que some quando a barra está recolhida; o item ganha tooltip no lugar. */
function WithTooltip({
	collapsed,
	title,
	children,
}: { collapsed?: boolean; title: string; children: React.ReactElement }) {
	return collapsed ? (
		<Tooltip title={title} placement="right">
			{children}
		</Tooltip>
	) : (
		children
	);
}

export function Sidebar({ collapsed, onToggleCollapsed, onNavigate, onOpenSearch }: SidebarProps) {
	const { user } = useAuth();
	const dispatch = useAppDispatch();
	const { setMode } = useColorScheme();
	const isDark = useIsDarkMode();
	const { openCreateLead } = useLeadDialogs();
	const { openGuide } = useOnboarding();
	const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
	const [prefsOpen, setPrefsOpen] = useState(false);
	const { data } = useGetDashboardQuery({ days: 30 }, { pollingInterval: 120_000 });
	const agendaAlerts = (data?.data.myAgenda.overdue ?? 0) + (data?.data.myAgenda.today ?? 0);
	const trialsEnding = data?.data.trialsEnding.length ?? 0;
	const badgeFor = (id: string) => (id === "agenda" ? agendaAlerts : id === "trials" ? trialsEnding : 0);

	const handleLogout = () => {
		dispatch(logout());
		dispatch(apiService.util.resetApiState());
	};

	const itemClass = `relative flex items-center gap-3 h-9 rounded-lg text-[13px] font-medium transition-colors ${collapsed ? "justify-center px-0" : "px-2.5"}`;

	return (
		<Box
			component="nav"
			aria-label="Navegação principal"
			className="flex flex-col h-full py-3 border-r transition-[width] duration-200"
			sx={{
				width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
				bgcolor: "sidebar.background",
				color: "sidebar.text",
				borderColor: "sidebar.border",
				px: collapsed ? 1.25 : 1.5,
			}}
		>
			<div className={`flex items-center h-10 mb-3 ${collapsed ? "justify-center" : "justify-between pl-1.5"}`}>
				<LocxLogo compact={collapsed} height={collapsed ? 22 : 24} />
				{onToggleCollapsed && !collapsed && (
					<Tooltip title="Recolher menu">
						<IconButton
							size="small"
							onClick={onToggleCollapsed}
							aria-label="Recolher menu"
							sx={{ color: "sidebar.muted" }}
						>
							<ChevronsLeft size={18} strokeWidth={1.75} />
						</IconButton>
					</Tooltip>
				)}
			</div>

			<div className="space-y-1.5 mb-4">
				<WithTooltip collapsed={collapsed} title="Novo lead">
					<Button
						fullWidth
						onClick={() => {
							onNavigate?.();
							openCreateLead();
						}}
						startIcon={collapsed ? undefined : <Plus size={16} strokeWidth={2.25} />}
						data-cy="button-register-leads"
						sx={{ minWidth: 0, px: collapsed ? 0 : undefined }}
						aria-label="Novo lead"
					>
						{collapsed ? <Plus size={18} strokeWidth={2.25} /> : "Novo lead"}
					</Button>
				</WithTooltip>
				<WithTooltip collapsed={collapsed} title="Buscar (Ctrl K)">
					<Box
						component="button"
						type="button"
						onClick={onOpenSearch}
						data-cy="open-search"
						className={`${itemClass} w-full border`}
						sx={{ color: "sidebar.muted", borderColor: "sidebar.border", "&:hover": { bgcolor: "sidebar.hover" } }}
						aria-label="Buscar"
					>
						<Search size={16} strokeWidth={1.75} />
						{!collapsed && (
							<>
								<span className="flex-1 text-left font-normal">Buscar</span>
								<span className="text-[11px] border rounded px-1 py-px font-normal" style={{ borderColor: "inherit" }}>
									Ctrl K
								</span>
							</>
						)}
					</Box>
				</WithTooltip>
			</div>

			<div className="flex-1 space-y-5 overflow-y-auto scrollbar-none">
				{NAVIGATION.map((section) => (
					<div key={section.title}>
						{!collapsed && (
							<Typography
								component="div"
								className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]"
								sx={{ color: "sidebar.muted" }}
							>
								{section.title}
							</Typography>
						)}
						{collapsed && <Divider className="!mb-2 !mx-2" />}
						<ul className="space-y-0.5">
							{section.items.map(({ id, label, to, icon: Icon }) => {
								const badge = badgeFor(id);
								return (
									<li key={id}>
										<WithTooltip collapsed={collapsed} title={label}>
											<Box
												component={NavLink}
												to={to}
												end={to === "/"}
												onClick={onNavigate}
												data-cy={`nav-${id}`}
												className={itemClass}
												sx={{
													color: "sidebar.text",
													"&:hover": { bgcolor: "sidebar.hover" },
													"&.active": { bgcolor: "sidebar.active", color: "sidebar.activeText", fontWeight: 600 },
												}}
											>
												<Badge
													color={id === "agenda" ? "error" : "warning"}
													variant="dot"
													invisible={!collapsed || badge === 0}
													overlap="circular"
												>
													<Icon size={18} strokeWidth={1.75} />
												</Badge>
												{!collapsed && <span className="flex-1">{label}</span>}
												{!collapsed && badge > 0 && (
													<Box
														component="span"
														className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center"
														sx={{ bgcolor: id === "agenda" ? "error.main" : "warning.main", color: "#fff" }}
														aria-label={
															id === "agenda"
																? `${badge} atividades atrasadas ou para hoje`
																: `${badge} trials terminando`
														}
													>
														{badge}
													</Box>
												)}
											</Box>
										</WithTooltip>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>

			<div className="space-y-0.5 pt-3 border-t" style={{ borderColor: "var(--mui-palette-sidebar-border)" }}>
				{collapsed && onToggleCollapsed && (
					<WithTooltip collapsed title="Expandir menu">
						<Box
							component="button"
							type="button"
							onClick={onToggleCollapsed}
							className={`${itemClass} w-full`}
							sx={{ color: "sidebar.muted", "&:hover": { bgcolor: "sidebar.hover" } }}
							aria-label="Expandir menu"
						>
							<ChevronsRight size={18} strokeWidth={1.75} />
						</Box>
					</WithTooltip>
				)}
				<NotificationBell collapsed={collapsed} itemClass={itemClass} />
				<WithTooltip collapsed={collapsed} title="Guia de uso">
					<Box
						component="button"
						type="button"
						onClick={openGuide}
						className={`${itemClass} w-full`}
						sx={{ "&:hover": { bgcolor: "sidebar.hover" } }}
						data-cy="open-guide"
					>
						<BookOpen size={18} strokeWidth={1.75} />
						{!collapsed && <span>Guia de uso</span>}
					</Box>
				</WithTooltip>
				<WithTooltip collapsed={collapsed} title={isDark ? "Tema claro" : "Tema escuro"}>
					<Box
						component="button"
						type="button"
						onClick={() => setMode(isDark ? "light" : "dark")}
						className={`${itemClass} w-full`}
						sx={{ "&:hover": { bgcolor: "sidebar.hover" } }}
						data-cy="toggle-theme"
					>
						{isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
						{!collapsed && <span>{isDark ? "Tema claro" : "Tema escuro"}</span>}
					</Box>
				</WithTooltip>
				<Box
					component="button"
					type="button"
					onClick={(e) => setMenuAnchor(e.currentTarget as HTMLElement)}
					className={`flex items-center gap-2.5 w-full rounded-lg py-1.5 mt-1 text-left ${collapsed ? "justify-center" : "px-1.5"}`}
					sx={{ "&:hover": { bgcolor: "sidebar.hover" } }}
					data-cy="user-menu"
					aria-label="Menu do usuário"
				>
					<UserAvatar user={user} size={32} tooltip={false} />
					{!collapsed && user && (
						<div className="min-w-0">
							<Typography variant="body2" fontWeight={600} noWrap>
								{user.name}
							</Typography>
							<Typography variant="caption" sx={{ color: "sidebar.muted" }} noWrap component="div">
								{ROLE_LABELS[user.role]}
							</Typography>
						</div>
					)}
				</Box>
				<Menu
					anchorEl={menuAnchor}
					open={!!menuAnchor}
					onClose={() => setMenuAnchor(null)}
					anchorOrigin={{ vertical: "top", horizontal: "right" }}
					transformOrigin={{ vertical: "bottom", horizontal: "left" }}
				>
					<div className="px-4 py-2 min-w-[220px]">
						<Typography variant="body2" fontWeight={600}>
							{user?.name}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{user?.email}
						</Typography>
					</div>
					<Divider />
					<MenuItem
						onClick={() => {
							setMenuAnchor(null);
							setPrefsOpen(true);
						}}
						dense
						data-cy="open-preferences"
					>
						<ListItemIcon>
							<Settings size={18} strokeWidth={1.5} />
						</ListItemIcon>
						Preferências
					</MenuItem>
					<MenuItem onClick={handleLogout} dense data-cy="logout">
						<ListItemIcon>
							<LogOut size={18} strokeWidth={1.5} />
						</ListItemIcon>
						Sair
					</MenuItem>
				</Menu>
				<PreferencesDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} />
			</div>
		</Box>
	);
}
