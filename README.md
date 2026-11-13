# LocX CRM

CRM comercial da LocX para acompanhar cada lead **do RD Station até a venda**, passando por pré-atendimento (SDR), reunião e trial de 5 a 7 dias. Qualquer comercial pode conduzir o lead de ponta a ponta e **adicionar outras pessoas ao processo** (SDR, closer, onboarding, apoio técnico).

## Funil

## Canais de entrada

| Canal | De onde vem | Onde entra |
|---|---|---|
| **Agendamento de demonstração** | Formulário completo + Cal.com | **Reunião**, com data, horário, link e o vendedor da agenda como responsável |
| **Formulário do WhatsApp** | RD Station | **Novo lead**, com a tarefa "Fazer o pré-atendimento pelo WhatsApp" em 1 hora |
| **Formulário do site** | RD Station | **Novo lead**, com a tarefa "Fazer o primeiro contato" em 1 hora |
| **Manual** | Cadastro pelo time (indicação, evento, prospecção) | Etapa escolhida |

### Perguntas padronizadas

- **WhatsApp e site (curto):** nome completo, e-mail corporativo, WhatsApp, perfil do negócio e quantos contratos de aluguel administra.
- **Agendamento (completo):** as do curto + estado, papel na gestão dos imóveis, como gerencia hoje e quando pretende começar.

Opções sugeridas (as mesmas no CRM, no RD e no Cal.com):

| Pergunta | Opções |
|---|---|
| Perfil do negócio (`cf_qual_melhor_descreve_sua_estrutura_hoje`) | Pessoa física com imóveis próprios, Holding patrimonial familiar, Family office, Empresa com imóveis para renda, Administradora/consultoria patrimonial, Outro |
| Imóveis/contratos administrados (`cf_qtd_contratos`) | 1 a 5, 6 a 25, 26 a 50, 51 a 100, Mais de 100 |
| Papel na gestão (`cf_papel_gestao`) | Sócio ou diretor, Gestor do patrimônio, Financeiro ou administrativo, Consultor ou assessor, Outro |
| Já usa sistema de gestão? (`cf_ja_usa_sistema_de_gestao`) | Não, uso planilha; Sim, outro sistema; Não gerencio ainda |
| Quando pretende começar (`cf_intencao`) | Imediatamente, Em até 30 dias, Em até 3 meses, Só estou pesquisando |

O CRM reconhece as perguntas pelo nome do campo (ex.: `cf_quantos_contratos` ou "Quantos imóveis você gerencia?"), então não precisa de nomes exatos. "Quando pretende começar" define a temperatura: até 30 dias = quente, até 3 meses = morno, pesquisando = frio.

## Planos

| Plano | Mensal | Anual (por mês) |
|---|---|---|
| Basic | R$ 490 | R$ 392 |
| Pro | R$ 1.215 | R$ 972 |
| Premium | R$ 2.400 | R$ 1.920 |
| Enterprise | Sob consulta | Sob consulta |

Escolher plano e ciclo preenche o valor mensal sozinho (dá para ajustar em caso de desconto). Os preços ficam em `apps/web/src/features/leads/constants/index.ts`.

## Etapas

| Etapa | O que acontece |
|---|---|
| **Novo lead** | Chega pelo RD Station (ou cadastro manual), é distribuído em rodízio e ganha a tarefa de primeiro contato com prazo de 1 hora |
| **Pré-atendimento** | SDR qualifica. Registrar a primeira ligação, WhatsApp ou e-mail move o lead para cá automaticamente |
| **Reunião** | Mover para esta etapa abre o agendamento (data, link, quem conduz) |
| **Trial** | Mover para esta etapa abre o início do trial (5, 6 ou 7 dias). O CRM cria um roteiro de acompanhamento: D0 kickoff, D1 check-in, meio do teste, véspera (proposta) e dia final (decisão) |
| **Venda** | Negociação. Fechar como **Ganho** (valor mensal + plano) ou **Perdido** (motivo obrigatório) |

## Telas

- **Início**: atividades atrasadas e do dia, trials terminando, KPIs (novos leads, reuniões, trials, vendas, MRR novo, taxa de ganho, ciclo médio), funil de conversão, pipeline atual, leads por dia, origens, desempenho por comercial e motivos de perda. Filtro por período e por comercial.
- **Pipeline**: Kanban com arrastar e soltar. Ao arrastar aparecem as áreas **Ganho** e **Perdido**. Cards mostram valor, temperatura, próximo passo (atrasado em vermelho, "sem próximo passo" em laranja), dias na etapa, responsável e participantes, e o progresso do trial. Filtros: Todos/Meus leads, responsável, origem, temperatura e busca.
- **Leads**: tabela paginada com abas Em aberto, Ganhos, Perdidos e Todos. Em **Ganhos** aparecem **Fechado por**, data e plano; em **Perdidos**, motivo e data.
- **Parceiros**: quem vende por nós (não compra). Ficam fora do pipeline, do funil e das vendas; cada parceiro mostra as indicações, quantas viraram venda e a receita gerada.
- **Detalhe do lead**: trilha de etapas clicável, registro rápido (nota, ligação, WhatsApp, e-mail, tarefa, reunião), próximos passos, linha do tempo, painel do trial (prazo, roteiro com checklist, estender, encerrar, converter), histórico de etapas com tempo em cada uma, equipe no processo, contato (com atalho para WhatsApp), empresa, oportunidade e origem (UTMs e conversão do RD).
- **Trials**: cards com dia atual, dias restantes, progresso do roteiro e próxima ação.
- **Agenda**: tarefas e reuniões atrasadas, de hoje e próximas, minhas ou da equipe.
- **Equipe**: pessoas, perfis, quem participa do rodízio de leads e números de cada um.
- **Integrações**: URL do webhook do RD, envio de lead de teste, modo de distribuição (rodízio ou fila sem responsável) e log dos eventos recebidos.

Atalhos: `Ctrl/⌘ + K` abre a busca global (nome, empresa, e-mail, telefone ou `#id`). Tema claro e escuro no topo.

## Permissões

| Perfil | Pode |
|---|---|
| Vendedor | Ver todo o pipeline (com filtro "Meus leads" = responsável ou participante), criar e editar leads, registrar atividades, conduzir trials, assumir leads sem dono |
| Gestor | Tudo do vendedor + excluir leads, gerenciar a equipe, configurar a distribuição e ver a URL do webhook |
| Administrador | Tudo do gestor + criar outros administradores |

## Arquitetura

Detalhes técnicos, recursos necessários e análise de segurança para o TI: [docs/TECNICO-E-SEGURANCA.md](docs/TECNICO-E-SEGURANCA.md).

```
apps/
├── api/   Node 22 + Express 5 + TypeScript + Prisma + PostgreSQL + Zod (autenticação JWT)
└── web/   React 19 + Vite + MUI 6 + Tailwind 4 + RTK Query + React Hook Form + Zod
docs/design-system/   Design system LocX (base visual do front-end)
```

O front-end segue o design system LocX (`docs/design-system`): MUI como sistema de estilo (amarelo `#FFCC00` e marrom `#3A271A`, Inter 13px, raios e alturas do DS), Tailwind só para layout, textos em português em *sentence case*, `data-cy` nos elementos interativos. Da referência [Red Hat UX](https://ux.redhat.com/) vieram a navegação vertical com seções, a densidade de informação em cards, status sempre com ícone e texto (nunca só cor), foco visível e o link "Pular para o conteúdo".

As cores das etapas usam uma paleta categórica validada para daltonismo e sempre aparecem junto do nome da etapa.

## Como rodar

Pré-requisitos: Node 20+ e PostgreSQL 16 (ou Docker).

```bash
docker compose up -d
```

```bash
npm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

No Windows (PowerShell):

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

```bash
npm run db:migrate && npm run db:seed
```

```bash
npm run dev
```

- Front-end: http://localhost:5173
- API: http://localhost:3333/api

O seed cadastra o time (gestores: Douglas, Rafael e Isabela; vendedores no rodízio: Cristian, Guilherme, Maria Teresa e Pedro Henrique), com foto, e cria 42 leads de exemplo. A senha inicial de todos é `locx@2026`: **no primeiro acesso cada pessoa é obrigada a criar a própria senha** e vê o guia de uso.

Rodar o seed de novo não duplica nada: ele atualiza o time e só cria leads de exemplo se o banco estiver vazio.

Para começar a usar de verdade, apague os leads de exemplo (o time é mantido):

```bash
npm run db:clear
```

Testes da API:

```bash
npm test
```

### Esqueci a senha

Volta a senha para `locx@2026` (a pessoa troca no próximo acesso). Sem e-mail, lista os usuários do banco:

```bash
npm run db:reset-password -- rafael.fonseca@locx.com.br
```

## Importar a base atual (Handoff RE Patrimonial)

Importa os leads do arquivo de handoff (o HTML com o histórico comercial) com etapa, histórico, notas, reuniões, trials, plano, temperatura e motivo de perda:

```bash
npm run db:clear
```

```bash
npm run db:import -- "C:\caminho\para\Handoff_RE_Patrimonial.html"
```

- `db:clear` apaga os leads de exemplo do seed (o time é mantido). Pule se já tiver leads reais.
- Rodar a importação de novo não duplica: leads já importados ou com o mesmo e-mail são pulados.
- Responsáveis que não estão no time entram **sem responsável** (o nome original fica no histórico); Douglas e Isabela mantêm os deles.
- Pausados entram como **perdidos, motivo "Pausado"** (dá para reabrir).
- Quem a planilha descreve como parceiro (ex.: "atuará como um parceiro", caso da Gow Capital) entra como **parceiro**. Rodar a importação de novo numa base já importada marca esses leads como parceiros.
- **O arquivo tem dados pessoais: não coloque no repositório.**

## Parceiros

Parceiro é quem vende o RE Patrimonial por nós e indica clientes. Não é venda: fica fora do pipeline, do funil, dos números do Início e não é enviado ao funil do RD.

- Para cadastrar: abra o lead e use **⋯ › Marcar como parceiro** (para desfazer, **Voltar para o funil**).
- Na página do parceiro, **Nova indicação** cadastra um cliente já com **Indicado por** preenchido e origem "Parceiro".
- Em qualquer lead dá para escolher o parceiro em **Editar › Indicado por**. O card no pipeline mostra "via Parceiro".

## Notificações

- **No sistema:** sininho na barra lateral (lead novo ou transferido, pessoa adicionada ao processo, tarefa delegada, reunião em 15 minutos, tarefa atrasada, trial terminando, agendamentos do Cal.com e transcrição pronta). Dá para ativar o alerta do navegador.
- **Por e-mail:** lead novo para mim, agendamentos do Cal.com e resumo diário às 8h. Cada pessoa escolhe em **Preferências** (menu do usuário).
- Para enviar e-mails, preencha `SMTP_*` no `.env` da API. Funciona com o relay SMTP do Google Workspace (configurado pelo administrador em *Apps › Google Workspace › Gmail › Roteamento › Serviço de relay SMTP*), com o Resend ou com o servidor de e-mail da empresa.

## Google Agenda, Meet e transcrições

Com o Google conectado, **agendar reunião no CRM cria o evento na agenda de quem conduz, com link do Meet e o lead como convidado**. Remarcar ou excluir no CRM atualiza o Google. Depois da reunião, o CRM busca a **transcrição do Meet** (a cada 10 minutos, por até 3 dias) e, com a chave da Anthropic, gera um **resumo** (cenário, dores, objeções, próximos passos e temperatura sugerida) na linha do tempo do lead. Reuniões do Cal.com com link do Meet também ganham transcrição.

Configuração (uma vez, por quem administra o Google Workspace):

1. Em https://console.cloud.google.com crie um projeto (ex.: "LocX CRM").
2. Em **APIs e serviços › Biblioteca**, ative **Google Calendar API** e **Google Meet REST API**.
3. Em **Tela de consentimento OAuth**, escolha **Interno** (só contas `@locx.com.br`).
4. Em **Credenciais › Criar credenciais › ID do cliente OAuth › Aplicativo da Web**, adicione o URI de redirecionamento `http://localhost:3333/api/integrations/google/callback` (e depois o do servidor da empresa).
5. Copie o ID e a chave secreta para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env` da API e reinicie.
6. Cada pessoa clica em **Preferências › Google Agenda e Meet › Conectar**.

Requisitos: a transcrição do Meet existe nos planos Business Standard ou superior e precisa estar ligada na reunião (ou automática nas configurações do Workspace). Para o resumo por IA, coloque `ANTHROPIC_API_KEY` no `.env` (modelo `claude-opus-5-5`).

## RD Station pela API (app da LocX)

Além do webhook (RD → CRM), o CRM devolve o andamento para o RD (CRM → RD):

| No CRM | No RD |
|---|---|
| Novo lead, Pré-atendimento | Lead |
| Reunião, Trial, Venda (em aberto) | Lead Qualificado, marcado como oportunidade |
| Ganho | Cliente + venda registrada com o valor |
| Perdido | Oportunidade perdida, com o motivo |

1. No app do RD Station App Store, cadastre a URL de retorno `http://localhost:3333/api/integrations/rd-station/callback` (e depois a do servidor).
2. Coloque `RD_CLIENT_ID` e `RD_CLIENT_SECRET` no `.env` da API e reinicie.
3. Em **Integrações › RD Station**, um gestor clica em **Conectar RD Station**.

Cada sincronização aparece em **Eventos recebidos** como "CRM → RD".

## Conectar o Cal.com

1. No CRM, como gestor, abra **Integrações** e copie a URL do webhook do Cal.com.
2. No Cal.com: **Settings › Developer › Webhooks › New**. Cole a URL em *Subscriber URL* e marque **Booking Created**, **Booking Rescheduled** e **Booking Cancelled**.
3. O e-mail de quem atende no Cal.com deve ser o mesmo cadastrado no CRM, para a reunião ir para a pessoa certa.
4. Opcional: defina um *Secret* no webhook e coloque o mesmo valor em `CAL_WEBHOOK_SECRET` no `.env` da API.

Remarcar atualiza a data da reunião. Cancelar marca a reunião como cancelada e cria a tarefa "Reagendar a demonstração cancelada".

## Conectar o RD Station

1. Defina `RD_WEBHOOK_TOKEN` (um valor longo e aleatório) e `PUBLIC_API_URL` (URL pública da API) no `.env` da API.
2. No CRM, entre como gestor e abra **Integrações**. Copie a URL do webhook (ela já contém o token).
3. No RD Station Marketing: **Conta › Integrações › Webhooks** → novo webhook com gatilho **Conversão** → cole a URL.
4. Clique em **Enviar lead de teste** no CRM para conferir o fluxo sem depender do RD.

Comportamento:

- Lead novo → criado em **Novo lead**, com origem "RD Station", UTMs, identificador da conversão e tags; distribuído para o comercial que recebeu lead há mais tempo (apenas quem está com "Recebe leads" ligado em Equipe).
- Lead que já existe (mesmo id do RD ou mesmo e-mail) → a conversão é registrada na linha do tempo, sem duplicar.
- Lead **perdido** que converte de novo → é reaberto em Novo lead.
- O mapeamento aceita o formato padrão do webhook (`{ "leads": [...] }`) e variações (lead único, campos achatados vindos de n8n/Zapier). Campos personalizados com "tamanho/funcionários" e "segmento/setor" preenchem empresa automaticamente.

## API

Todas as rotas (exceto login, health e webhook) exigem `Authorization: Bearer <token>`. Resposta padrão: `{ success, data, count? }`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login |
| GET | `/api/leads` | Lista (`status`, `stage`, `ownerId`, `mine`, `source`, `temperature`, `search`, `skip`, `take`, `orderByColumn`, `orderByAsc`) |
| POST | `/api/leads` | Cria lead |
| GET/PATCH/DELETE | `/api/leads/:id` | Detalhe, edição, exclusão (gestão) |
| POST | `/api/leads/:id/stage` · `/win` · `/lose` · `/reopen` · `/claim` · `/transfer` | Mudanças de etapa e status |
| POST/DELETE | `/api/leads/:id/participants[/:userId]` | Pessoas no processo |
| GET/POST | `/api/leads/:id/activities` | Linha do tempo e novos registros |
| PATCH/DELETE | `/api/activities/:id` | Concluir, editar, excluir |
| GET | `/api/activities` | Agenda (`scope`, `types`, `status`) |
| POST | `/api/leads/:id/trial` | Inicia trial (5 a 7 dias) |
| GET/PATCH | `/api/trials`, `/api/trials/:id` | Lista, estende, encerra |
| POST/PATCH/DELETE | `/api/trials/:id/checklist[/:itemId]` | Roteiro do trial |
| GET | `/api/dashboard?days=30&ownerId=` | Indicadores |
| GET/POST/PATCH | `/api/users` | Equipe |
| POST | `/api/integrations/rd-station/webhook?token=` | Webhook público do RD |

## Próximos passos sugeridos

- Publicar no servidor da empresa (API Node + PostgreSQL + front estático) e trocar as URLs de retorno do Google e do RD.
- Avisos pelo WhatsApp (ex.: lead novo para o vendedor).
- Puxar dados de uso da conta de teste durante o trial para um indicador de saúde.
