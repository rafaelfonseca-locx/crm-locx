import {
	CalendarClock,
	FlaskConical,
	Gauge,
	Handshake,
	KanbanSquare,
	type LucideIcon,
	Plug,
	Rows3,
	Users,
} from "lucide-react";

export type NavItem = { id: string; label: string; to: string; icon: LucideIcon; managerOnly?: boolean };
export type NavSection = { title: string; items: NavItem[] };

export const NAVIGATION: NavSection[] = [
	{
		title: "Comercial",
		items: [
			{ id: "dashboard", label: "Início", to: "/", icon: Gauge },
			{ id: "pipeline", label: "Pipeline", to: "/pipeline", icon: KanbanSquare },
			{ id: "leads", label: "Leads", to: "/leads", icon: Rows3 },
			{ id: "trials", label: "Trials", to: "/trials", icon: FlaskConical },
			{ id: "agenda", label: "Agenda", to: "/agenda", icon: CalendarClock },
			{ id: "partners", label: "Parceiros", to: "/parceiros", icon: Handshake },
		],
	},
	{
		title: "Gestão",
		items: [
			{ id: "team", label: "Equipe", to: "/equipe", icon: Users },
			{ id: "integrations", label: "Integrações", to: "/integracoes", icon: Plug },
		],
	},
];
