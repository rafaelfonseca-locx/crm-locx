import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import {
	useDisconnectGoogleMutation,
	useGetGoogleConnectUrlMutation,
	useGetGoogleStatusQuery,
	useUpdateMeMutation,
} from "@/store/api/hooks";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { CalendarCheck } from "lucide-react";

const EMAIL_PREFS = [
	{
		key: "emailOnAssigned",
		label: "Lead novo para mim",
		hint: "Quando um lead chega, é transferido ou você é adicionado ao processo.",
	},
	{
		key: "emailOnCalendar",
		label: "Agendamentos do Cal.com",
		hint: "Demonstração agendada, remarcada ou cancelada pelo lead.",
	},
	{
		key: "emailDailyDigest",
		label: "Resumo diário às 8h",
		hint: "Atividades atrasadas, agenda do dia e trials terminando.",
	},
] as const;

/** Preferências do usuário: e-mails e conexão com o Google Agenda. */
export function PreferencesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
	const { user } = useAuth();
	const notify = useNotify();
	const [updateMe, { isLoading }] = useUpdateMeMutation();
	const { data: google } = useGetGoogleStatusQuery(undefined, { skip: !open });
	const [getConnectUrl, { isLoading: isConnecting }] = useGetGoogleConnectUrlMutation();
	const [disconnect, { isLoading: isDisconnecting }] = useDisconnectGoogleMutation();
	const status = google?.data;

	const toggle = async (key: (typeof EMAIL_PREFS)[number]["key"], value: boolean) => {
		try {
			await updateMe({ [key]: value }).unwrap();
		} catch (error) {
			notify.apiError(error);
		}
	};

	const connect = async () => {
		try {
			const { data } = await getConnectUrl().unwrap();
			window.location.href = data.url;
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" data-cy="preferences-dialog">
			<DialogTitle onClose={onClose}>Preferências</DialogTitle>
			<DialogContent className="space-y-6">
				<section className="space-y-3">
					<div className="flex items-center gap-3">
						<Box
							className="flex items-center justify-center w-9 h-9 rounded-lg"
							sx={{ bgcolor: "rgba(255,204,0,0.2)" }}
						>
							<CalendarCheck size={18} strokeWidth={1.75} />
						</Box>
						<div className="flex-1">
							<Typography variant="body2" fontWeight={700}>
								Google Agenda e Meet
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{status?.connected
									? `Conectado como ${status.email}. Reuniões agendadas no CRM vão para a sua agenda com link do Meet, e a transcrição chega sozinha.`
									: "Conecte para criar as reuniões na sua agenda com link do Meet e receber a transcrição no lead."}
							</Typography>
						</div>
						{status?.connected ? (
							<Button variant="outlined" color="inherit" onClick={() => disconnect()} loading={isDisconnecting}>
								Desconectar
							</Button>
						) : (
							<Button
								onClick={connect}
								loading={isConnecting}
								disabled={status ? !status.configured : true}
								data-cy="connect-google"
							>
								Conectar
							</Button>
						)}
					</div>
					{status && !status.configured && (
						<Alert severity="info">
							O Google ainda não foi configurado no servidor. Veja a seção “Google Agenda e Meet” no README.
						</Alert>
					)}
				</section>

				<section className="space-y-1">
					<Typography variant="body2" fontWeight={700} className="pb-1">
						Receber por e-mail
					</Typography>
					{EMAIL_PREFS.map((pref) => (
						// biome-ignore lint/a11y/noLabelWithoutControl: o Switch dentro do label é o controle
						<label
							key={pref.key}
							className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 cursor-pointer"
						>
							<div>
								<Typography variant="body2" fontWeight={500}>
									{pref.label}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									{pref.hint}
								</Typography>
							</div>
							<Switch
								checked={!!user?.[pref.key]}
								disabled={isLoading}
								onChange={(e) => toggle(pref.key, e.target.checked)}
							/>
						</label>
					))}
					<Typography variant="caption" color="text.secondary" component="p" className="pt-2">
						Os avisos sempre aparecem no sininho, mesmo com o e-mail desligado.
					</Typography>
				</section>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Fechar</Button>
			</DialogActions>
		</Dialog>
	);
}
