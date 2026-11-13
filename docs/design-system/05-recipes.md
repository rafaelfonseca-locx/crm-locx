# 05 — Receitas

**Quando ler:** ao implementar uma tela do zero. Siga os passos na ordem; cada um aponta para o modelo em 03.

## Receita A — CRUD completo (listagem + cadastro + edição)

Entrada: nome da entidade, rota da API, campos, id de navegação e módulo pai.

1. **Tipos** — `src/store/api/@types/<recurso>.types.ts` (03 §0.1).
2. **Endpoints** — `src/store/api/endpoints/<recurso>.endpoints.ts` (03 §0.2). Registre o recurso em `tagProviders.ts` e no barrel `src/store/api/hooks/index.ts` (03 §0.3). Confirme URLs e verbos na referência do back-end.
3. **Navegação e permissão** — item em `src/configs/navigationConfig.ts` (03 §1), tradução em `src/configs/navigation-i18n/pt.ts`, sigla em `src/configs/navigationIndex.ts`.
4. **Rota** — se o módulo já tem `<Modulo>PageRoute.tsx`, acrescente a entidade em `children` e as chaves no `i18n/` do módulo; senão crie o arquivo e o `i18n/pt.ts`/`en.ts` (03 §1).
5. **Listagem** — `features/<dominio>/<entidade>/components/<Entidade>List/` com `TableModel`, colunas, table manager, operações e `use<Entidade>Table` (03 §2). Página `…ListingPage.tsx` com `withPermission(id, "R")`.
6. **Formulário** — `components/Form/` com schema, `FormModel`, `ApiModel`, `…FormFields`, hooks de cadastro/edição/envio, skeleton (03 §3). Páginas `…RegistrationPage.tsx` (`"C"`) e `…EditingPage.tsx` (`"U"`).
7. **Busca e filtros** (se pedidos) — 03 §2.3.
8. **Testes** — schema com `refine`/`superRefine`, utils puros e `TableModel`/`FormModel`/`ApiModel` não triviais. Descrições em pt-BR ("rejeita nome vazio", "devolve lista vazia sem dados").
9. **Checklist final** (abaixo).

## Receita B — Página de detalhes com abas

1. Página com `PageSimple` + `PageTitle` e `withPermission(id, "R")(withDialog(Page))` se abrir diálogos.
2. Constantes numéricas das abas e `useTabNavigation("<entidade>Tab", "0")` (03 §4).
3. Uma pasta por aba; cada aba é `PaperForm` > `SectionForm` > `DetailField`/campos.
4. Ações da página à direita da barra de abas.

## Receita C — Diálogo de formulário dentro de uma tela

1. Pasta `components/<Algo>Dialog/` com `index.tsx`, hook, `models`, `schema` (03 §5).
2. Props `open`, ids do contexto, `xxxId: number | null`, `onClose`.
3. No pai, união discriminada `dialog` + diálogos irmãos.
4. Botão que abre: na barra da tabela (`renderExternalToolbarContentLeft`, `variant="outlined" color="inherit"`) ou no menu de ações da linha.

## Receita D — Tabela embutida com detalhe expansível

1. `PaperForm > SectionForm > div.col-span-12 > MRTTable tableContainer="normal"` (03 §6).
2. `tableOptions`: `enablePagination: false`, `enableRowActions: true`, `renderDetailPanel`.
3. Fixe `mrt-row-expand` à esquerda e `mrt-row-actions` à direita.

## Checklist de entrega

- [ ] Página usa `PageSimple` + `PageTitle` (ícone lucide `strokeWidth={1.5} size={16}`) e está protegida por `withPermission`.
- [ ] Botões de criar/editar/excluir checam `hasPermission`.
- [ ] Campos usam `RHF*` com `error`/`helperText`, `id`/`name`/`data-cy` iguais e rótulo com `*` quando obrigatório.
- [ ] Larguras com `col-span-12 md:col-span-*`; todo filho de `SectionForm` tem `col-span`.
- [ ] Cores só pelo tema (nenhum `bg-primary`/hex solto).
- [ ] Toasts de sucesso e erro; exclusão via `askBeforeDelete`.
- [ ] Estados de carregamento: `isLoading` na tabela, skeleton na edição, `loading` nos botões, campos desabilitados ao salvar.
- [ ] Textos em pt-BR, sentence case.
- [ ] `npx tsc --noEmit`, `npx biome check <arquivos alterados>` e `npm run build:dev` passando.
