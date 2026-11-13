import { InfoTip } from "@/components/ui/InfoTip";
import { useNotify } from "@/hooks/useNotify";
import { useUpdateLeadConversionsMutation } from "@/store/api/hooks";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

/** Formulários do RD que criam lead. Conversões de conteúdo só entram no histórico de quem já é lead. */
export function LeadConversionsEditor({ identifiers, canEdit }: { identifiers: string[]; canEdit: boolean }) {
	const notify = useNotify();
	const [update, { isLoading }] = useUpdateLeadConversionsMutation();
	const [value, setValue] = useState("");

	const save = async (next: string[]) => {
		try {
			await update({ identifiers: next }).unwrap();
			notify.success("Formulários atualizados");
		} catch (error) {
			notify.apiError(error);
		}
	};

	const add = () => {
		const id = value.trim().toLowerCase();
		if (!id || identifiers.includes(id)) return setValue("");
		setValue("");
		save([...identifiers, id]);
	};

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-1">
				<Typography variant="body2" fontWeight={600}>
					Formulários que criam lead
				</Typography>
				<InfoTip title="Formulários do RD que viram lead (holding). Conversões fora da lista (e-books, planilhas, calculadoras, formulários do corporativo) não criam lead: só aparecem no histórico de quem já é lead. WhatsApp (botao-wpp-holding) e demonstração (agendou_demonstracao) sempre criam lead." />
			</div>
			<div className="flex flex-wrap gap-1.5">
				{identifiers.map((id) => (
					<Chip
						key={id}
						size="small"
						label={id}
						onDelete={canEdit ? () => save(identifiers.filter((i) => i !== id)) : undefined}
						disabled={isLoading}
						sx={{ fontFamily: "monospace", fontSize: 11 }}
					/>
				))}
				{identifiers.length === 0 && (
					<Typography variant="caption" color="warning.main">
						Nenhum formulário: só demonstração e WhatsApp criam lead.
					</Typography>
				)}
			</div>
			{canEdit && (
				<div className="flex gap-2">
					<TextField
						size="small"
						placeholder="identificador-da-conversao"
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && add()}
						slotProps={{
							htmlInput: { "aria-label": "Identificador da conversão", "data-cy": "lead-conversion-input" },
						}}
					/>
					<Button variant="outlined" color="inherit" onClick={add} disabled={!value.trim()} loading={isLoading}>
						Adicionar
					</Button>
				</div>
			)}
		</div>
	);
}
