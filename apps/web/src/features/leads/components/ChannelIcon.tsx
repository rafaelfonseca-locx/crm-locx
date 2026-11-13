import type { LeadChannel } from "@/store/api/@types/lead.types";
import Tooltip from "@mui/material/Tooltip";
import { CalendarCheck, Globe, type LucideIcon, MessageCircle, UserPlus } from "lucide-react";
import { CHANNEL_META } from "../constants";

const ICONS: Record<LeadChannel, LucideIcon> = {
	DEMO: CalendarCheck,
	WHATSAPP: MessageCircle,
	SITE: Globe,
	MANUAL: UserPlus,
};

/** Ícone do canal de entrada do lead, com explicação no tooltip. */
export function ChannelIcon({ channel, size = 14 }: { channel: LeadChannel; size?: number }) {
	const Icon = ICONS[channel];
	return (
		<Tooltip title={`${CHANNEL_META[channel].label}. ${CHANNEL_META[channel].description}`}>
			<span className="inline-flex opacity-60" aria-label={CHANNEL_META[channel].label}>
				<Icon size={size} strokeWidth={1.75} />
			</span>
		</Tooltip>
	);
}

export const CHANNEL_ICONS = ICONS;
