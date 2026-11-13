# Design System — LocX (locx-re-customer-v2)

Documentação do design system do front-end, escrita para ser lida por pessoas **e por IAs**. Quem ler estes arquivos deve conseguir recriar uma página inteira (listagem, cadastro/edição, detalhes com abas, diálogo) seguindo exatamente os padrões do código.

A rota viva `/design-system` (só em desenvolvimento e staging) mostra os componentes reais e renderiza estes mesmos arquivos.

## Índice

| Arquivo | Quando ler |
|---|---|
| [01-foundations.md](01-foundations.md) | Cores, tipografia, espaçamento, raios, alturas, breakpoints, ícones, dark mode, MUI × Tailwind |
| [02-components.md](02-components.md) | Catálogo dos componentes compartilhados (import, props, exemplo) e hooks de UI |
| [03-page-patterns.md](03-page-patterns.md) | Modelos completos de página: listagem, cadastro/edição, detalhes com abas, diálogo de formulário, tabela embutida |
| [04-conventions.md](04-conventions.md) | Estrutura de pastas, nomes, `data-cy`, textos em pt-BR, mensagens, permissões, i18n |
| [05-recipes.md](05-recipes.md) | Passo a passo para criar um CRUD novo do zero e checklist de entrega |
| [06-known-issues.md](06-known-issues.md) | Inconsistências existentes no código que **não** devem ser copiadas |

## Mapa rápido: "quero fazer X"

| Quero… | Use | Veja |
|---|---|---|
| Consumir um recurso da API | tipos + `injectEndpoints` + `tagProviders` + barrel | 03 §0 |
| Uma página nova | `PageSimple` + `PageTitle` + `PageActions` | 03 §1 |
| Uma tabela paginada | `MRTTable` + `useTableManager` | 02 §2, 03 §2 |
| Um formulário | `useForm` + `zodResolver` + `PaperForm > SectionForm > RHF*` | 02 §3, 03 §3 |
| Um diálogo com formulário | `* as Dialog` + `GridForm` + `form id` | 03 §5 |
| Confirmar exclusão | `useAskDialog().askBeforeDelete` | 02 §6 |
| Avisar sucesso/erro | `dispatch(showMessage({ message, variant }))` | 02 §6 |
| Abas sincronizadas com a URL | `Tabs`/`Tab`/`CustomTabPanel` + `useTabNavigation` | 03 §4 |
| Esconder por permissão | `useAuth().hasPermission(navId, "C"|"R"|"U"|"D")` / `withPermission` | 04 §6 |
| Ícone | `FuseSvgIcon` (`heroicons-outline:*`) ou `lucide-react` (`strokeWidth={1.5}`) | 01 §7 |

## Regras de ouro

1. **MUI é o sistema de estilo.** Cores, componentes e estados vêm do tema MUI (`palette.primary.main`, `color="error"`, `sx={{ color: "text.secondary" }}`). **Nunca** use classes Tailwind de cor de marca como `bg-primary`, `text-primary`, `border-primary`: elas não resolvem para a cor da marca neste projeto.
2. **Tailwind é para layout.** `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `col-span-*`, `w-*`, `truncate`, `rounded-*`. Combine classes com `clsx`.
3. **Use os wrappers do projeto**, não o MUI cru, quando existir: `Button` (`@/components/ui/Button/Button`), `* as Dialog` (`@/components/ui/Dialog/Dialog`), `Tabs`/`Tab`/`CustomTabPanel`, `RHF*` para campos de formulário, `MRTTable` para tabelas.
4. **Toda página** é `PageSimple` com `header` (título + ações) e `content`. O breadcrumb é global — não renderize.
5. **Todo formulário** é React Hook Form + Zod (`import { z } from "zod/v3"`), com mensagens em português.
6. **Todo texto de interface** é em português do Brasil, em *sentence case* ("Adicionar material", não "Adicionar Material").
7. **Todo elemento interativo relevante** tem `data-cy`.
8. **Código**: tabs para indentar, aspas duplas, linha de até 120 colunas, sem `any`, sem `console.*` (exceto `console.error`), identificadores em inglês. Comentários só para lógica não óbvia.

## Stack de referência

React 19 · React Router v7 · Redux Toolkit + RTK Query · MUI v6 (+ MUI X Date Pickers) · Tailwind CSS 4 · Emotion · React Hook Form · Zod (`zod/v3`) · material-react-table · i18next · Fuse (tema/layout) · lucide-react · Biome.
