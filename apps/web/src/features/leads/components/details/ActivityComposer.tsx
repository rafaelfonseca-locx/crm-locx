import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import type { ActivityPayload } from "@/store/api/@types/activity.types";
import type { Lead } from "@/store/api/@types/lead.types";
import { useCreateActivityMutation, useGetUsersQuery } from "@/store/api/hooks";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { addHours, setMinutes } from "date-fns";
import { useState } from "react";
import { ACTIVITY_LABELS } from "../../constants";
import { useLeadDialogs } from "../dialogs/LeadDialogsProvider";
import { ACTIVITY_ICONS } from "./activityIcons";

type ComposerType = ActivityPayload["type"];
const TYPES: ComposerType[] = ["NOTE", "CALL", "WHATSAPP", "EMAIL", "TASK", "MEETING"];
const PLACEHOLDERS: Record<ComposerType, string> = {
	NOTE: "Escreva uma nota sobre o lead...",
	CALL: "Como foi a ligação? Próximos passos?",
	WHATSAPP: "Resumo da conversa no WhatsApp...",
	EMAIL: "Resumo do e-mail enviado ou recebido...",
	TASK: "Detalhes da tarefa (opcional)",
	MEETING: "",
};

const nextHour = () => setMinutes(addHours(new Date(), 1), 0);

/** Registro rápido de interações e criação de tarefas, no topo da linha do tempo. */
export function ActivityComposer({ lead }: { lead: Lead }) {
	const notify = useNotify();
	const { user } = useAuth();
	const { openScheduleMeeting } = useLeadDialogs();
	const { data: users } = useGetUsersQuery();
	const [createActivity, { isLoading }] = useCreateActivityMutation();
	const [type, setType] = useState<ComposerType>("NOTE");
	const [body, setBody] = useState("");
	const [title, setTitle] = useState("");
	const [dueAt, setDueAt] = useState<Date | null>(nextHour());
	const [assigneeId, setAssigneeId] = useState(user?.id ?? "");
	const [error, setError] = useState<string | null>(null);

	const isTask = type === "TASK";

	const reset = () => {
		setBody("");
		setTitle("");
		setDueAt(nextHour());
		setError(null);
	};

	const handleSubmit = async () => {
		if (isTask && !title.trim()) return setError("Título é obrigatório");
		if (isTask && !dueAt) return setError("Data é obrigatória");
		if (!isTask && !body.trim()) return setError("Descreva a atividade");
		try {
			await createActivity({
				leadId: lead.id,
				type,
				body: body.trim() || null,
				title: isTask ? title.trim() : null,
				dueAt: isTask ? dueAt?.toISOString() : null,
				assigneeId: isTask ? assigneeId : null,
			}).unwrap();
			notify.success(isTask ? "Tarefa criada com sucesso" : `${ACTIVITY_LABELS[type]} registrada com sucesso`);
			reset();
		} catch (err) {
			notify.apiError(err);
		}
	};

	return (
		<Paper
			className="rounded-xl overflow-hidden"
			sx={{ border: 1, borderColor: "divider" }}
			data-cy="activity-composer"
		>
			<Tabs
				value={type}
				onChange={(_, v: ComposerType) => {
					if (v === "MEETING") return openScheduleMeeting(lead);
					setType(v);
					setError(null);
				}}
				variant="scrollable"
				className="px-2"
				aria-label="Tipo de atividade"
			>
				{TYPES.map((t) => {
					const Icon = ACTIVITY_ICONS[t];
					return (
						<Tab
							key={t}
							value={t}
							label={ACTIVITY_LABELS[t]}
							icon={<Icon size={15} strokeWidth={1.5} />}
							iconPosition="start"
							data-cy={`composer-tab-${t}`}
							sx={{ minHeight: 42 }}
						/>
					);
				})}
			</Tabs>
			<div className="p-3 space-y-3">
				{isTask && (
					<div className="grid grid-cols-12 gap-3">
						<TextField
							className="col-span-12 md:col-span-6"
							label="Título*"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							error={!!error && !title.trim()}
							disabled={isLoading}
							slotProps={{ htmlInput: { maxLength: 160, "data-cy": "task-title" } }}
						/>
						<DateTimePicker
							className="col-span-6 md:col-span-3"
							label="Prazo*"
							value={dueAt}
							onChange={setDueAt}
							ampm={false}
							format="dd/MM HH:mm"
							disabled={isLoading}
							slotProps={{ textField: { size: "small", fullWidth: true } }}
						/>
						<TextField
							className="col-span-6 md:col-span-3"
							select
							label="Para"
							value={assigneeId}
							onChange={(e) => setAssigneeId(e.target.value)}
							disabled={isLoading}
						>
							{(users?.data ?? []).map((u) => (
								<MenuItem key={u.id} value={u.id}>
									{u.name}
								</MenuItem>
							))}
						</TextField>
					</div>
				)}
				<TextField
					multiline
					minRows={isTask ? 1 : 2}
					maxRows={8}
					placeholder={PLACEHOLDERS[type]}
					value={body}
					onChange={(e) => {
						setBody(e.target.value);
						setError(null);
					}}
					onKeyDown={(e) => {
						if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
					}}
					error={!!error && !isTask}
					helperText={
						error ??
						(lead.stage === "NEW" && ["CALL", "WHATSAPP", "EMAIL"].includes(type)
							? "Registrar o primeiro contato move o lead para Pré-atendimento"
							: " ")
					}
					disabled={isLoading}
					slotProps={{ htmlInput: { "data-cy": "activity-body", "aria-label": "Descrição da atividade" } }}
				/>
				<div className="flex justify-end gap-2 -mt-2">
					{(body || title) && (
						<Button variant="text" color="inherit" onClick={reset} disabled={isLoading}>
							Limpar
						</Button>
					)}
					<Button onClick={handleSubmit} loading={isLoading} data-cy="save-activity">
						{isTask ? "Criar tarefa" : "Registrar"}
					</Button>
				</div>
			</div>
		</Paper>
	);
}
