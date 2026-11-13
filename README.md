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
| Perfil do negócio | Imobiliária, Administradora de imóveis, Proprietário ou investidor, Corretor autônomo, Outro |
| Contratos de aluguel | Até 50, 51 a 200, 201 a 500, 501 a 1.000, Mais de 1.000 |
| Papel na gestão | Sócio ou diretor, Gerente, Corretor, Administrativo ou financeiro, Outro |
| Como gerencia hoje | Planilhas, Outro sistema, Papel ou manual, Ainda não administro |
| Quando pretende começar | Imediatamente, Em até 30 dias, Em até 3 meses, Só estou pesquisando |

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
- **Leads**: tabela paginada com filtros por status, etapa e responsável.
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

- Notificações (e-mail ou WhatsApp) para lead novo e trial terminando.
- Sincronizar etapa e venda de volta para o RD Station (marcar oportunidade/venda) via API do RD.
- Puxar dados de uso do produto durante o trial para um indicador de saúde do teste.
- Deploy (por exemplo, API e Postgres no Render/Railway e front-end na Vercel).
