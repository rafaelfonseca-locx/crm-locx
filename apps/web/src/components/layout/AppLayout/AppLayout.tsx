import { UserAvatar } from "@/components/ui/UserAvatar";
import { LeadDialogsProvider, useLeadDialogs } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { ROLE_LABELS } from "@/features/leads/constants";
import { useAuth } from "@/hooks/useAuth";
import { useIsDarkMode } from "@/hooks/useStageColor";
import { apiService } from "@/store/api/apiService";
import { logout } from "@/store/authSlice";
import { useAppDispatch } from "@/store/hooks";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { LogOut, Menu as MenuIcon, Moon, Plus, Sun } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router";
import { GlobalSearch } from "./GlobalSearch";
import { LocxLogo, Sidebar } from "./Sidebar";

function Masthead({ onOpenMenu }: { onOpenMenu: () => void }) {
	const { user } = useAuth();
	const dispatch = useAppDispatch();
	const { setMode } = useColorScheme();
	const isDark = useIsDarkMode();
	const { openCreateLead } = useLeadDialogs();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	const handleLogout = () => {
		dispatch(logout());
		dispatch(apiService.util.resetApiState());
	};

	return (
		<Box
			component="header"
			className="sticky top-0 z-20 flex items-center gap-3 h-16 px-4 lg:px-6 border-b"
			sx={{ bgcolor: "background.paper" }}
		>
			<IconButton className="lg:!hidden" onClick={onOpenMenu} aria-label="Abrir menu">
				<MenuIcon size={20} strokeWidth={1.5} />
			</IconButton>
			<div className="lg:hidden">
				<LocxLogo compact />
			</div>
			<GlobalSearch />
			<div className="flex items-center gap-1 ml-auto">
				<Button
					startIcon={<Plus size={16} strokeWidth={2} />}
					onClick={openCreateLead}
					data-cy="button-register-leads"
					className="!hidden sm:!inline-flex"
				>
					Novo lead
				</Button>
				<Tooltip title="Novo lead">
					<IconButton onClick={openCreateLead} className="sm:!hidden" aria-label="Novo lead">
						<Plus size={20} strokeWidth={1.5} />
					</IconButton>
				</Tooltip>
				<Tooltip title={isDark ? "Usar tema claro" : "Usar tema escuro"}>
					<IconButton
						onClick={() => setMode(isDark ? "light" : "dark")}
						aria-label="Alternar tema"
						data-cy="toggle-theme"
					>
						{isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
					</IconButton>
				</Tooltip>
				<IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Menu do usuário" data-cy="user-menu">
					<UserAvatar user={user} size={32} tooltip={false} />
				</IconButton>
				<Menu
					anchorEl={anchor}
					open={!!anchor}
					onClose={() => setAnchor(null)}
					anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
					transformOrigin={{ vertical: "top", horizontal: "right" }}
				>
					<div className="px-4 py-2 min-w-[220px]">
						<Typography variant="body2" fontWeight={600}>
							{user?.name}
						</Typography>
						<Typography variant="caption" color="text.secondary" component="div">
							{user?.email}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{user ? ROLE_LABELS[user.role] : ""}
						</Typography>
					</div>
					<Divider />
					<MenuItem onClick={handleLogout} dense data-cy="logout">
						<ListItemIcon>
							<LogOut size={18} strokeWidth={1.5} />
						</ListItemIcon>
						Sair
					</MenuItem>
				</Menu>
			</div>
		</Box>
	);
}

export function AppLayout() {
	const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("lg"), { noSsr: true });
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<LeadDialogsProvider>
			<a
				href="#conteudo"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:bg-white"
			>
				Pular para o conteúdo
			</a>
			<div className="flex h-full">
				{isDesktop ? (
					<aside className="sticky top-0 h-screen shrink-0">
						<Sidebar />
					</aside>
				) : (
					<Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
						<Sidebar onNavigate={() => setMobileOpen(false)} />
					</Drawer>
				)}
				<div className="flex flex-col flex-1 min-w-0 h-screen overflow-y-auto">
					<Masthead onOpenMenu={() => setMobileOpen(true)} />
					<Box component="main" id="conteudo" className="flex-1" sx={{ bgcolor: "background.default" }}>
						<Outlet />
					</Box>
				</div>
			</div>
		</LeadDialogsProvider>
	);
}
