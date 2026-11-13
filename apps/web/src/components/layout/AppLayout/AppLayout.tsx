import { LeadDialogsProvider } from "@/features/leads/components/dialogs/LeadDialogsProvider";
import { OnboardingProvider } from "@/features/onboarding/OnboardingProvider";
import { usePersistentState } from "@/hooks/usePersistentState";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Menu as MenuIcon, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { LocxLogo } from "./Brand";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";

/** Estrutura do app: barra lateral (sem barra no topo) e conteúdo. */
export function AppLayout() {
	const isDesktop = useMediaQuery((theme) => theme.breakpoints.up("lg"), { noSsr: true });
	const [mobileOpen, setMobileOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [prefs, setPrefs] = usePersistentState("layoutPrefs", { collapsed: false });

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<LeadDialogsProvider>
			<OnboardingProvider>
				<a
					href="#conteudo"
					className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:bg-white"
				>
					Pular para o conteúdo
				</a>
				<div className="flex h-full">
					{isDesktop ? (
						<aside className="sticky top-0 h-screen shrink-0">
							<Sidebar
								collapsed={prefs.collapsed}
								onToggleCollapsed={() => setPrefs({ collapsed: !prefs.collapsed })}
								onOpenSearch={() => setSearchOpen(true)}
							/>
						</aside>
					) : (
						<Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}>
							<Sidebar onNavigate={() => setMobileOpen(false)} onOpenSearch={() => setSearchOpen(true)} />
						</Drawer>
					)}
					<div className="flex flex-col flex-1 min-w-0 h-screen overflow-y-auto">
						{!isDesktop && (
							<Box
								component="header"
								className="sticky top-0 z-20 flex items-center gap-2 h-14 px-3 border-b"
								sx={{ bgcolor: "background.paper" }}
							>
								<IconButton onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
									<MenuIcon size={20} strokeWidth={1.75} />
								</IconButton>
								<LocxLogo height={20} />
								<IconButton className="!ml-auto" onClick={() => setSearchOpen(true)} aria-label="Buscar">
									<Search size={20} strokeWidth={1.75} />
								</IconButton>
							</Box>
						)}
						<Box component="main" id="conteudo" className="flex-1" sx={{ bgcolor: "background.default" }}>
							<Outlet />
						</Box>
					</div>
				</div>
				<CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
			</OnboardingProvider>
		</LeadDialogsProvider>
	);
}
