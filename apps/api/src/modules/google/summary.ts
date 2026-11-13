import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";

export const isAiSummaryEnabled = () => !!env.ANTHROPIC_API_KEY;

const SYSTEM = `Você resume reuniões comerciais da LocX, que vende o RE Patrimonial, um sistema de gestão de imóveis para holdings patrimoniais, family offices e pessoas físicas com imóveis.
Escreva em português do Brasil, direto e objetivo, só com o que foi dito na reunião. Não invente números, nomes ou compromissos.
Use exatamente estas seções, em texto simples (sem tabelas):
Resumo: 2 a 3 frases.
Cenário do cliente: quantidade de imóveis/contratos, como gerencia hoje, quem decide.
Dores e interesses: tópicos curtos.
Objeções e dúvidas: tópicos curtos (ou "Nenhuma").
Próximos passos combinados: tópicos com responsável e prazo quando citados.
Temperatura sugerida: Quente, Morno ou Frio, com uma frase de justificativa.`;

/** Resumo da transcrição com Claude. Devolve null se a chave não estiver configurada ou se o modelo recusar. */
export async function summarizeTranscript(
	transcript: string,
	context: { leadName: string; companyName: string | null },
) {
	if (!env.ANTHROPIC_API_KEY) return null;
	const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	try {
		const response = await client.beta.messages.create({
			model: "claude-opus-5-5",
			max_tokens: 8000,
			betas: ["server-side-fallback-2026-07-01"],
			fallbacks: "default",
			output_config: { effort: "low" },
			system: SYSTEM,
			messages: [
				{
					role: "user",
					content: `Lead: ${context.leadName}${context.companyName ? ` (${context.companyName})` : ""}\n\nTranscrição da reunião:\n${transcript}`,
				},
			],
		});
		if (response.stop_reason === "refusal") return null;
		const text = response.content
			.filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
			.map((block) => block.text)
			.join("\n")
			.trim();
		return text || null;
	} catch (error) {
		if (error instanceof Anthropic.APIError)
			console.error(`Falha ao resumir a transcrição (${error.status}):`, error.message);
		else console.error("Falha ao resumir a transcrição:", error);
		return null;
	}
}
