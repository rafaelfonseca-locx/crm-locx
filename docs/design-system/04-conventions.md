# 04 — Convenções

**Quando ler:** ao nomear arquivos, hooks, `data-cy`, escrever textos de interface, mensagens ou checagens de permissão.

## 1. Estrutura de pastas

```
src/
├── pages/(control-panel)/<modulo>/…      ← rotas protegidas: *PageRoute.tsx, *Page.tsx, i18n/
├── pages/(public)/…                       ← rotas públicas
├── features/<dominio>/<entidade>/
│   ├── components/
│   │   ├── <Entidade>List/               ← listagem
│   │   │   ├── index.tsx
│   │   │   ├── hooks/ use<Entidade>Table.tsx, use<Entidade>TableColumns.ts,
│   │   │   │          use<Entidade>TableManager.ts, use<Entidade>Operations.ts,
│   │   │   │          use<Entidade>FilterManager.ts, use<Entidade>Filter.ts
│   │   │   ├── models/ TableModel.ts, FilterModel.ts
│   │   │   └── schema/ validationSchema.ts
│   │   └── Form/                          ← cadastro/edição
│   │       ├── <Entidade>RegistrationForm.tsx, <Entidade>EditingForm.tsx, <Entidade>FormSkeleton.tsx
│   │       ├── components/ <Entidade>FormFields.tsx
│   │       ├── hooks/ use<Entidade>RegistrationForm.ts, use<Entidade>EditingForm.ts,
│   │       │          useSubmit<Entidade>RegistrationForm.ts, useSubmit<Entidade>EditingForm.ts
│   │       ├── models/ FormModel.ts, ApiModel.ts
│   │       └── schema/ validationSchema.ts (+ .test.ts)
│   ├── hooks/                             ← hooks do domínio
│   ├── constants/
│   └── @types/
├── store/api/
│   ├── endpoints/<recurso>.endpoints.ts   ← um arquivo por recurso
│   ├── @types/<recurso>.types.ts
│   ├── hooks/index.ts                     ← barrel: import { useXQuery } from "@/store/api/hooks"
│   └── tagProviders.ts
├── components/                            ← compartilhados (layout, form, ui, data-display, feedback)
└── hooks/                                 ← hooks globais
```

- Componente com lógica: pasta própria com `index.tsx` + `hooks/` + `models/` + `schema/`.
- Tipos em arquivos `.types.ts`.
- Testes ao lado do arquivo testado (`<nome>.test.ts`), descrições em pt-BR.

## 2. Nomes

| Coisa | Padrão | Exemplo |
|---|---|---|
| Página | `<Entidade><Ação>Page` | `MaintenanceSLAListingPage`, `…RegistrationPage`, `…EditingPage`, `…DetailsPage` |
| Rota | `<Modulo>PageRoute`, um por módulo de rota, agrupando as entidades em `children` | `MaintenancePageRoute` (categorias, SLAs…) |
| Hook de tabela | `use<Entidade>Table`, `…TableColumns`, `…TableManager` | `useMaintenanceSLATable` |
| Operações | `use<Entidade>Operations` | `handleDelete<Entidade>`, `handleEdit<Entidade>`, `isDeleting<Entidade>` |
| Formulário | `use<Entidade>RegistrationForm`, `use<Entidade>EditingForm`, `useSubmit…` | — |
| Models | `TableModel`, `FormModel`, `ApiModelCreate<Entidade>`, `ApiModelUpdate<Entidade>` | — |
| Schema | `<entidade>ValidationSchema` + `type <Entidade>ValidationSchema` | `maintenanceCategoryValidationSchema` |
| Store da tabela | `"<entidade>TableManager"` | `"maintenanceSLATableManager"` |
| Diálogo | `<Algo>Dialog`, id de form `"<algo>-form"`, id de contexto `<ALGO>_DIALOG_ID` | `MaterialFormDialog`, `"maintenance-material-form"` |
| Handlers | `handle<Ação>` | `handleSave`, `handleClose`, `handleAddMaterial` |
| Booleanos | `is…`, `can…`, `has…` | `isSaving`, `canEdit`, `hasValidId` |
| Endpoints RTK | `get<Recursos>`, `get<Recurso>ById`, `create…`, `update…`, `delete…` | `useGetMaintenanceCategoriesQuery` |

## 3. `data-cy`

| Elemento | Padrão | Exemplo |
|---|---|---|
| Campo de formulário de página | nome do campo | `data-cy="name"`, `data-cy="isActive"` |
| Botão de cadastro do cabeçalho | `button-register-<entidades>` | `button-register-maintenance-slas` |
| Campo/botão de diálogo | `<entidade>-<coisa>` | `material-item`, `save-material` |
| Diálogo | `<entidade>-<algo>-dialog` | `material-form-dialog` |
| Aba | `tab-<nome>` | `tab-purchases` |
| Ação de linha | `<entidade>-action-<chave>-<id>` (entidade no singular, kebab-case) | `material-action-edit-12` |
| Salvar de formulário de página | `save-<entidade>` | `save-supplier` |
| Bloco/seção | `<entidade>-<seção>` | `maintenance-purchases` |

Use kebab-case, sempre em inglês. Não copie `data-cy` de outra tela.

## 4. Textos de interface (pt-BR)

- **Sentence case**: "Adicionar material", "Tipo de problema", "Prazo de atendimento".
- Campo obrigatório: `*` no rótulo ("Nome*").
- Verbos de botão: **Salvar**, **Cancelar**, **Cadastrar** (cabeçalho de listagem), **Editar**, **Excluir**, **Adicionar …**, **Remover …**, **Aprovar**, **Concluir …**.
- Valor ausente: "N/A" (tabela e `DetailField`) ou "Não informada/o" em contexto de documento.
- Lista vazia: "Nenhum registro encontrado".
- Permissão: "Você não tem permissão para realizar esta ação."
- Tooltip de bloqueio por alteração pendente: "Salve as … antes de continuar".

### 4.1 Toasts

| Caso | Mensagem |
|---|---|
| Criar | "<Entidade> criado/a com sucesso" ou "cadastrado/a com sucesso" |
| Atualizar | "<Entidade> atualizado/a com sucesso" ou "alterado/a com sucesso" |
| Excluir | "<Entidade> excluído/a com sucesso" (há telas antigas com "deletado") |
| Erro de API | a mensagem de `new FetchApiError(error.status, error.data).message` |

Concordância de gênero com a entidade ("Categoria criada", "SLA criado"). Sem ponto final.

### 4.2 Confirmações

- Excluir: título "Excluir <entidade>", subtítulo "Tem certeza que deseja excluir <a/o> <entidade> #<id>?" — `askBeforeDelete` acrescenta "Essa ação não pode ser desfeita.".
- Remover item de lista vinculada: título "Remover <item>", subtítulo com o nome entre aspas e a consequência.

### 4.3 Mensagens de validação (Zod)

- "<Campo> é obrigatório" / "é obrigatória".
- "Data inválida", "A quantidade deve ser maior que zero".
- Limite: `.max(X_MAX_LENGTH, "O <campo> deve conter no máximo N caracteres")`, junto com `inputProps={{ maxLength }}` no campo.
- Sempre `import { z } from "zod/v3"`.

## 5. Dados e API

- Endpoints em `src/store/api/endpoints/<recurso>.endpoints.ts` com `apiService.enhanceEndpoints({ addTagTypes }).injectEndpoints(...)`; regras completas em `src/store/api/README.md`.
- Cache: `keepUnusedDataFor: ENDPOINT_CONFIG.CACHE_CONFIG.LIST` / `.DETAIL`. Tags sempre via `tagProviders.<recurso>.list()` / `.item(id)` / `.itemOnList(id)`.
- Resposta padrão: `ApiResponse<T>` com `data`, `count`, `success`. Listagens paginadas recebem `skip`, `take`, `orderByColumn`, `orderByAsc`, `search`.
- Hooks RTK sempre de `@/store/api/hooks`. Dispatch tipado: `useAppDispatch` de `@/store/hooks`.
- Datas exibidas via `@/utils/data/formatters/date` (`formatShortDate`); moeda via `@/utils/data/formatters/currency` (`formatCurrency`).

## 6. Permissões

- Ações: `C` criar, `R` ler, `U` alterar, `D` excluir (alguns módulos têm ações próprias).
- Página: `export default withPermission("<navId>", "R")(Page)` — cadastro usa `"C"`, edição `"U"`.
- Botões e ações: `const { hasPermission } = useAuth();` e `hasPermission("<navId>", "C")` dentro de `useMemo`.
- Esconda o botão de cadastro sem permissão; no menu de linha, **desabilite** a ação.
- Explicar por que algo está bloqueado: `RestrictedContent` ou `Tooltip` com `title`.

## 7. i18n

- Apenas páginas e navegação usam `useTranslation` (`TITLE`, `REGISTER`, `SEARCH`). O namespace é registrado no `*PageRoute.tsx` com `i18next.addResourceBundle` (`pt` e `en`, mesmas chaves).
- Namespace por módulo (`settingMaintenance`), chaves aninhadas em SCREAMING_SNAKE (`MAINTENANCE.SLAS.TITLE`), lidas com `keyPrefix`. Cadastro e edição reaproveitam o `TITLE` da listagem.
- Dentro de `features/`, textos ficam em português direto no JSX.

## 8. Código

- Biome: tabs, aspas duplas, 120 colunas, imports organizados, sem `any`, sem `console.*` (exceto `console.error`).
- Identificadores em inglês; textos de UI em português.
- Lógica em hooks; componentes só compõem.
- Comentário só quando explica algo que o código não mostra (restrição da API, efeito colateral, truque de DOM). Nada de comentário que repete o nome.
- `tsconfig` tem `strict: false`: `catch (error)` sem tipo e `error.status`/`error.data` direto são o padrão.
- Testes: utils puros, schemas com `refine`, reducers e lógica extraída. Não teste componentes que dependem de RTK Query/`useForm` sem pedido explícito. Importe `describe`/`it`/`expect` de `vitest` explicitamente.
