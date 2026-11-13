import { InfoTip } from "@/components/ui/InfoTip";
import { useNotify } from "@/hooks/useNotify";
import type { RdIntegration } from "@/store/api/@types/dashboard.types";
import { useConnectRdApiMutation, useDisconnectRdApiMutation } from "@/store/api/hooks";
import { formatShortDate } from "@/utils/formatters";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { ArrowLeftRight } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router";

/** Conexão com a API do RD (app da LocX): o CRM devolve etapa, venda e perda para o funil do RD. */
export function RdApiConnection({ status, canEdit }: { status: RdIntegration["rdApi"]; canEdit: boolean }) {
	const notify = useNotify();
	const [searchParams, setSearchParams] = useSearchParams();
	const [connect, { isLoading: isConnecting }] = useConnectRdApiMutation();
	const [disconnect, { isLoading: isDisconnecting }] = useDisconnectRdApiMutation();

	useEffect(() => {
		const result = searchParams.get("rd");
		if (!result) return;
		if (result === "conectado") notify.success("RD Station conectado. O funil do RD passa a acompanhar o CRM");
		else notify.apiError(null, "Não foi possível conectar o RD Station. Tente de novo");
		searchParams.delete("rd");
		setSearchParams(searchParams, { replace: true });
	}, [searchParams, setSearchParams, notify]);

	const handleConnect = async () => {
		try {
			const { data } = await connect().unwrap();
			window.location.href = data.url;
		} catch (error) {
			notify.apiError(error);
		}
	};

	return (
		<div className="space-y-2 border-t pt-4">
			<div className="flex items-center gap-2">
				<ArrowLeftRight size={16} strokeWidth={1.75} />
				<Typography variant="body2" fontWeight={600} className="flex-1">
					Devolver o andamento para o RD
				</Typography>
				<InfoTip title="Reunião, trial e venda viram Lead Qualificado (oportunidade) no RD; Ganho vira Cliente e registra a venda com o valor; Perdido registra a perda com o motivo. O responsável vai junto quando também é usuário do RD." />
				{status.connected
					? canEdit && (
							<Button
								size="small"
								variant="outlined"
								color="inherit"
								onClick={() => disconnect()}
								loading={isDisconnecting}
							>
								Desconectar
							</Button>
						)
					: canEdit && (
							<Button
								size="small"
								onClick={handleConnect}
								loading={isConnecting}
								disabled={!status.configured}
								data-cy="connect-rd"
							>
								Conectar RD Station
							</Button>
						)}
			</div>
			<Typography variant="caption" color="text.secondary" component="p">
				{status.connected
					? `Conectado${status.connectedAt ? ` desde ${formatShortDate(status.connectedAt)}` : ""}. Cada mudança de etapa, venda ou perda atualiza o funil do contato no RD.`
					: "Com o app do RD conectado, cada mudança de etapa, venda ou perda no CRM atualiza o funil do contato no RD."}
			</Typography>
			{!status.configured && (
				<Alert severity="info">
					Para conectar, coloque o client id e o client secret do app do RD no arquivo .env da API (veja o README).
				</Alert>
			)}
		</div>
	);
}
