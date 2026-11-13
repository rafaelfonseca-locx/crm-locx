import type { Trial } from "@/store/api/@types/lead.types";
import { differenceInCalendarDays } from "date-fns";

/** Situação do trial: dia atual, dias restantes e progresso do checklist. */
export function getTrialProgress(trial: Trial) {
	const now = new Date();
	const start = new Date(trial.startDate);
	const end = new Date(trial.endDate);
	const totalDays = Math.max(1, differenceInCalendarDays(end, start));
	const currentDay = Math.min(totalDays, Math.max(0, differenceInCalendarDays(now, start)));
	const daysLeft = differenceInCalendarDays(end, now);
	const done = trial.checklist.filter((c) => c.done).length;
	const nextItem = trial.checklist.find((c) => !c.done) ?? null;
	const overdueItems = trial.checklist.filter((c) => !c.done && c.dayOffset < currentDay).length;
	return {
		totalDays,
		currentDay,
		daysLeft,
		isExpired: trial.status === "ACTIVE" && daysLeft < 0,
		isEndingSoon: trial.status === "ACTIVE" && daysLeft >= 0 && daysLeft <= 2,
		timePercent: Math.round((currentDay / totalDays) * 100),
		checklistDone: done,
		checklistTotal: trial.checklist.length,
		checklistPercent: trial.checklist.length ? Math.round((done / trial.checklist.length) * 100) : 0,
		nextItem,
		overdueItems,
	};
}

export function trialDaysLeftLabel(daysLeft: number) {
	if (daysLeft < 0) return `Venceu há ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "dia" : "dias"}`;
	if (daysLeft === 0) return "Termina hoje";
	if (daysLeft === 1) return "Termina amanhã";
	return `${daysLeft} dias restantes`;
}
