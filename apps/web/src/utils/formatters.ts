import {
	differenceInCalendarDays,
	format,
	formatDistanceToNowStrict,
	isToday,
	isTomorrow,
	isYesterday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compactCurrency = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	notation: "compact",
	maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export const formatCurrency = (value: number | null | undefined) =>
	value === null || value === undefined ? "N/A" : currency.format(value);
export const formatCompactCurrency = (value: number) =>
	value >= 10000 ? compactCurrency.format(value) : currency.format(value);
export const formatPercent = (value: number | null | undefined) =>
	value === null || value === undefined ? "N/A" : percent.format(value);

export const formatShortDate = (value: string | Date | null | undefined) =>
	value ? format(new Date(value), "dd/MM/yyyy") : "N/A";
export const formatDateTime = (value: string | Date | null | undefined) =>
	value ? format(new Date(value), "dd/MM/yyyy 'às' HH:mm") : "N/A";
export const formatTime = (value: string | Date) => format(new Date(value), "HH:mm");

/** "Hoje, 14:30", "Amanhã, 09:00", "Ontem, 18:00" ou "12/11, 10:00" */
export function formatRelativeDay(value: string | Date) {
	const date = new Date(value);
	const time = format(date, "HH:mm");
	if (isToday(date)) return `Hoje, ${time}`;
	if (isTomorrow(date)) return `Amanhã, ${time}`;
	if (isYesterday(date)) return `Ontem, ${time}`;
	return format(date, "dd/MM, HH:mm");
}

export const timeAgo = (value: string | Date) =>
	formatDistanceToNowStrict(new Date(value), { locale: ptBR, addSuffix: true });

export const daysSince = (value: string | Date) => Math.max(0, differenceInCalendarDays(new Date(), new Date(value)));

export function initials(name: string) {
	const parts = name.trim().split(/\s+/);
	return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function whatsappLink(phone: string) {
	const digits = onlyDigits(phone);
	return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}
