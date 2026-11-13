# 02 — Componentes

**Quando ler:** antes de criar qualquer elemento de interface. Se existe um componente aqui, use-o em vez do MUI cru.

Convenção: o alias `@/` aponta para `src/`. Imports abaixo são os caminhos reais.

## 1. Layout

### 1.1 Página — `PageSimple`, `PageTitle`, `PageActions`

```tsx
import { PageActions, PageSimple, PageTitle } from "@/components/layout/Page";
```

| Componente | Props | Comportamento |
|---|---|---|
| `PageSimple` | `header?: ReactNode`, `content?: ReactNode`, `scroll?: "normal" \| "page" \| "content"` (padrão `"content"`), `className?` | Fundo `background.default`. Cabeçalho com 64–72px de altura; conteúdo com scroll próprio envolto em `.container-box px-2 lg:px-0`. |
| `PageTitle` | `title?: string`, `icon?: ReactNode`, `subInfo?: ReactNode`, `showSubInfo?: boolean`, `className?` | Ícone numa caixa 24×24 amarela (`primary.main`) com raio 4; título `text-xl font-bold truncate`; ocupa no máximo 50% da largura. |
| `PageActions` | `children` | Linha à direita (`flex-1 justify-end space-x-2`) para os botões do cabeçalho. |

```tsx
<PageSimple
	header={
		<div className="flex justify-between items-center">
			<PageTitle title="Categorias" icon={<FolderOpen strokeWidth={1.5} size={16} />} />
			<PageActions>
				<Button variant="contained" color="primary" onClick={…} data-cy="button-register-categories">
					Cadastrar
				</Button>
			</PageActions>
		</div>
	}
	content={<CategoryList />}
/>
```

O breadcrumb (`PageBreadcrumb`) é renderizado pela toolbar global do layout e monta o `document.title` ("LocX - …"). **Não o coloque na página.**

### 1.2 Formulário — `PaperForm`, `SectionForm`, `GridForm`

```tsx
import PaperForm from "@/components/layout/Form/PaperForm";
import SectionForm from "@/components/layout/Form/SectionForm";
import GridForm from "@/components/layout/Form/GridForm";
```

| Componente | Props | Renderiza |
|---|---|---|
| `PaperForm` | `children`, `className?`, `activeMaxHeight?: boolean` | MUI `Paper` com `p-4 rounded-xl inset-shadow-xs shadow-sm`. `activeMaxHeight` limita a `calc(100vh-200px)` com scroll. É o "cartão" padrão. |
| `SectionForm` | `title: string` (obrigatório), `children`, `className?` (vai para o grid), `classNameContainer?`, `divider?: boolean`, `infoText?: string`, `isSubSection?: boolean`, `headerActions?: ReactNode` | Título `subtitle1` em negrito (ou `subtitle2` médio se `isSubSection`), tooltip de informação opcional, ações à direita do título, e os filhos num `GridForm`. |
| `GridForm` | `children`, `className?` | `grid grid-cols-12 gap-3 m-0`. |

Hierarquia canônica:

```tsx
<PaperForm className="space-y-3">
	<SectionForm title="Informações da categoria">
		<RHFTextField className="col-span-12 md:col-span-4" … />
		<RHFTextField className="col-span-12" multiline rows={5} … />
	</SectionForm>
	<SectionForm title="Prazo de atendimento">…</SectionForm>
</PaperForm>
```

Como `SectionForm` já tem um `GridForm`, **os filhos diretos precisam de `col-span-*`**. Conteúdo que não é campo (tabela, lista) vai dentro de `<div className="col-span-12">`.

### 1.3 Outros

| Componente | Import | Uso |
|---|---|---|
| `PaperTable` | `@/components/layout/Table/PaperTable` | `Paper` com `p-2 rounded-xl space-y-3` para agrupar tabelas |
| `ChartGrid` | `@/components/layout/Chart/ChartGrid` | `grid-cols-1 md:grid-cols-2 gap-3` para gráficos |
| `DetailField` | `@/features/maintenance/requests/components/MaintenanceRequestDetails/components/DetailField` | Campo somente leitura: `label` em `caption` `text.secondary` sobre `value` em `body2` peso 500; mostra "N/A" quando vazio. Props: `label`, `value?`, `children?`, `className?` |

## 2. Tabela — `MRTTable`

```tsx
import MRTTable, { MRTSubTable, MRTTableTotalizers } from "@/components/data-display/MRTTable";
import { useTableManager, useTableManagerWithoutPersist } from "@/components/data-display/MRTTable/hooks/useTableManager";
import type { MRT_ColumnDef, MRT_TableOptions } from "material-react-table";
```

### 2.1 Props

| Prop | Tipo | Descrição |
|---|---|---|
| `columns` | `MRT_ColumnDef<T>[]` | Obrigatório. Cabeçalhos em português; defina `minSize`, `size`, `maxSize`. |
| `data` | `T[]` | Obrigatório. Com `tableManager`, só os itens da página atual. |
| `tableManager?` | retorno de `useTableManager` | Paginação e ordenação controladas pelo servidor, com estado das colunas persistido por usuário no localStorage. |
| `tableOptions?` | `Omit<MRT_TableOptions<T>, "columns" \| "data">` | Repassado ao material-react-table (row actions, detail panel, estado de loading…). |
| `renderExternalToolbarContentLeft?` | `(table) => ReactNode` | Barra acima da tabela, à esquerda (ex.: botão "Adicionar …"). |
| `renderExternalToolbarContentRight?` | `(table) => ReactNode` | À direita do botão "Colunas" (ex.: `SearchField` + `GlobalFilterForm`). |
| `renderBottomToolbarContent?` | `(table) => ReactNode` | Rodapé acima da paginação (totalizadores). |
| `tableContainer?` | `"normal" \| "toolbar-1"…"toolbar-5"` | Altura máxima: `toolbar-2` (padrão) = `calc(100vh - 265px)`; cada nível desconta mais 55px. Use `"normal"` para tabela embutida em seção (altura livre). |

### 2.2 Padrões já ligados

Cabeçalho e rodapé fixos; redimensionar, fixar, reordenar e ocultar colunas; ordenação; paginação 10/25/50/100; localização pt-BR; célula vazia mostra "N/A"; texto com mais de 60 caracteres vira `CellWithLargeText` com tooltip; estado vazio `EmptyTableState` (ícone Telescope + "Nenhum registro encontrado"); itens do menu de ações fecham o menu sozinhos após `onClick`. Toolbar interna do MRT, filtro global, filtros de coluna, densidade e tela cheia ficam **desligados**.

### 2.3 Colunas

```tsx
const columns: MRT_ColumnDef<CategoryTable>[] = [
	{ accessorKey: "id", header: "Id", enableSorting: true, minSize: 120, size: 120, maxSize: 500 },
	{ accessorKey: "name", header: "Nome", enableSorting: true, minSize: 220, size: 260, maxSize: 500 },
	{
		accessorKey: "status",
		header: "Status",
		minSize: 160,
		size: 180,
		maxSize: 240,
		Cell: ({ row }) => <Chip size="small" color={row.original.statusColor} label={row.original.statusLabel} />,
	},
	{ accessorKey: "createdAt", header: "Criado em", enableSorting: true, minSize: 180, size: 180, maxSize: 500 },
];
```

As linhas são **objetos planos com os valores já formatados para exibição** (strings; `id` numérico; e, quando uma `Cell` precisa, campos auxiliares como `statusLabel`/`statusColor`), produzidos por um `TableModel` (ver 03 §2). Booleanos simples viram texto ("Ativo"/"Inativo"). Componentes de célula ficam em `Cell`.

### 2.4 Menu de ações da linha

```tsx
renderRowActionMenuItems: ({ row }) => [
	<MenuItem key="edit" onClick={() => onEdit(row.original.id)} disabled={!canEdit} className="flex items-center gap-3" dense>
		<ListItemIcon className="min-w-0">
			<FuseSvgIcon size="xl">heroicons-outline:pencil-square</FuseSvgIcon>
		</ListItemIcon>
		<ListItemText primary="Editar" />
	</MenuItem>,
	<MenuItem key="delete" onClick={() => onDelete(row.original.id)} disabled={!canDelete} className="flex items-center gap-3" dense>
		<ListItemIcon className="min-w-0">
			<FuseSvgIcon size="xl" color="error">heroicons-outline:trash</FuseSvgIcon>
		</ListItemIcon>
		<ListItemText primary="Excluir" />
	</MenuItem>,
],
```

Imports: `MenuItem`, `ListItemIcon`, `ListItemText` de `@mui/material/<Nome>`. Sem ações disponíveis, devolva um único `MenuItem disabled dense` com "Nenhuma ação disponível".

### 2.5 Painel de detalhes, sub-tabela e totalizadores

- `renderDetailPanel: ({ row }) => <div className="flex flex-col gap-3">…</div>` — conteúdo expandido da linha; para uma tabela interna use `MRTSubTable` (`columns`, `data`, `tableOptions?`).
- Fixar a coluna de expandir à esquerda e a de ações à direita: `initialState: { columnPinning: { left: ["mrt-row-expand"], right: ["mrt-row-actions"] } }`.
- Totalizadores: `renderBottomToolbarContent={() => <MRTTableTotalizers groups={[{ key: "filtro", items: [{ label: "Total", value: "R$ 1.204,00", highlight: true }] }]} />}` (rótulo sem dois pontos; `highlight` para valores monetários).
- Outros: `ColumnHeaderWithInfo` (`label`, `info`) para cabeçalho com tooltip; `CellWithLargeText` (`text`, `maxLength?`, `disableTooltip?`).

### 2.6 `useTableManager(storeKey)`

Retorna:

- `search { value, setSearch, resetSearch }`
- `pagination { page, pageSize, skip, take, totalItems, setTotalItems, resetPagination, … }`
- `sorting { sortKey, sortDir, onSort }`
- `columns { columnOrder, columnVisibility, columnPinning, setColumnOrder, setColumnVisibility, setColumnPinning }`

O consumidor envia `skip`/`take`/`orderByColumn`/`orderByAsc`/`search` para a query e chama `pagination.setTotalItems(data.count)`. `storeKey` é único por tabela (ex.: `"maintenanceSLATableManager"`). Use `useTableManagerWithoutPersist` quando o estado não deve sobreviver ao reload.

## 3. Formulário (React Hook Form)

Todo campo `RHF*` recebe `control` e `name` (`ControlledProps<T>`: `{ control, name, rules?, defaultValue? }`) e as props do componente MUI equivalente. **O erro é passado pelo chamador:**

```tsx
<RHFTextField
	className="col-span-12 md:col-span-4"
	control={control}
	name="name"
	id="name"
	data-cy="name"
	label="Nome*"
	error={!!errors.name}
	helperText={errors.name?.message}
/>
```

| Componente | Import | Props próprias |
|---|---|---|
| `RHFTextField` | `{ RHFTextField } from "@/components/form/TextField/TextField"` | `label?`, `infoText?`, `copyable?`, `transform?`, `multiline`/`rows`/`minRows`, `inputProps={{ maxLength }}` |
| `RHFSelect` | `{ RHFSelect } from "@/components/form/Select/Select"` | `label` (obrigatório), `options: { label, value }[]`, `infoText?`, `removeEmptyOption?`. Inclui item vazio "Nenhum" (ou "Nenhum opção encontrada"). Altura 40. |
| `RHFMultiSelect` | `@/components/form/MultiSelect/MultiSelect` | `label`, `options` (com `disabled?`), `required?` |
| `RHFPaginatedMultiSelect` | `@/components/form/PaginatedMultiSelect` | Opções paginadas com busca: `options`, `loading?`, `hasMore?`, `onLoadMore?`, `onSearchChange?` |
| `RHFAutocomplete` | `{ RHFAutocomplete } from "@/components/form/Autocomplete/Autocomplete"` | `label`, `options: { label, value, data? }[]`, `externalOnChange?`. Valor `{ value, label }`. "Nenhum resultado encontrado" / "Carregando...". |
| `RHFDateField` | `{ RHFDateField } from "@/components/form/DateField/DateField"` | `label?`, `format="dd/MM/yyyy"`. Guarda ISO string. |
| `RHFNumberField` | `{ RHFNumberField } from "@/components/form/NumberField/NumberField"` | `label?`, `min?`, `max?`, `step?`. Vazio vira `null`. |
| `RHFNumberFieldMask` | `{ RHFNumberFieldMask } from "@/components/form/TextFieldMask/RHFNumberFieldMask"` | `mask: "CURRENCY_BR" \| "CURRENCY_US" \| "SQUARE_METER" \| "CPF_CNPJ" \| "CNPJ" \| "CPF"`, `limit?` |
| `RHFTextFieldMask` | `@/components/form/TextFieldMask/RHFTextFieldMask` | `mask: keyof maskPatterns` (telefone, CEP, placa…; ver `TextFieldMask/types.ts`) |
| `RHFPercentageField` | `@/components/form/PercentageField/PercentageField` | `label`, `decimalPlaces?` |
| `RHFSwitch` | `RHFSwitch from "@/components/form/Switch/Switch"` (default) | `label`, `disabled?`, `helperText?`, `error?` |
| `RHFCheckbox` / `RHFCheckboxGroup` | `@/components/form/Checkbox/Checkbox` / `CheckboxGroup` | Grupo: `title`, `options`, `required?`, `classNameList?` |
| `RHFRadioGroup` | `{ RHFRadioGroup } from "@/components/form/RadioGroup/RadioGroup"` | `label?`, `options: { label, value, disabled? }[]`, `row` |
| `RHFChip` | `@/components/form/Chip/Chip` | Chip que alterna um booleano |
| `RHFHexColorField` | `@/components/form/HexColorField/HexColorField` | Campo + seletor de cor |
| `Editor` | `Editor from "@/components/form/Editor/Editor"` (default) | Texto rico (Lexical): `control`, `name`, `label?`, `placeholder?`, `error?`, `helperText?` |

Fora do RHF:

- `SearchField` (`{ SearchField } from "@/components/form/SearchField/SearchField"`): `{ value?, onSearch, onClear, placeholder?, className? }` — busca da toolbar da tabela.
- `SearchAutocompleteField`: `{ options, isLoading, onInputChange, onSelectedValueChange, placeholder? }`.
- `SelectBase`, `Autocomplete`: versões não controladas.

Regras:

- Rótulo de campo obrigatório termina com `*` ("Nome*").
- `id`, `name` e `data-cy` iguais ao nome do campo.
- Em diálogos, desabilite todos os campos enquanto salva ou carrega (`disabled={isLocked}`). Em formulário de página basta o `loading` do botão Salvar.
- Limite de caracteres: exporte a constante do schema, use `inputProps={{ maxLength: X_MAX_LENGTH }}` e dê mensagem ao `.max` do Zod.

## 4. Botões e menus

| Componente | Import | Notas |
|---|---|---|
| `Button` | `{ Button } from "@/components/ui/Button/Button"` | MUI Button sem ripple e sem elevação. `loading` desabilita e põe o spinner no início. Padrão do tema: `contained`, `primary`, `medium`, sem caixa alta, peso 600. |
| `IconButton` | `{ IconButton } from "@/components/ui/IconButton/IconButton"` | Sem ripple. |
| `ActionsDropdown` | `{ ActionsDropdown } from "@/components/ui/ActionButton"` | Botão com menu de ações, agrupadas ou não. |
| `SplitButton` | `SplitButton from "@/components/ui/SplitButton"` | Ação principal + alternativas: `options: { optionTitle, optionDescription?, onClick, disabled? }[]`. |
| `BulkActionsMenu` | `@/components/ui/BulkActionsMenu/BulkActionsMenu` | Ações em lote sobre linhas selecionadas. |
| `CopyIconButton` | `@/components/ui/CopyIconButton/CopyIconButton` | `{ value?, fieldLabel? }`. |

Hierarquia de botões:

| Papel | Props |
|---|---|
| Principal (Salvar, Cadastrar, Aprovar) | `variant="contained"` (amarelo, texto preto) |
| Secundário/neutro (Cancelar, Adicionar …, Voltar) | `variant="outlined" color="inherit"` |
| Destrutivo | `color="error"` (no diálogo de confirmação o botão "Excluir" já é vermelho) |
| Ícone + texto | `startIcon={<FuseSvgIcon size="md">heroicons-outline:plus</FuseSvgIcon>}` |

Em grupos, o botão principal fica **à direita**: `Cancelar` → `Salvar`.

## 5. Diálogos

```tsx
import * as Dialog from "@/components/ui/Dialog/Dialog";

<Dialog.Dialog fullWidth open={open} onClose={handleClose} maxWidth="md" data-cy="material-form-dialog">
	<Dialog.DialogTitle>Informações do material</Dialog.DialogTitle>
	<Dialog.DialogContent>…</Dialog.DialogContent>
	<Dialog.DialogActions>
		<Button color="inherit" variant="outlined" onClick={handleClose}>Cancelar</Button>
		<Button type="submit" form={FORM_ID} variant="contained" loading={isSaving}>Salvar</Button>
	</Dialog.DialogActions>
</Dialog.Dialog>
```

- `DialogTitle` já aplica `text-base md:text-lg font-semibold`.
- Larguras: `maxWidth="xs"` (confirmação com um campo, motivo), `"sm"`, `"md"` (formulário com várias colunas).
- Confirmações simples **não** são diálogos próprios: use `useAskDialog` (§6).
- Outros: `AskDialogContent` (conteúdo padrão de pergunta), `BulkActionConfirmDialog` (confirmação de ação em lote, com opção de digitar para confirmar).

## 6. Hooks de UI

### 6.1 Confirmação — `useAskDialog`

```tsx
import { useAskDialog } from "@/hooks/useAskDialog";

const { askBeforeDelete, askBeforeAccept, ask } = useAskDialog();

askBeforeDelete({
	title: "Excluir categoria",
	subtitle: `Tem certeza que deseja excluir a categoria #${id}?`,
	onRemove: () => handleDelete(id),
});
```

`askBeforeDelete` adiciona "Essa ação não pode ser desfeita.", "Cancelar" e o botão vermelho "Excluir", e fecha sozinho. `askBeforeAccept({ title, subtitle, confirmText, onConfirm, onCancel })` para confirmações não destrutivas.

### 6.2 Toasts — `showMessage`

```tsx
import { showMessage } from "@/@fuse/core/FuseMessage/fuseMessageSlice";
import { FetchApiError } from "@/http-client/FetchApiErrors";
import { useAppDispatch } from "@/store/hooks";

dispatch(showMessage({ message: "Categoria criada com sucesso", variant: "success" }));

try {
	await mutation(args).unwrap();
} catch (error) {
	const { message } = new FetchApiError(error.status, error.data);
	dispatch(showMessage({ message, variant: "error" }));
}
```

`variant`: `success` · `error` · `warning` · `info`. Duração padrão 5s. No módulo de manutenção o tratamento de erro está encapsulado em `useNotifyApiError` (`@/features/maintenance/hooks/useNotifyApiError`).

### 6.3 Estado de diálogo por página — `withDialog` + `useDialogControl`

```tsx
export const REGISTER_X_DIALOG_ID = "register-x-dialog";

const { isOpen, data, openDialog, closeDialog } = useDialogControl<XData>(REGISTER_X_DIALOG_ID);
```

A página precisa estar envolvida em `withDialog` (`@/HOC/withDialog`). Alternativa local, sem contexto: um `useState` com união discriminada (ver 03 §5).

### 6.4 Outros

- `useTabNavigation(paramName, defaultTab)` (`@/hooks/useTabNavigation`): `[currentTab: string, setCurrentTab]`, sincronizado com `?paramName=`.
- `useAuth().hasPermission(navId, "C" | "R" | "U" | "D")` (`@/@fuse/core/FuseAuthProvider/useAuth`, default export).
- `withPermission(navId, action)(Page)` (`@/HOC/withPermission`, default export): redireciona para `/401`.
- Hooks de opções: `src/hooks/options/select/use*AsyncOptions.ts` e `src/hooks/options/autocomplete/use*AutocompleteOptions.ts` devolvem `{ label, value }[]` vindos de RTK Query.

## 7. Abas

```tsx
import { CustomTabPanel } from "@/components/ui/Tabs/CustomTabPanel";
import { Tab } from "@/components/ui/Tabs/Tab";
import { Tabs } from "@/components/ui/Tabs/Tabs";
```

- `Tabs`: rolável, 42px, borda inferior `divider`. `Tab`: 36px, raio 8, selecionada em peso 600; `tooltipTitle?` adiciona ícone de informação.
- `CustomTabPanel`: `{ index: number, value: number, contentUnavailable? }`. **Atenção à inversão:** `index` recebe a aba atual e `value` a constante da aba. `contentUnavailable` mostra "Esse conteúdo está indisponível".

## 8. Feedback e estado

| Componente | Import | Uso |
|---|---|---|
| `Skeleton.*` | `* as Skeleton from "@/components/ui/Skeleton"` | `InputFieldSkeleton` (40px), `LabelSkeleton`, `SwitchSkeleton`, `CheckboxSkeleton`, `CheckboxGroupSkeleton`, `RadioSkeleton`, `ChipSkeleton`, `IconButtonSkeleton`, `ButtonSkeleton`, `BoxSkeleton` |
| `ComingSoon` | `@/components/feedback/ComingSoon` | `variant="action"` desabilita o filho com tooltip "Em breve"; `variant="section"` substitui a área por um aviso. `active={false}` libera. |
| `RestrictedContent` | `@/components/feedback/RestrictedContent` | `restricted` desabilita o filho com tooltip de cadeado "Você não tem permissão para realizar esta ação." |
| `LoadingContent` | `@/components/feedback/LoadingContent` | Carregamento de página inteira |
| `Alert` (MUI) | `@mui/material/Alert` | Aviso em linha: `severity="warning"` etc. |
| `Chip` (MUI) | `@mui/material/Chip` | Status: `size="small"` + `color` do tema. Hex vindo da API: `ChipSimpleCustom` / `ChipWithPulse` (`@/components/ui/Chip`). |
| `Tooltip` (MUI) | `@mui/material/Tooltip` | Explicar botão desabilitado: envolva o botão num `<span>`. |

## 9. Arquivos

- `FileUpload` (`@/components/ui/FileUpload`, default): `{ accept?, multiple?, maxFiles?, onFileUpload?, showSelectedFiles?, error?, helperText?, disabled? }`.
- `FileViewer/` (`@/components/ui/FileViewer`): visualizadores de PDF, DOCX, XLSX, CSV, imagem, vídeo e texto.
- Anexos em grade com visualizador: `MaintenanceAttachments` (`src/features/maintenance/requests/components/MaintenanceRequestDetails/components/MaintenanceAttachments`).

## 10. Filtros de listagem

- `GlobalFilterForm` (`@/features/common/features-in-general/components/GlobalFilterForm`, default): popover de filtros com filtros salvos. Props: `FILTER_TYPE`, `filtersConfig`, `defaultValues`, `validationSchema?`, `onFiltersApply`, `onClearFilters`.
- `AutoFilterForm` (`…/components/AutoFilterForm`): filtros em linha, sem botão aplicar. `fieldClassName` padrão `col-span-12 sm:col-span-6 md:col-span-3`.
- `FilterConfig`: `{ name, label, type: "text" | "number" | "date" | "select" | "multiselect" | "autocomplete" | "cpfCnpj" | "cnpj" | "cpf" | "phone" | "landline" | "squareMeter" | "currency", options?, … }`.
- Estado: `useFilterManager<T>(FILTER_TYPES.X, defaultValues, schema)` de `…/GlobalFilterForm/hooks`.

## Não faça

- `@mui/material/Button` direto quando `@/components/ui/Button/Button` atende.
- `TextField` + `Controller` à mão em vez de `RHFTextField`.
- Tabela HTML ou `DataGrid` em vez de `MRTTable`.
- Diálogo próprio só para confirmar exclusão (use `askBeforeDelete`).
- `alert()`/`console.log` para feedback (use `showMessage`).
