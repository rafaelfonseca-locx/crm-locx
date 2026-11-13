import type { ActivityType } from "@/store/api/@types/activity.types";
import {
	ArrowRightLeft,
	CalendarClock,
	Info,
	ListTodo,
	type LucideIcon,
	Mail,
	MessageCircle,
	Phone,
	StickyNote,
} from "lucide-react";

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
	NOTE: StickyNote,
	CALL: Phone,
	EMAIL: Mail,
	WHATSAPP: MessageCircle,
	MEETING: CalendarClock,
	TASK: ListTodo,
	STAGE_CHANGE: ArrowRightLeft,
	SYSTEM: Info,
};
