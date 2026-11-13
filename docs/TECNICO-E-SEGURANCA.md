# LocX CRM: arquitetura, recursos e segurança

Documento para a equipe de TI avaliar o sistema antes de colocá-lo em produção. Descreve como o CRM foi construído, o que ele precisa para rodar, com quem se comunica, que dados guarda, quais controles de segurança existem e o que ainda está pendente.

Levantamento feito em 13/11/2026 sobre o código do branch `main`.

## 1. O que é

CRM interno do time comercial (7 usuários). Recebe leads do RD Station e do Cal.com, acompanha o funil (pré-atendimento, reunião, trial, venda) e envia avisos no sistema e por e-mail. Não é exposto a clientes: só a equipe da LocX faz login.

## 2. Arquitetura

```
Navegador (SPA React)
      │  HTTPS (proxy reverso)
      ▼
┌──────────────────────────────┐        ┌───────────────────────────┐
│ API Node.js / Express        │◄──────►│ PostgreSQL                │
│ apps/api  (porta 3333)       │ Prisma │ (único armazenamento)     │
│ + agendador interno de tarefas│        └───────────────────────────┘
└──────────────────────────────┘
      │ saída HTTPS                  ▲ entrada (webhooks e retornos OAuth)
      ▼                              │
RD Station · Google · Anthropic · SMTP    RD Station · Cal.com · Google · RD (OAuth)
```

- **Front-end** (`apps/web`): aplicação React de página única. O build (`vite build`) gera arquivos estáticos (HTML, JS, CSS e imagens) que podem ser servidos por qualquer servidor web (nginx, IIS etc.). Não tem lógica no servidor.
- **API** (`apps/api`): Node.js com Express. Toda a regra de negócio, autenticação e integrações. Acessa o banco pelo ORM Prisma (consultas parametrizadas, sem SQL montado com texto do usuário).
- **Banco**: PostgreSQL. Esquema versionado em `apps/api/prisma/schema.prisma` e migrações em `apps/api/prisma/migrations`.
- **Tarefas agendadas**: rodam dentro do próprio processo da API (`src/modules/notifications/scheduler.ts`): lembretes de reunião, tarefas atrasadas, trials terminando, resumo diário às 8h e busca de transcrições do Meet a cada 10 min. Não há fila nem worker separado.

## 3. Tecnologias e versões

| Camada | Tecnologia |
| --- | --- |
| Runtime | Node.js 20 ou superior (testado no 22) |
| API | Express 5.1, Prisma 6.19 (ORM), Zod 3.25 (validação), jsonwebtoken 9 (JWT), bcryptjs 3 (hash de senha), helmet 8, cors, nodemailer 6, SDK da Anthropic |
| Front-end | React 19, Vite 6, MUI 6, Tailwind 4, Redux Toolkit / RTK Query, React Router 7, React Hook Form |
| Banco | PostgreSQL 14 ou superior (testado no 16) |
| Qualidade | TypeScript estrito nos dois projetos, Biome (lint), Vitest (29 testes de unidade na API) |

Lista completa e versões exatas: `apps/api/package.json`, `apps/web/package.json` e `package-lock.json`.

## 4. O que precisa para rodar

| Recurso | Uso |
| --- | --- |
| 1 servidor (VM ou container) com Node.js 20+ | Processo da API. Consumo pequeno: cerca de 150 a 250 MB de RAM, CPU baixa (7 usuários). |
| PostgreSQL | Banco dedicado (`crm`) com usuário próprio. Volume de dados pequeno (centenas de leads). |
| Servidor web / proxy reverso com TLS | Servir os arquivos do front-end e encaminhar `/api` para a porta 3333. Também termina o HTTPS. |
| Domínio | Ex.: `crm.locx.com.br`. Precisa ser público se os webhooks do RD/Cal.com e os retornos OAuth do Google/RD forem usados. |
| Saída HTTPS | Para os hosts da seção 6. |
| SMTP (opcional) | Envio de e-mails de aviso. |

**Instância única.** O agendador roda dentro da API; com duas instâncias os avisos e as sincronizações seriam executados em dobro. Para escalar seria preciso separar o agendador ou usar trava no banco.

### Implantação

```bash
npm ci
npm run build
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
node apps/api/dist/index.js
```

- O front-end fica em `apps/web/dist` (servir como estático, com fallback para `index.html`).
- A API lê a configuração do ambiente (ou de `apps/api/.env`). Modelo comentado em `apps/api/.env.example`.
- A API não tem arquivo de serviço pronto: precisa de um gerenciador de processo (systemd, PM2, Docker ou serviço do Windows).

## 5. Configuração (variáveis de ambiente)

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão com o PostgreSQL. Segredo. |
| `JWT_SECRET` | sim | Assina os tokens de login. Segredo. Em produção usar valor aleatório longo (64+ caracteres). |
| `RD_WEBHOOK_TOKEN` | sim | Token exigido nos webhooks do RD e do Cal.com. Segredo. |
| `WEB_ORIGIN` | sim | Origem liberada no CORS (ex.: `https://crm.locx.com.br`). |
| `PUBLIC_API_URL` | sim | URL pública da API, usada para montar os endereços de webhook e de retorno OAuth. |
| `NODE_ENV` | recomendado | `production`. |
| `CAL_WEBHOOK_SECRET` | não | Valida a assinatura HMAC dos webhooks do Cal.com. |
| `SMTP_*` | não | E-mail. Sem isso os avisos ficam só no sistema. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | não | Google Agenda, Meet e transcrições. Segredo. |
| `RD_CLIENT_ID` / `RD_CLIENT_SECRET` | não | App do RD Station (API). Segredo. |
| `ANTHROPIC_API_KEY` | não | Resumo das transcrições por IA. Segredo. |

Os arquivos `.env` estão no `.gitignore` e não vão para o repositório. A API valida as variáveis ao iniciar e não sobe se faltar alguma obrigatória.

## 6. Integrações externas

### Saída (a API chama)

| Host | Para quê | Quando |
| --- | --- | --- |
| `api.rd.services` | Autenticação do app do RD e atualização do funil (venda, perda, etapa) | Só se o app do RD estiver conectado |
| `accounts.google.com`, `oauth2.googleapis.com` | Login OAuth de cada vendedor com o Google | Só se o Google estiver configurado |
| `www.googleapis.com` | Criar eventos no Google Agenda com link do Meet | Idem |
| `meet.googleapis.com` | Ler transcrições das reuniões | Idem |
| `api.anthropic.com` | Resumir a transcrição da reunião | Só com `ANTHROPIC_API_KEY` |
| Servidor SMTP configurado | E-mails de aviso | Só com `SMTP_HOST` |

### Entrada (endpoints públicos, sem login de usuário)

| Endpoint | Proteção |
| --- | --- |
| `POST /api/integrations/rd-station/webhook` | Token compartilhado (`?token=` ou cabeçalho `x-webhook-token`), comparado em tempo constante |
| `POST /api/integrations/cal/webhook` | Mesmo token e, se configurado, assinatura HMAC-SHA256 (`x-cal-signature-256`) |
| `GET /api/integrations/google/callback` | Parâmetro `state` assinado que identifica o usuário que iniciou o OAuth |
| `GET /api/integrations/rd-station/callback` | Parâmetro `state` assinado, gerado quando um gestor inicia a conexão |
| `POST /api/auth/login` | Login |
| `GET /api/health` | Verificação de saúde (sem dados) |

Todas as outras rotas exigem login.

## 7. Dados armazenados

Tudo fica no PostgreSQL. Não há upload de arquivos nem armazenamento em disco além dos logs do processo.

| Dado | Sensibilidade |
| --- | --- |
| Leads: nome, e-mail, telefone, empresa, cidade/UF, respostas de qualificação, UTMs, notas | **Dados pessoais (LGPD)** |
| Atividades: notas de ligação/WhatsApp/e-mail, reuniões, **transcrições completas das reuniões** e resumos | **Dados pessoais e conteúdo de conversas** |
| Usuários: nome, e-mail, perfil, hash da senha (bcrypt), preferências | Interno |
| Tokens OAuth do Google (por usuário) e do RD | **Segredo**: gravados criptografados com AES-256-GCM; chave derivada do `JWT_SECRET` |
| Log dos webhooks recebidos (payload completo) | Contém dados pessoais dos leads |

Não há rotina de expiração ou exclusão automática desses dados. Backup, retenção e acesso ao banco ficam a cargo da infraestrutura.

## 8. Controles de segurança existentes

**Autenticação**
- Senhas com bcrypt (custo 10); mínimo de 8 caracteres.
- Login gera um JWT assinado (HS256) com validade de 7 dias.
- A cada requisição a API confere no banco se o usuário continua ativo: desativar alguém corta o acesso na hora.
- Usuários novos e senhas redefinidas exigem troca no primeiro acesso (aplicado na interface; ver item 9).
- Mensagem de erro de login não diz se o e-mail existe.

**Autorização**
- Dois perfis: gestor (ADMIN/MANAGER) e vendedor (SALES).
- Excluir lead, gerenciar usuários e alterar integrações são ações restritas a gestores, verificadas na API (não só na tela).
- Todos os usuários logados veem todos os leads (decisão de negócio).

**Entrada e saída**
- Todo corpo e parâmetro de requisição é validado com Zod antes de chegar à regra de negócio; tamanho do corpo limitado a 1 MB.
- Acesso ao banco só pelo Prisma (consultas parametrizadas).
- O front-end usa React, que escapa o conteúdo; não há `dangerouslySetInnerHTML`. Os e-mails escapam o HTML do conteúdo dinâmico.
- Erros não devolvem stack trace ao cliente.

**HTTP**
- `helmet` com os cabeçalhos padrão (inclui CSP básica, `X-Content-Type-Options`, `Referrer-Policy`, HSTS); `X-Powered-By` desativado.
- CORS restrito à origem configurada em `WEB_ORIGIN`.

**Integrações**
- Webhooks protegidos por token comparado em tempo constante; Cal.com com HMAC opcional.
- Tokens OAuth criptografados no banco.
- Segredos só em variáveis de ambiente; nada sensível no repositório.

## 9. Pontos de atenção conhecidos

Itens que identificamos e que devem ser tratados ou aceitos antes da produção.

| # | Ponto | Risco | Sugestão |
| --- | --- | --- | --- |
| 1 | **Login sem limite de tentativas** nem bloqueio temporário | Força bruta de senha | Limitar tentativas por IP e por e-mail (ex.: 5 por 15 min) na API ou no proxy |
| 2 | **Token de login guardado no `localStorage`** do navegador | Se houver uma falha de XSS, o token pode ser lido | Migrar para cookie `HttpOnly` + `SameSite` (exige proteção CSRF) ou reduzir a validade do token |
| 3 | Token JWT de 7 dias sem revogação individual | Token vazado vale até expirar (a menos que o usuário seja desativado) | Validade menor, ou versão de sessão no usuário para invalidar ao trocar a senha |
| 4 | **Troca de senha obrigatória só na interface** | Pela API dá para seguir usando a senha inicial | Bloquear na API as rotas (exceto trocar senha) enquanto `mustChangePassword` for verdadeiro |
| 5 | Senha inicial padrão conhecida (`locx@2026`) para usuários novos/redefinidos | Conta recém-criada ou redefinida fica exposta até a troca | Gerar senha aleatória por usuário, ou link de definição de senha |
| 6 | Token do webhook vai na URL (`?token=`) | Pode aparecer em logs do proxy e do próprio Express (`morgan`) | Mascarar a query string nos logs ou usar só o cabeçalho |
| 7 | Log de webhooks guarda o payload completo, sem prazo | Dados pessoais acumulados | Definir retenção (ex.: 90 dias) |
| 8 | Transcrições de reunião enviadas à Anthropic para resumo | Tratamento de dados por terceiro (LGPD) | Avaliar contrato/política ou deixar `ANTHROPIC_API_KEY` vazia para desligar |
| 9 | Chave de criptografia dos tokens derivada do `JWT_SECRET` | Trocar o `JWT_SECRET` invalida as conexões Google/RD; mesma chave para duas finalidades | Variável própria para a chave de criptografia |
| 10 | Sem auditoria de acesso (quem viu o quê) | Investigação de incidente limitada | Registrar logins e ações administrativas |
| 11 | `morgan` em formato de desenvolvimento em todos os ambientes | Log pouco estruturado | Formato `combined`/JSON em produção |

### Dependências com alertas conhecidos

Resultado de `npm audit --omit=dev` (só dependências que vão para produção): 8 alertas (6 altos, 1 moderado, 1 baixo).

| Pacote | Alerta | Impacto aqui | Correção |
| --- | --- | --- | --- |
| `react-router` 7.6 | Vários (XSS, redirecionamento aberto, DoS) | A maioria afeta só renderização no servidor (SSR), que não usamos; os de redirecionamento se aplicam | Atualizar para 7.18.5+ (mesma versão maior) |
| `nodemailer` 6.10 | Injeção de comandos SMTP, envio a domínio errado | Os destinatários são só usuários internos, mas o conteúdo inclui texto de leads | Atualizar para 10.x (versão maior; testar envio) |
| `morgan` 1.10 / `on-headers` | Forja de linhas de log | Baixo | Atualizar para 1.12.1 |
| `zod` 3.25 | Consumo de memória com coleções grandes | Corpo já limitado a 1 MB | Atualizar para 4.x (versão maior; exige ajustes) |
| `prisma` / `@prisma/config` 6.19 (`deepmerge-ts`) | Estouro de pilha | Só na leitura de configuração da ferramenta, não em requisições | Atualizar para 7.x (versão maior) |

Ferramentas de desenvolvimento (Vite, Biome etc.) têm outros 4 alertas que não vão para produção.

## 10. Recomendações para o ambiente de produção

1. Servir só por **HTTPS**, com o proxy reverso redirecionando HTTP.
2. API escutando apenas em `localhost` ou rede interna; só o proxy exposto.
3. PostgreSQL sem acesso externo, com usuário exclusivo do CRM e senha forte.
4. Gerar `JWT_SECRET` e `RD_WEBHOOK_TOKEN` aleatórios e longos; guardar fora do servidor (cofre de senhas).
5. Backup diário do banco, com teste de restauração.
6. Se a rede permitir, liberar saída só para os hosts da seção 6.
7. Limitar tentativas de login no proxy enquanto o item 1 da seção 9 não estiver na API.
8. Atualizar as dependências da seção 9 e rodar `npm audit` a cada atualização.

## 11. Como reproduzir a análise

```bash
npm ci
npm audit --omit=dev
npm run lint
npm test
npm run build
```

Sugestões de ferramentas para a análise do TI: `npm audit` (dependências), Semgrep ou SonarQube (análise estática do código), OWASP ZAP (teste dinâmico contra uma instância de homologação).

Pontos de entrada para revisão do código:
- `apps/api/src/app.ts`: montagem da API, middlewares e rotas públicas e protegidas
- `apps/api/src/middlewares/auth.ts` e `apps/api/src/lib/auth.ts`: autenticação
- `apps/api/src/modules/*/*.routes.ts`: rotas e permissões
- `apps/api/src/modules/integrations/integrations.routes.ts`: webhooks
- `apps/api/src/lib/crypto.ts`: criptografia dos tokens OAuth
- `apps/api/prisma/schema.prisma`: modelo de dados
