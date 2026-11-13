import { EmptyState } from "@/components/ui/EmptyState";
import type { AppNotification } from "@/store/api/@types/user.types";
import { useGetNotificationsQuery, useMarkNotificationsReadMutation } from "@/store/api/hooks";
import { timeAgo } from "@/utils/formatters";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
	AlarmClock,
	Bell,
	BellRing,
	CalendarClock,
	FileText,
	FlaskConical,
	type LucideIcon,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

const ICONS: Record<string, LucideIcon> = {
	LEAD_ASSIGNED: UserPlus,
	PARTICIPANT_ADDED: Users,
	TASK_ASSIGNED: AlarmClock,
	TASK_OVERDUE: AlarmClock,
	MEETING_SOON: CalendarClock,
	CALENDAR: CalendarClock,
	TRIAL_ENDING: FlaskConical,
	TRANSCRIPT: FileText,
};

const browserSupported = typeof window !== "undefined" && "Notification" in window;

/** Avisos do CRM, com alerta do navegador quando a aba está em segundo plano. */
export function NotificationBell({ collapsed, itemClass }: { collapsed?: boolean; itemClass: string }) {
	const navigate = useNavigate();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);
	const [permission, setPermission] = useState(browserSupported ? Notification.permission : "denied");
	const { data } = useGetNotificationsQuery(undefined, { pollingInterval: 30_000, refetchOnFocus: true });
	const [markRead] = useMarkNotificationsReadMutation();
	const items = data?.data.items ?? [];
	const unread = data?.data.unread ?? 0;
	const lastSeen = useRef<string | null>(null);

	// Alerta do navegador para avisos novos que chegam com a aba em segundo plano
	useEffect(() => {
		const newest = items[0];
		if (!newest) return;
		if (
			lastSeen.current &&
			newest.id !== lastSeen.current &&
			!newest.readAt &&
			permission === "granted" &&
			document.hidden
		) {
			const native = new Notification(newest.title, {
				body: newest.body ?? undefined,
				icon: "/favicon.png",
				tag: newest.id,
			});
			native.onclick = () => {
				window.focus();
				if (newest.link) navigate(newest.link);
			};
		}
		lastSeen.current = newest.id;
	}, [items, permission, navigate]);

	const open = (notification: AppNotification) => {
		if (!notification.readAt) markRead({ ids: [notification.id] });
		setAnchor(null);
		if (notification.link) navigate(notification.link);
	};

	const button = (
		<Box
			component="button"
			type="button"
			onClick={(e) => setAnchor(e.currentTarget as HTMLElement)}
			className={`${itemClass} w-full`}
			sx={{ "&:hover": { bgcolor: "sidebar.hover" } }}
			data-cy="open-notifications"
			aria-label={`Notificações${unread ? `: ${unread} não lidas` : ""}`}
		>
			<Badge color="error" badgeContent={unread} max={99} invisible={!collapsed || unread === 0} variant="dot">
				<Bell size={18} strokeWidth={1.75} />
			</Badge>
			{!collapsed && <span className="flex-1 text-left">Notificações</span>}
			{!collapsed && unread > 0 && (
				<Box
					component="span"
					className="min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center"
					sx={{ bgcolor: "error.main", color: "#fff" }}
				>
					{unread > 99 ? "99+" : unread}
				</Box>
			)}
		</Box>
	);

	return (
		<>
			{collapsed ? (
				<Tooltip title="Notificações" placement="right">
					{button}
				</Tooltip>
			) : (
				button
			)}
			<Popover
				open={!!anchor}
				anchorEl={anchor}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				transformOrigin={{ vertical: "bottom", horizontal: "left" }}
				slotProps={{
					paper: { sx: { width: 380, maxHeight: "70vh", display: "flex", flexDirection: "column", ml: 1 } },
				}}
			>
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<Typography variant="subtitle2" className="font-bold">
						Notificações
					</Typography>
					{unread > 0 && (
						<Button size="small" variant="text" color="inherit" onClick={() => markRead({})} data-cy="mark-all-read">
							Marcar todas como lidas
						</Button>
					)}
				</div>
				{browserSupported && permission === "default" && (
					<Box className="flex items-center gap-2 px-4 py-2.5 border-b" sx={{ bgcolor: "rgba(255,204,0,0.12)" }}>
						<BellRing size={16} strokeWidth={1.75} />
						<Typography variant="caption" className="flex-1">
							Receba alertas mesmo com o CRM em outra aba.
						</Typography>
						<Button size="small" onClick={async () => setPermission(await Notification.requestPermission())}>
							Ativar
						</Button>
					</Box>
				)}
				<div className="overflow-y-auto">
					{items.length === 0 ? (
						<EmptyState
							compact
							icon={<Bell size={28} strokeWidth={1.5} />}
							title="Nenhuma notificação"
							description="Avisos de leads novos, reuniões e trials aparecem aqui."
						/>
					) : (
						items.map((n) => {
							const Icon = ICONS[n.type] ?? Bell;
							return (
								<Box
									key={n.id}
									component="button"
									type="button"
									onClick={() => open(n)}
									className="w-full flex gap-3 px-4 py-3 text-left border-b last:border-b-0"
									sx={{
										bgcolor: n.readAt ? "transparent" : "rgba(255,204,0,0.07)",
										"&:hover": { bgcolor: "action.hover" },
									}}
								>
									<Box
										className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
										sx={{ bgcolor: "action.selected" }}
									>
										<Icon size={15} strokeWidth={1.75} />
									</Box>
									<div className="min-w-0 flex-1">
										<Typography variant="body2" fontWeight={n.readAt ? 500 : 700} className="leading-snug">
											{n.title}
										</Typography>
										{n.body && (
											<Typography variant="caption" color="text.secondary" component="div" className="line-clamp-2">
												{n.body}
											</Typography>
										)}
										<Typography variant="caption" color="text.disabled">
											{timeAgo(n.createdAt)}
										</Typography>
									</div>
									{!n.readAt && (
										<Box
											className="w-2 h-2 rounded-full mt-2 shrink-0"
											sx={{ bgcolor: "error.main" }}
											aria-label="Não lida"
										/>
									)}
								</Box>
							);
						})
					)}
				</div>
			</Popover>
		</>
	);
}
