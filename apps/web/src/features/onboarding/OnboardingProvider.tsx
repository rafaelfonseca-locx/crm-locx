import { Dialog, DialogActions, DialogContent, DialogTitle } from "@/components/ui/Dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotify } from "@/hooks/useNotify";
import { getApiErrorMessage } from "@/store/api/apiService";
import { useUpdateMeMutation } from "@/store/api/hooks";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MobileStepper from "@mui/material/MobileStepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { FlaskConical, Inbox, KanbanSquare, Keyboard, type LucideIcon, MessagesSquare, Sparkles } from "lucide-react";
import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

type Step = { icon: LucideIcon; title: string; body: ReactNode };

const STEPS: Step[] = [
	{
		icon: Sparkles,
		title: "Bem-vindo(a) ao LocX CRM",
		body: (
			<>
				<p>Aqui fica todo o caminho do lead: da chegada até a venda.</p>
				<p>
					O funil tem 5 etapas: <b>Novo lead → Pré-atendimento → Reunião → Trial → Venda</b>. Em 1 minuto você vê como
					usar.
				</p>
			</>
		),
	},
	{
		icon: Inbox,
		title: "Como os leads chegam",
		body: (
			<>
				<p>
					<b>Formulário do site e do WhatsApp</b> (RD Station): o lead entra em <b>Novo lead</b> e precisa de
					pré-atendimento.
				</p>
				<p>
					<b>Agendamento de demonstração</b> (Cal.com): o lead já entra em <b>Reunião</b>, com data, horário e link.
				</p>
				<p>
					Os leads são distribuídos em rodízio entre os vendedores, com uma tarefa de primeiro contato em até 1 hora.
				</p>
			</>
		),
	},
	{
		icon: KanbanSquare,
		title: "Pipeline",
		body: (
			<>
				<p>
					<b>Arraste os cards</b> entre as etapas. Ao arrastar, aparecem as áreas <b>Ganho</b> e <b>Perdido</b> no
					rodapé.
				</p>
				<p>
					O ícone de relógio no card mostra o próximo passo: <b>verde</b> agendado, <b>vermelho</b> atrasado e{" "}
					<b>laranja</b> sem próximo passo. Lead sem próximo passo é lead esquecido.
				</p>
				<p>
					Use <b>Meus leads</b> para ver só os seus, como responsável ou participante.
				</p>
			</>
		),
	},
	{
		icon: MessagesSquare,
		title: "Dentro do lead",
		body: (
			<>
				<p>Registre cada ligação, WhatsApp, e-mail ou nota. O histórico fica visível para todo o time.</p>
				<p>
					Sempre deixe uma <b>tarefa</b> ou <b>reunião</b> como próximo passo.
				</p>
				<p>
					Em <b>Equipe no processo</b>, adicione outras pessoas ao lead: SDR, closer, onboarding ou apoio técnico.
				</p>
			</>
		),
	},
	{
		icon: FlaskConical,
		title: "Trial de 5 a 7 dias",
		body: (
			<>
				<p>Ao mover o lead para Trial, o CRM cria um roteiro: kickoff, check-in, acompanhamento, proposta e decisão.</p>
				<p>
					O card mostra o dia do teste e avisa quando o prazo está acabando. No fim, converta em venda, estenda ou
					encerre.
				</p>
			</>
		),
	},
	{
		icon: Keyboard,
		title: "Atalhos e ajuda",
		body: (
			<>
				<p>
					<b>Ctrl + K</b> abre a busca: encontre qualquer lead por nome, empresa, e-mail, telefone ou #id.
				</p>
				<p>
					A <b>Agenda</b> junta suas tarefas e reuniões atrasadas, de hoje e próximas.
				</p>
				<p>
					Passe o mouse nos ícones <b>ⓘ</b> para ver o que cada item significa. Este guia fica em <b>Guia de uso</b>, na
					barra lateral.
				</p>
			</>
		),
	},
];

function ChangePasswordDialog({ open }: { open: boolean }) {
	const notify = useNotify();
	const [updateMe, { isLoading }] = useUpdateMeMutation();
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleSave = async () => {
		if (next.length < 8) return setError("A nova senha deve ter pelo menos 8 caracteres");
		if (next !== confirm) return setError("As senhas não conferem");
		try {
			await updateMe({ currentPassword: current, newPassword: next }).unwrap();
			notify.success("Senha alterada com sucesso");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<Dialog open={open} maxWidth="xs" data-cy="change-password-dialog">
			<DialogTitle subtitle="É o seu primeiro acesso. Crie uma senha só sua para continuar.">
				Crie sua senha
			</DialogTitle>
			<DialogContent>
				<form
					id="change-password-form"
					className="space-y-3"
					onSubmit={(e) => {
						e.preventDefault();
						handleSave();
					}}
				>
					{error && <Alert severity="error">{error}</Alert>}
					<TextField
						label="Senha atual (a que você recebeu)"
						type="password"
						value={current}
						onChange={(e) => setCurrent(e.target.value)}
						autoFocus
						autoComplete="current-password"
					/>
					<TextField
						label="Nova senha"
						type="password"
						value={next}
						onChange={(e) => setNext(e.target.value)}
						helperText="Mínimo de 8 caracteres"
						autoComplete="new-password"
					/>
					<TextField
						label="Confirme a nova senha"
						type="password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						autoComplete="new-password"
					/>
				</form>
			</DialogContent>
			<DialogActions>
				<Button
					type="submit"
					form="change-password-form"
					loading={isLoading}
					disabled={!current || !next || !confirm}
					data-cy="save-password"
				>
					Salvar senha
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function GuideDialog({ open, onClose, firstName }: { open: boolean; onClose: () => void; firstName: string }) {
	const [step, setStep] = useState(0);
	useEffect(() => {
		if (open) setStep(0);
	}, [open]);
	const current = STEPS[step];
	const Icon = current.icon;
	const isLast = step === STEPS.length - 1;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" data-cy="guide-dialog">
			<DialogContent className="!border-0 !pt-8">
				<div className="flex flex-col items-center text-center gap-4 px-2 min-h-[300px]">
					<Box
						className="flex items-center justify-center w-14 h-14 rounded-2xl"
						sx={{ bgcolor: "rgba(255,204,0,0.22)" }}
					>
						<Icon size={26} strokeWidth={1.75} />
					</Box>
					<Typography component="h2" className="text-xl font-bold">
						{step === 0 ? `Olá, ${firstName}!` : current.title}
					</Typography>
					{step === 0 && (
						<Typography variant="subtitle2" color="text.secondary" className="-mt-2">
							{current.title}
						</Typography>
					)}
					<Box
						className="space-y-2.5 text-[14px] leading-relaxed max-w-md"
						sx={{ color: "text.secondary", "& b": { color: "text.primary" } }}
					>
						{current.body}
					</Box>
				</div>
			</DialogContent>
			<DialogActions className="!justify-between">
				<MobileStepper
					variant="dots"
					steps={STEPS.length}
					position="static"
					activeStep={step}
					backButton={null}
					nextButton={null}
					sx={{ bgcolor: "transparent", p: 0 }}
				/>
				<div className="flex gap-2">
					{step > 0 ? (
						<Button variant="outlined" color="inherit" onClick={() => setStep((s) => s - 1)}>
							Voltar
						</Button>
					) : (
						<Button variant="text" color="inherit" onClick={onClose}>
							Pular
						</Button>
					)}
					<Button onClick={() => (isLast ? onClose() : setStep((s) => s + 1))} data-cy="guide-next">
						{isLast ? "Começar" : "Próximo"}
					</Button>
				</div>
			</DialogActions>
		</Dialog>
	);
}

const OnboardingContext = createContext<{ openGuide: () => void } | null>(null);

/** Primeiro acesso: troca da senha inicial e guia de uso (que pode ser reaberto pela barra lateral). */
export function OnboardingProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const [updateMe] = useUpdateMeMutation();
	const [isGuideOpen, setIsGuideOpen] = useState(false);
	const mustChangePassword = !!user?.mustChangePassword;

	useEffect(() => {
		if (user && !user.mustChangePassword && !user.onboardedAt) setIsGuideOpen(true);
	}, [user]);

	const handleCloseGuide = () => {
		setIsGuideOpen(false);
		if (user && !user.onboardedAt) updateMe({ onboarded: true });
	};

	const value = useMemo(() => ({ openGuide: () => setIsGuideOpen(true) }), []);

	return (
		<OnboardingContext.Provider value={value}>
			{children}
			<ChangePasswordDialog open={mustChangePassword} />
			<GuideDialog
				open={isGuideOpen && !mustChangePassword}
				onClose={handleCloseGuide}
				firstName={user?.name.split(" ")[0] ?? ""}
			/>
		</OnboardingContext.Provider>
	);
}

export function useOnboarding() {
	const ctx = useContext(OnboardingContext);
	if (!ctx) throw new Error("useOnboarding precisa estar dentro de OnboardingProvider");
	return ctx;
}
