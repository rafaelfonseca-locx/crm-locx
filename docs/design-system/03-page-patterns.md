# 03 — Padrões de página

**Quando ler:** para criar ou recriar uma tela. Cada padrão abaixo traz a árvore de arquivos e o código-modelo, extraídos dos módulos reais. Copie a estrutura e troque a entidade.

Exemplo usado em todo o arquivo: entidade fictícia **Fornecedor** (`Supplier`), rota `/settings/suppliers`, navegação `module.1.settings.suppliers`. Os modelos reais equivalentes estão indicados em cada seção.

| Padrão | Referência real |
|---|---|
| Listagem | `src/pages/(control-panel)/settings/maintenance/slas/MaintenanceSLAListingPage.tsx` + `src/features/settings/maintenance/slas/components/MaintenanceSLAList/` |
| Listagem com busca e filtros | `src/features/legal-proceedings/LegalProceedingsList/` |
| Cadastro/edição | `src/features/settings/maintenance/categories/components/Form/` |
| Detalhes com abas | `src/features/maintenance/requests/components/MaintenanceRequestWorkspace/index.tsx`, `src/features/licensing/components/Form/LicenseEditing/index.tsx` |
| Diálogo de formulário | `src/features/maintenance/requests/components/MaintenanceRequestDetails/components/MaintenancePurchases/components/MaterialFormDialog/` |
| Tabela embutida em seção | `src/features/maintenance/requests/components/MaintenanceRequestDetails/components/MaintenancePurchases/index.tsx` |

## 0. Camada de API (RTK Query)

Modelo real: `src/store/api/endpoints/maintenance-categories.endpoints.ts` + `src/store/api/@types/maintenance-categories.types.ts`. Regras gerais em `src/store/api/README.md`.

### 0.1 Tipos — `src/store/api/@types/suppliers.types.ts`

```ts
import { ApiResponse } from "@/http-client/@types/apiFetch";
// ApiResponse<T> = { success: boolean; data: T; count?: number }

export type Supplier = {
	id?: number;
	name: string;
	document?: string;
	isActive: boolean;
	categoryId?: number;
	description?: string;
	createdAt?: string;
	updatedAt?: string;
};

export type SupplierCreatePayload = Omit<Supplier, "id" | "createdAt" | "updatedAt">;
export type SupplierUpdatePayload = Omit<Supplier, "createdAt" | "updatedAt">; // inclui o id

export type SuppliersFilters = { isActive?: boolean };

// RTK QUERY - ENDPOINT TYPES
export type GetSuppliersApiResponse = ApiResponse<Supplier[]>;
export type GetSuppliersApiArg = SuppliersFilters & {
	skip?: number;
	take?: number;
	orderByColumn?: string;
	orderByAsc?: boolean;
	search?: string;
};

export type GetSupplierByIdApiResponse = ApiResponse<Supplier>;
export type GetSupplierByIdApiArg = { id: number };

export type CreateSupplierApiResponse = Omit<ApiResponse<boolean>, "count">;
export type CreateSupplierApiArg = { data: SupplierCreatePayload };

export type UpdateSupplierApiResponse = Omit<ApiResponse<boolean>, "count">;
export type UpdateSupplierApiArg = { data: SupplierUpdatePayload };

export type DeleteSupplierApiResponse = Omit<ApiResponse<boolean>, "count">;
export type DeleteSupplierApiArg = { id: number };
```

Não há tipo compartilhado de paginação: repita `skip`/`take`/`orderByColumn`/`orderByAsc`/`search` no `Get<Recursos>ApiArg`.

### 0.2 Endpoints — `src/store/api/endpoints/suppliers.endpoints.ts`

```ts
import type {
	CreateSupplierApiArg,
	CreateSupplierApiResponse,
	DeleteSupplierApiArg,
	DeleteSupplierApiResponse,
	GetSupplierByIdApiArg,
	GetSupplierByIdApiResponse,
	GetSuppliersApiArg,
	GetSuppliersApiResponse,
	UpdateSupplierApiArg,
	UpdateSupplierApiResponse,
} from "@/store/api/@types/suppliers.types";
import { apiService as api, ENDPOINT_CONFIG } from "@/store/api/apiService";
import { tagProviders } from "@/store/api/tagProviders";

export const addTagTypesSuppliers = ["suppliers"];

const suppliersApi = api.enhanceEndpoints({ addTagTypes: addTagTypesSuppliers }).injectEndpoints({
	endpoints: (build) => ({
		getSuppliers: build.query<GetSuppliersApiResponse, GetSuppliersApiArg>({
			query: ({ skip, take, orderByColumn, orderByAsc, search, isActive }) => ({
				url: "/api/suppliers",
				params: { skip, take, orderByColumn, orderByAsc, search, isActive },
			}),
			keepUnusedDataFor: ENDPOINT_CONFIG.CACHE_CONFIG.LIST,
			providesTags: (result) => {
				if (result?.data) {
					return [
						...result.data.map(({ id }) => tagProviders.suppliers.itemOnList(id?.toString())),
						...tagProviders.suppliers.list(),
					];
				}

				return tagProviders.suppliers.list();
			},
		}),
		getSupplierById: build.query<GetSupplierByIdApiResponse, GetSupplierByIdApiArg>({
			query: ({ id }) => ({ url: `/api/suppliers/${id}` }),
			keepUnusedDataFor: ENDPOINT_CONFIG.CACHE_CONFIG.DETAIL,
			providesTags: (_result, _error, { id }) => tagProviders.suppliers.item(id.toString()),
		}),
		createSupplier: build.mutation<CreateSupplierApiResponse, CreateSupplierApiArg>({
			query: ({ data }) => ({ url: "/api/suppliers", method: "POST", body: data }),
			invalidatesTags: (_result, error) => (error ? [] : tagProviders.suppliers.list()),
		}),
		updateSupplier: build.mutation<UpdateSupplierApiResponse, UpdateSupplierApiArg>({
			query: ({ data }) => ({ url: "/api/suppliers", method: "PUT", body: data }),
			invalidatesTags: (_result, error, { data }) =>
				error ? [] : [...tagProviders.suppliers.item(data.id?.toString()), ...tagProviders.suppliers.list()],
		}),
		deleteSupplier: build.mutation<DeleteSupplierApiResponse, DeleteSupplierApiArg>({
			query: ({ id }) => ({ url: `/api/suppliers/${id}`, method: "DELETE" }),
			invalidatesTags: (_result, error, { id }) =>
				error ? [] : [...tagProviders.suppliers.item(id.toString()), ...tagProviders.suppliers.list()],
		}),
	}),
});

export { suppliersApi };

export const {
	useGetSuppliersQuery,
	useLazyGetSuppliersQuery,
	useGetSupplierByIdQuery,
	useCreateSupplierMutation,
	useUpdateSupplierMutation,
	useDeleteSupplierMutation,
} = suppliersApi;
```

- URLs já começam com `/api/…` (a base URL não inclui `/api`). O **update é `PUT` na raiz com o `id` no corpo**; o delete é `DELETE /api/<recurso>/:id`. Confirme a rota na referência do back-end antes de assumir.
- Tag: o nome do recurso em camelCase, igual à chave em `tagProviders`.
- Invalidação: criar → `list()`; alterar e excluir → `item(id)` + `list()`; nada quando houve erro.

### 0.3 Registro

```ts
// src/store/api/tagProviders.ts — uma linha no objeto, em ordem alfabética
suppliers: tagUtils.createTagProviders("suppliers"),
```

`createTagProviders(nome)` devolve: `list(prefix?)` e `item(id: string)` (arrays), `itemOnList(id: string)` (objeto único, para espalhar no `map`), `oneItemAndList(id)`, `listWithParams(params)` e `search(params)`.

```ts
// src/store/api/hooks/index.ts — barrel
export * from "@/store/api/endpoints/suppliers.endpoints";
```

## 1. Rota, i18n e navegação (comum a todos)

```
src/pages/(control-panel)/settings/suppliers/
├── SuppliersPageRoute.tsx        ← carregado automaticamente (glob "/src/pages/**/*Route.tsx")
├── SupplierListingPage.tsx
├── SupplierRegistrationPage.tsx
├── SupplierEditingPage.tsx
└── i18n/
    ├── pt.ts
    └── en.ts
```

```tsx
// SuppliersPageRoute.tsx
import i18next from "i18next";
import { lazy } from "react";

import type { FuseRouteItemType } from "@/@fuse/utils/FuseUtils";
import { loaderValidateId } from "@/utils/navigation/routes";

import en from "./i18n/en";
import pt from "./i18n/pt";

i18next.addResourceBundle("en", "settingSuppliers", en);
i18next.addResourceBundle("pt", "settingSuppliers", pt);

const SupplierListingPage = lazy(() => import("./SupplierListingPage"));
const SupplierRegistrationPage = lazy(() => import("./SupplierRegistrationPage"));
const SupplierEditingPage = lazy(() => import("./SupplierEditingPage"));

const SuppliersPageRoute: FuseRouteItemType = {
	path: "settings/suppliers",
	children: [
		{ path: "", element: <SupplierListingPage /> },
		{ path: "new", element: <SupplierRegistrationPage /> },
		{ path: "edit/:id", element: <SupplierEditingPage />, loader: loaderValidateId },
	],
};

export default SuppliersPageRoute;
```

**Um `*PageRoute.tsx` por módulo de rota, não por entidade.** Ex.: `src/pages/(control-panel)/settings/maintenance/MaintenancePageRoute.tsx` agrupa categorias, subcategorias, SLAs etc. como `children` de `path: "settings/maintenance"`, cada entidade numa subpasta (`categories/`, `slas/`). Entidade nova num módulo existente → acrescente um bloco em `children` e as chaves no i18n do módulo. Só crie um `*PageRoute.tsx` novo para um módulo novo. `loaderValidateId` redireciona para `/404` quando o `:id` não é inteiro.

```ts
// i18n/pt.ts — só o título e os rótulos do cabeçalho
const locale = {
	SUPPLIERS: {
		TITLE: "Fornecedores",
		REGISTER: "Cadastrar",
		SEARCH: "Pesquisar",
	},
};

export default locale;

// i18n/en.ts — mesmas chaves, em inglês
const locale = {
	SUPPLIERS: {
		TITLE: "Suppliers",
		REGISTER: "Register",
		SEARCH: "Search",
	},
};
```

- Namespace: `setting<Modulo>` para rotas de configurações (`settingMaintenance`); chaves aninhadas em SCREAMING_SNAKE (`MAINTENANCE.SLAS.TITLE`), lidas com `useTranslation("settingMaintenance", { keyPrefix: "MAINTENANCE.SLAS" })`.
- Listagem, cadastro e edição usam o **mesmo `TITLE`** no `PageTitle`.

Navegação (`src/configs/navigationConfig.ts`), dentro do grupo pai:

```ts
{
	id: "module.1.settings.suppliers",
	title: "Suppliers",
	type: "item",
	url: "/settings/suppliers",
	translate: "SUPPLIERS",
},
```

- O `id` da navegação **é a chave de permissão** usada em `hasPermission` e `withPermission`. A sigla correspondente é registrada em `src/configs/navigationIndex.ts` (sigla definida pelo back-end ou `acronymForPermissionByNavigationIndex(id)`).
- O texto do menu vem de `translate` em `src/configs/navigation-i18n/pt.ts`.
- Grupo sem página própria: `type: "collapse"` com `clickableLink: false` e `children`.

## 2. Listagem

```
src/features/settings/suppliers/components/SupplierList/
├── index.tsx
├── hooks/
│   ├── useSupplierTable.tsx          ← query + tableOptions + menu de ações
│   ├── useSupplierTableColumns.ts
│   ├── useSupplierTableManager.ts
│   └── useSupplierOperations.ts      ← excluir/editar
└── models/
    └── TableModel.ts                 ← API → linha plana de strings
```

### 2.1 Página

```tsx
// src/pages/(control-panel)/settings/suppliers/SupplierListingPage.tsx
import { FolderOpen } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import useAuth from "@/@fuse/core/FuseAuthProvider/useAuth";
import { PageActions, PageSimple, PageTitle } from "@/components/layout/Page";
import { Button } from "@/components/ui/Button/Button";
import SupplierList from "@/features/settings/suppliers/components/SupplierList";
import withPermission from "@/HOC/withPermission";

function SupplierListingPage() {
	const { t } = useTranslation("settingSuppliers", { keyPrefix: "SUPPLIERS" });
	const navigate = useNavigate();
	const { hasPermission } = useAuth();

	const canRegister = useMemo(() => hasPermission("module.1.settings.suppliers", "C"), [hasPermission]);

	return (
		<PageSimple
			header={
				<div className="flex justify-between items-center">
					<PageTitle title={t("TITLE")} icon={<FolderOpen strokeWidth={1.5} size={16} />} />
					<PageActions>
						{canRegister && (
							<Button
								data-cy="button-register-suppliers"
								variant="contained"
								color="primary"
								size="medium"
								onClick={() => navigate("/settings/suppliers/new")}
							>
								{t("REGISTER")}
							</Button>
						)}
					</PageActions>
				</div>
			}
			content={<SupplierList />}
		/>
	);
}

export default withPermission("module.1.settings.suppliers", "R")(SupplierListingPage);
```

A listagem simples (SLA, categorias) **não tem busca nem filtro**; adicione-os só quando pedido (§2.3). O ícone de `PageTitle` nas telas de configurações é `FolderOpen`; em outros módulos, repita o ícone já usado pelas outras páginas do módulo.

### 2.2 Componente e hooks

```tsx
// index.tsx
import MRTTable from "@/components/data-display/MRTTable";

import { useSupplierTable } from "./hooks/useSupplierTable";

const SupplierList = () => {
	const { columns, tableData, tableManager, tableOptions } = useSupplierTable();

	return <MRTTable columns={columns} data={tableData} tableManager={tableManager} tableOptions={tableOptions} />;
};

export default SupplierList;
```

```ts
// hooks/useSupplierTableManager.ts
import { useTableManager } from "@/components/data-display/MRTTable/hooks/useTableManager";

export const useSupplierTableManager = () => useTableManager("supplierTableManager");
```

```ts
// models/TableModel.ts
import type { Supplier } from "@/store/api/@types/suppliers.types";
import * as dateUtils from "@/utils/data/formatters/date";

export type SupplierTable = {
	id: number;
	name: string;
	document: string;
	status: string;
	createdAt: string;
	updatedAt: string;
};

export const TableModel = (data: Supplier[]): SupplierTable[] =>
	data.map((supplier) => ({
		id: supplier.id,
		name: supplier.name || "",
		document: supplier.document || "",
		status: supplier.isActive ? "Ativo" : "Inativo",
		createdAt: supplier.createdAt ? dateUtils.formatShortDate(supplier.createdAt) : "",
		updatedAt: supplier.updatedAt ? dateUtils.formatShortDate(supplier.updatedAt) : "",
	}));
```

Booleanos viram texto no `TableModel` ("Ativo"/"Inativo", coluna "Situação"). Use `Chip` numa `Cell` só quando a cor importa (status de fluxo, alçada); aí guarde `…Label` e `…Color` na linha.

```ts
// hooks/useSupplierTableColumns.ts — função simples, sem useMemo; vira .tsx se alguma coluna tiver `Cell` com JSX
import type { MRT_ColumnDef } from "material-react-table";

import type { SupplierTable } from "../models/TableModel";

export const useSupplierTableColumns = () => {
	const columns: MRT_ColumnDef<SupplierTable>[] = [
		{ accessorKey: "id", header: "Id", enableSorting: true, minSize: 120, size: 120, maxSize: 500 },
		{ accessorKey: "name", header: "Nome", enableSorting: true, minSize: 300, size: 300, maxSize: 500 },
		{ accessorKey: "document", header: "CNPJ", enableSorting: false, minSize: 200, size: 200, maxSize: 500 },
		{ accessorKey: "status", header: "Situação", enableSorting: false, minSize: 200, size: 200, maxSize: 500 },
		{ accessorKey: "createdAt", header: "Criado em", enableSorting: true, minSize: 180, size: 180, maxSize: 500 },
		{ accessorKey: "updatedAt", header: "Atualizado em", enableSorting: true, minSize: 210, size: 210, maxSize: 500 },
	];

	return { columns };
};
```

```ts
// hooks/useSupplierOperations.ts
import { useCallback } from "react";
import { useNavigate } from "react-router";

import { showMessage } from "@/@fuse/core/FuseMessage/fuseMessageSlice";
import { FetchApiError } from "@/http-client/FetchApiErrors";
import { useDeleteSupplierMutation } from "@/store/api/hooks";
import { useAppDispatch } from "@/store/hooks";

export const useSupplierOperations = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const [deleteSupplier, { isLoading: isDeletingSupplier }] = useDeleteSupplierMutation();

	const handleDeleteSupplier = useCallback(
		async (id: number) => {
			try {
				await deleteSupplier({ id }).unwrap();
				dispatch(showMessage({ message: "Fornecedor excluído com sucesso", variant: "success" }));
			} catch (error) {
				const { message } = new FetchApiError(error.status, error.data);
				dispatch(showMessage({ message, variant: "error" }));
			}
		},
		[deleteSupplier, dispatch],
	);

	const handleEditSupplier = useCallback((id: number) => navigate(`/settings/suppliers/edit/${id}`), [navigate]);

	return { handleDeleteSupplier, handleEditSupplier, isDeletingSupplier };
};
```

```tsx
// hooks/useSupplierTable.tsx
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import type { MRT_TableOptions } from "material-react-table";
import { useCallback, useEffect, useMemo } from "react";

import useAuth from "@/@fuse/core/FuseAuthProvider/useAuth";
import FuseSvgIcon from "@/@fuse/core/FuseSvgIcon";
import { useAskDialog } from "@/hooks/useAskDialog";
import { useGetSuppliersQuery } from "@/store/api/hooks";

import { type SupplierTable, TableModel } from "../models/TableModel";
import { useSupplierOperations } from "./useSupplierOperations";
import { useSupplierTableColumns } from "./useSupplierTableColumns";
import { useSupplierTableManager } from "./useSupplierTableManager";

export const useSupplierTable = () => {
	const { hasPermission } = useAuth();
	const { askBeforeDelete } = useAskDialog();
	const tableManager = useSupplierTableManager();
	const { handleDeleteSupplier, handleEditSupplier, isDeletingSupplier } = useSupplierOperations();
	const { columns } = useSupplierTableColumns();

	const { data, isLoading } = useGetSuppliersQuery({
		skip: tableManager.pagination.skip,
		take: tableManager.pagination.take,
		orderByColumn: tableManager.sorting.sortKey,
		orderByAsc: tableManager.sorting.sortDir === "asc",
		search: tableManager.search.value,
	});

	const { canEdit, canDelete } = useMemo(
		() => ({
			canEdit: hasPermission("module.1.settings.suppliers", "U"),
			canDelete: hasPermission("module.1.settings.suppliers", "D"),
		}),
		[hasPermission],
	);

	const handleAskBeforeDelete = useCallback(
		(id: number) =>
			askBeforeDelete({
				title: "Excluir fornecedor",
				subtitle: `Tem certeza que deseja excluir o fornecedor #${id}?`,
				onRemove: () => handleDeleteSupplier(id),
			}),
		[askBeforeDelete, handleDeleteSupplier],
	);

	const tableData = useMemo(() => (data ? TableModel(data.data) : []), [data]);

	const tableOptions = useMemo<Omit<MRT_TableOptions<SupplierTable>, "columns" | "data">>(
		() => ({
			initialState: {
				columnOrder: tableManager.columns.columnOrder,
				columnVisibility: tableManager.columns.columnVisibility,
				columnPinning: tableManager.columns.columnPinning,
			},
			state: {
				columnOrder: tableManager.columns.columnOrder,
				columnVisibility: tableManager.columns.columnVisibility,
				columnPinning: tableManager.columns.columnPinning,
				isLoading,
			},
			onColumnOrderChange: tableManager.columns.setColumnOrder,
			onColumnVisibilityChange: tableManager.columns.setColumnVisibility,
			onColumnPinningChange: tableManager.columns.setColumnPinning,
			enableRowActions: true,
			renderRowActionMenuItems: ({ row }) => [
				<MenuItem
					key="edit"
					onClick={() => handleEditSupplier(row.original.id)}
					disabled={!canEdit}
					className="flex items-center gap-3"
					dense
					data-cy={`supplier-action-edit-${row.original.id}`}
				>
					<ListItemIcon className="min-w-0">
						<FuseSvgIcon size="xl">heroicons-outline:pencil-square</FuseSvgIcon>
					</ListItemIcon>
					<ListItemText primary="Editar" />
				</MenuItem>,
				<MenuItem
					key="delete"
					onClick={() => handleAskBeforeDelete(row.original.id)}
					disabled={isDeletingSupplier || !canDelete}
					className="flex items-center gap-3"
					dense
					data-cy={`supplier-action-delete-${row.original.id}`}
				>
					<ListItemIcon className="min-w-0">
						<FuseSvgIcon size="xl" color="error">
							heroicons-outline:trash
						</FuseSvgIcon>
					</ListItemIcon>
					<ListItemText primary="Excluir" />
				</MenuItem>,
			],
		}),
		[tableManager.columns, isLoading, handleEditSupplier, handleAskBeforeDelete, canEdit, canDelete, isDeletingSupplier],
	);

	useEffect(() => {
		if (data?.count >= 0) {
			tableManager.pagination.setTotalItems(data.count);
		}
	}, [data?.count, tableManager.pagination.setTotalItems]);

	return { columns, tableData, tableManager, tableOptions };
};
```

### 2.3 Variante com busca e filtros

Passe a busca e o filtro para a barra à direita da tabela:

```tsx
<MRTTable
	columns={columns}
	data={tableData}
	tableManager={tableManager}
	tableOptions={tableOptions}
	renderExternalToolbarContentRight={() => (
		<>
			<SearchField placeholder="Pesquisar" value={search.value} onClear={search.resetSearch} onSearch={search.setSearch} />
			<GlobalFilterForm
				FILTER_TYPE={FILTER_TYPES.SUPPLIERS_LIST}
				onFiltersApply={onFiltersApply}
				onClearFilters={onClearFilters}
				filtersConfig={filtersConfig}
				defaultValues={defaultValues}
				validationSchema={supplierFilterValidationSchema}
			/>
		</>
	)}
/>
```

Arquivos extras: `hooks/useSupplierFilterManager.ts` (chama `useFilterManager`, mantém `filterVersion` e chama `pagination.resetPagination()` ao aplicar/limpar), `hooks/useSupplierFilter.ts` (monta `filtersConfig: FilterConfig[]`), `models/FilterModel.ts` (filtro → parâmetros da query) e `schema/validationSchema.ts`. Registre a chave em `FILTER_TYPES` (`@/constants`).

## 3. Cadastro e edição

```
src/features/settings/suppliers/components/Form/
├── SupplierRegistrationForm.tsx
├── SupplierEditingForm.tsx
├── SupplierFormSkeleton.tsx
├── components/
│   └── SupplierFormFields.tsx          ← campos compartilhados entre cadastro e edição
├── hooks/
│   ├── useSupplierRegistrationForm.ts
│   ├── useSupplierEditingForm.ts
│   ├── useSubmitSupplierRegistrationForm.ts
│   └── useSubmitSupplierEditingForm.ts
├── models/
│   ├── FormModel.ts                    ← API → formulário
│   └── ApiModel.ts                     ← formulário → payload
└── schema/
    ├── validationSchema.ts
    └── validationSchema.test.ts        ← se houver refine/superRefine
```

As páginas de cadastro e edição são só a moldura:

```tsx
// SupplierRegistrationPage.tsx (edição: troque o form e use "U")
function SupplierRegistrationPage() {
	const { t } = useTranslation("settingSuppliers", { keyPrefix: "SUPPLIERS" });

	return (
		<PageSimple
			header={<PageTitle title={t("TITLE")} icon={<FolderOpen strokeWidth={1.5} size={16} />} />}
			content={<SupplierRegistrationForm />}
		/>
	);
}

export default withPermission("module.1.settings.suppliers", "C")(SupplierRegistrationPage);
```

```ts
// schema/validationSchema.ts
import { z } from "zod/v3";

export const SUPPLIER_NAME_MAX_LENGTH = 120;

export const supplierValidationSchema = z.object({
	isActive: z.boolean().default(true),
	name: z
		.string()
		.max(SUPPLIER_NAME_MAX_LENGTH, "O nome deve conter no máximo 120 caracteres")
		.refine((value) => value.trim().length > 0, { message: "Nome é obrigatório" }),
	categoryId: z
		.number()
		.nullable()
		.refine((value) => value != null, { message: "Categoria é obrigatória" }),
	description: z.string().nullable().optional(),
});

export type SupplierValidationSchema = z.infer<typeof supplierValidationSchema>;
```

```tsx
// components/SupplierFormFields.tsx
import type { UseFormReturn } from "react-hook-form";

import { RHFSelect } from "@/components/form/Select/Select";
import RHFSwitch from "@/components/form/Switch/Switch";
import { RHFTextField } from "@/components/form/TextField/TextField";
import PaperForm from "@/components/layout/Form/PaperForm";
import SectionForm from "@/components/layout/Form/SectionForm";

import { SUPPLIER_NAME_MAX_LENGTH, type SupplierValidationSchema } from "../schema/validationSchema";

type SupplierFormFieldsProps = {
	formMethods: UseFormReturn<SupplierValidationSchema>;
	categoryOptions: { label: string; value: number }[];
};

const SupplierFormFields = ({ formMethods, categoryOptions }: SupplierFormFieldsProps) => {
	const { control, formState } = formMethods;

	return (
		<PaperForm className="space-y-3">
			<SectionForm title="Informações do fornecedor">
				<RHFSwitch
					className="col-span-12"
					id="isActive"
					data-cy="isActive"
					control={control}
					name="isActive"
					label="Ativo"
					error={!!formState.errors?.isActive}
					helperText={formState.errors?.isActive?.message}
				/>
				<RHFTextField
					className="col-span-12 md:col-span-4"
					id="name"
					data-cy="name"
					control={control}
					name="name"
					label="Nome*"
					inputProps={{ maxLength: SUPPLIER_NAME_MAX_LENGTH }}
					error={!!formState.errors?.name}
					helperText={formState.errors?.name?.message}
				/>
				<RHFSelect
					className="col-span-12 md:col-span-4"
					id="categoryId"
					data-cy="categoryId"
					control={control}
					name="categoryId"
					label="Categoria*"
					options={categoryOptions}
					error={!!formState.errors?.categoryId}
					helperText={formState.errors?.categoryId?.message}
				/>
				<RHFTextField
					className="col-span-12"
					id="description"
					data-cy="description"
					control={control}
					name="description"
					label="Descrição"
					multiline
					rows={5}
					error={!!formState.errors?.description}
					helperText={formState.errors?.description?.message}
				/>
			</SectionForm>
		</PaperForm>
	);
};

export default SupplierFormFields;
```

```ts
// hooks/useSupplierRegistrationForm.ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ApiModelCreateSupplier } from "../models/ApiModel";
import { type SupplierValidationSchema, supplierValidationSchema } from "../schema/validationSchema";

export const SUPPLIER_FORM_DEFAULT_VALUES: SupplierValidationSchema = {
	isActive: true,
	name: "",
	categoryId: null,
	description: "",
};

export const useSupplierRegistrationForm = () => {
	const formMethods = useForm<SupplierValidationSchema>({
		resolver: zodResolver(supplierValidationSchema),
		defaultValues: SUPPLIER_FORM_DEFAULT_VALUES,
	});

	const prepareSubmitData = (formData: SupplierValidationSchema) => ApiModelCreateSupplier(formData);

	return { formMethods, formState: formMethods.formState, prepareSubmitData };
};
```

```ts
// hooks/useSupplierEditingForm.ts — busca por id e preenche o formulário
export const useSupplierEditingForm = (id: number) => {
	const { data, isLoading: isLoadingSupplier } = useGetSupplierByIdQuery({ id });

	const formMethods = useForm<SupplierValidationSchema>({
		resolver: zodResolver(supplierValidationSchema),
		defaultValues: SUPPLIER_FORM_DEFAULT_VALUES,
	});

	useEffect(() => {
		if (data?.data) {
			formMethods.reset(FormModel(data.data));
		}
	}, [data, formMethods]);

	const prepareSubmitData = (formData: SupplierValidationSchema) => ApiModelUpdateSupplier(formData, data?.data);

	return { formMethods, formState: formMethods.formState, prepareSubmitData, isLoadingSupplier };
};
```

```ts
// hooks/useSubmitSupplierRegistrationForm.ts (edição: sem navigate, mensagem "atualizado")
export const useSubmitSupplierRegistrationForm = () => {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const [createSupplier, { isLoading: isCreatingSupplier }] = useCreateSupplierMutation();

	const submitSupplier = async (apiData: SupplierCreatePayload) => {
		try {
			const payload = await createSupplier({ data: apiData }).unwrap();

			if (payload.success) {
				dispatch(showMessage({ message: "Fornecedor criado com sucesso", variant: "success" }));
				navigate("/settings/suppliers");
			}
		} catch (error) {
			const { message } = new FetchApiError(error.status, error.data);
			dispatch(showMessage({ message, variant: "error" }));
		}
	};

	return { submitSupplier, isCreatingSupplier };
};
```

```tsx
// SupplierRegistrationForm.tsx
const SupplierRegistrationForm = () => {
	const { formMethods, formState, prepareSubmitData } = useSupplierRegistrationForm();
	const { submitSupplier, isCreatingSupplier } = useSubmitSupplierRegistrationForm();
	const categoryOptions = useCategoryAsyncOptions();

	const onSubmit = async (formData: SupplierValidationSchema) => {
		await submitSupplier(prepareSubmitData(formData));
	};

	return (
		<div className="flex flex-col gap-3">
			<form className="contents" onSubmit={formMethods.handleSubmit(onSubmit)}>
				<SupplierFormFields formMethods={formMethods} categoryOptions={categoryOptions} />

				<div className="flex justify-end">
					<Button
						type="submit"
						variant="contained"
						disabled={!formState.isDirty || isCreatingSupplier}
						loading={formState.isSubmitting || isCreatingSupplier}
						data-cy="save-supplier"
					>
						Salvar
					</Button>
				</div>
			</form>
		</div>
	);
};
```

```ts
// hooks/useSubmitSupplierEditingForm.ts — permanece na página; não reseta o formulário
import { showMessage } from "@/@fuse/core/FuseMessage/fuseMessageSlice";
import { FetchApiError } from "@/http-client/FetchApiErrors";
import type { SupplierUpdatePayload } from "@/store/api/@types/suppliers.types";
import { useUpdateSupplierMutation } from "@/store/api/hooks";
import { useAppDispatch } from "@/store/hooks";

export const useSubmitSupplierEditingForm = () => {
	const dispatch = useAppDispatch();
	const [updateSupplier, { isLoading: isUpdatingSupplier }] = useUpdateSupplierMutation();

	const submitSupplier = async (apiData: SupplierUpdatePayload) => {
		try {
			const payload = await updateSupplier({ data: apiData }).unwrap();

			if (payload.success) {
				dispatch(showMessage({ message: "Fornecedor atualizado com sucesso", variant: "success" }));
			}
		} catch (error) {
			const { message } = new FetchApiError(error.status, error.data);
			dispatch(showMessage({ message, variant: "error" }));
		}
	};

	return { submitSupplier, isUpdatingSupplier };
};
```

```ts
// models/FormModel.ts — API → formulário (opcionais viram "" nos campos de texto)
export const FormModel = (model: Supplier): SupplierValidationSchema => ({
	isActive: model.isActive,
	name: model.name,
	categoryId: model.categoryId ?? null,
	description: model.description || "",
});

// models/ApiModel.ts — formulário → payload
export const ApiModelCreateSupplier = (data: SupplierValidationSchema): SupplierCreatePayload => ({
	isActive: data.isActive,
	name: data.name,
	categoryId: data.categoryId ?? undefined,
	description: data.description || "",
});

// O segundo argumento é o registro carregado: só fornece o `id`, que não está no formulário.
export const ApiModelUpdateSupplier = (
	data: SupplierValidationSchema,
	currentSupplier?: Supplier,
): SupplierUpdatePayload => ({
	id: currentSupplier.id,
	...ApiModelCreateSupplier(data),
});
```

```tsx
// SupplierEditingForm.tsx
import { useParams } from "react-router";

import { Button } from "@/components/ui/Button/Button";

import SupplierFormFields from "./components/SupplierFormFields";
import { useSubmitSupplierEditingForm } from "./hooks/useSubmitSupplierEditingForm";
import { useSupplierEditingForm } from "./hooks/useSupplierEditingForm";
import type { SupplierValidationSchema } from "./schema/validationSchema";
import SupplierFormSkeleton from "./SupplierFormSkeleton";

const SupplierEditingForm = () => {
	const { id } = useParams();
	const supplierId = Number.isNaN(Number(id)) ? 0 : Number(id);

	const { formMethods, formState, prepareSubmitData, isLoadingSupplier } = useSupplierEditingForm(supplierId);
	const { submitSupplier, isUpdatingSupplier } = useSubmitSupplierEditingForm();
	const categoryOptions = useCategoryAsyncOptions();

	const onSubmit = async (formData: SupplierValidationSchema) => {
		await submitSupplier(prepareSubmitData(formData));
	};

	if (isLoadingSupplier) {
		return <SupplierFormSkeleton />;
	}

	return (
		<div className="flex flex-col gap-3">
			<form className="contents" onSubmit={formMethods.handleSubmit(onSubmit)}>
				<SupplierFormFields formMethods={formMethods} categoryOptions={categoryOptions} />

				<div className="flex justify-end">
					<Button
						type="submit"
						variant="contained"
						disabled={!formState.isDirty || isUpdatingSupplier}
						loading={formState.isSubmitting || isUpdatingSupplier}
						data-cy="save-supplier"
					>
						Salvar
					</Button>
				</div>
			</form>
		</div>
	);
};

export default SupplierEditingForm;
```

`useCategoryAsyncOptions` representa um hook de `src/hooks/options/select/` que devolve `{ label, value }[]`; procure o existente para a entidade relacionada antes de criar um.

```tsx
// SupplierFormSkeleton.tsx — espelha o layout real
const SupplierFormSkeleton = () => (
	<div className="flex flex-col gap-3">
		<PaperForm className="space-y-3">
			<SectionForm title="Informações do fornecedor">
				<div className="col-span-12">
					<Skeleton.SwitchSkeleton />
				</div>
				<div className="col-span-12 md:col-span-4">
					<Skeleton.InputFieldSkeleton />
				</div>
				<div className="col-span-12 md:col-span-4">
					<Skeleton.InputFieldSkeleton />
				</div>
				<div className="col-span-12">
					<Skeleton.BoxSkeleton height={120} />
				</div>
			</SectionForm>
		</PaperForm>
		<div className="col-span-12 flex justify-end">
			<Skeleton.ButtonSkeleton width={100} height={40} />
		</div>
	</div>
);
```

Pontos fixos do padrão:

- O botão **Salvar** fica fora do `PaperForm`, alinhado à direita, desabilitado enquanto `!isDirty`, com `loading` durante o envio.
- O cadastro navega de volta para a listagem após sucesso; a edição permanece na página (sem `reset`).
- Em formulário de página os campos não recebem `disabled` durante o envio: o botão com `loading` já bloqueia o reenvio. Em diálogos, desabilite os campos (§5).
- Formulário de página não tem botão Cancelar (o breadcrumb e o menu servem de volta). Diálogos têm.

## 4. Detalhes com abas

```tsx
import { CustomTabPanel } from "@/components/ui/Tabs/CustomTabPanel";
import { Tab } from "@/components/ui/Tabs/Tab";
import { Tabs } from "@/components/ui/Tabs/Tabs";
import { useTabNavigation } from "@/hooks/useTabNavigation";

export const SUPPLIER_TAB = { GENERAL: 0, CONTACTS: 1, HISTORY: 2 } as const;

const SupplierDetails = () => {
	const [tab, setTab] = useTabNavigation("supplierTab", String(SUPPLIER_TAB.GENERAL));
	const currentTab = Number(tab);

	return (
		<>
			<div className="flex items-center gap-3">
				<Tabs className="min-w-0 flex-1" value={currentTab} onChange={(_, newIndex) => setTab(String(newIndex))}>
					<Tab label="Dados gerais" value={SUPPLIER_TAB.GENERAL} data-cy="tab-general" />
					<Tab label="Contatos" value={SUPPLIER_TAB.CONTACTS} data-cy="tab-contacts" />
					<Tab label="Histórico" value={SUPPLIER_TAB.HISTORY} data-cy="tab-history" />
				</Tabs>
				<div className="flex shrink-0 items-center gap-2">{/* ações da página */}</div>
			</div>

			<CustomTabPanel index={currentTab} value={SUPPLIER_TAB.GENERAL}>
				<SupplierGeneral />
			</CustomTabPanel>
			<CustomTabPanel index={currentTab} value={SUPPLIER_TAB.CONTACTS}>
				<SupplierContacts />
			</CustomTabPanel>
			<CustomTabPanel index={currentTab} value={SUPPLIER_TAB.HISTORY}>
				<SupplierHistory />
			</CustomTabPanel>
		</>
	);
};
```

Conteúdo de cada aba: um `PaperForm` com `SectionForm`s. Valores somente leitura usam `DetailField`:

```tsx
<PaperForm>
	<SectionForm title="Dados gerais">
		<DetailField className="col-span-12 md:col-span-3" label="Nome" value={supplier.name} />
		<DetailField className="col-span-12 md:col-span-3" label="CNPJ" value={supplier.document} />
		<DetailField className="col-span-12" label="Observações" value={supplier.notes} />
	</SectionForm>
</PaperForm>
```

- Página de detalhes que abre diálogos: exporte com `withPermission(id, "R")(withDialog(Page))`.
- Aba condicional: renderize o `Tab` e o `CustomTabPanel` sob a mesma condição.
- Em formulários com abas cada aba fica numa subpasta `tabs/<NomeDaAba>/`.

## 5. Diálogo de formulário

```
components/SupplierContactDialog/
├── index.tsx
├── hooks/useSupplierContactDialog.ts
├── models/models.ts                  ← EMPTY_FORM, FormModel, ApiModel
└── schema/validationSchema.ts
```

```tsx
// index.tsx
type SupplierContactDialogProps = {
	open: boolean;
	supplierId: number;
	contactId: number | null; // null = cadastro, número = edição
	onClose: () => void;
};

const SUPPLIER_CONTACT_FORM_ID = "supplier-contact-form";

const SupplierContactDialog = ({ open, supplierId, contactId, onClose }: SupplierContactDialogProps) => {
	const { formMethods, formState, isLoadingContact, isSaving, handleClose, handleSave } = useSupplierContactDialog({
		open,
		supplierId,
		contactId,
		onClose,
	});
	const { control } = formMethods;
	const errors = formState.errors;
	const isLocked = isSaving || isLoadingContact;

	return (
		<Dialog.Dialog fullWidth open={open} onClose={handleClose} maxWidth="md" data-cy="supplier-contact-dialog">
			<Dialog.DialogTitle>Informações do contato</Dialog.DialogTitle>
			<Dialog.DialogContent>
				<GridForm className="p-1">
					<form id={SUPPLIER_CONTACT_FORM_ID} className="contents" onSubmit={handleSave}>
						<RHFTextField
							className="col-span-12 md:col-span-6"
							control={control}
							name="name"
							label="Nome*"
							disabled={isLocked}
							error={!!errors.name}
							helperText={errors.name?.message}
							data-cy="supplier-contact-name"
						/>
						<RHFTextFieldMask
							className="col-span-12 md:col-span-6"
							control={control}
							name="phone"
							label="Telefone"
							mask="phone"
							disabled={isLocked}
							error={!!errors.phone}
							helperText={errors.phone?.message}
							data-cy="supplier-contact-phone"
						/>
					</form>
				</GridForm>
			</Dialog.DialogContent>
			<Dialog.DialogActions>
				<Button color="inherit" variant="outlined" onClick={handleClose} disabled={isSaving}>
					Cancelar
				</Button>
				<Button
					type="submit"
					form={SUPPLIER_CONTACT_FORM_ID}
					variant="contained"
					loading={isSaving}
					disabled={isLoadingContact}
					data-cy="save-supplier-contact"
				>
					Salvar
				</Button>
			</Dialog.DialogActions>
		</Dialog.Dialog>
	);
};
```

```ts
// hooks/useSupplierContactDialog.ts
export const useSupplierContactDialog = ({ open, supplierId, contactId, onClose }: Args) => {
	const dispatch = useAppDispatch();
	const isEditing = contactId != null;

	const { data: contact, isFetching: isLoadingContact } = useGetSupplierContactByIdQuery(
		{ id: contactId ?? 0 },
		{ skip: !open || !isEditing },
	);
	const [createContact, { isLoading: isCreating }] = useCreateSupplierContactMutation();
	const [updateContact, { isLoading: isUpdating }] = useUpdateSupplierContactMutation();
	const isSaving = isCreating || isUpdating;

	const formMethods = useForm<SupplierContactValidationSchema>({
		resolver: zodResolver(supplierContactValidationSchema),
		defaultValues: EMPTY_SUPPLIER_CONTACT_FORM,
	});

	useEffect(() => {
		if (!open) return;
		formMethods.reset(isEditing && contact ? FormModelSupplierContact(contact) : EMPTY_SUPPLIER_CONTACT_FORM);
	}, [open, isEditing, contact, formMethods]);

	const handleClose = useCallback(() => {
		if (isSaving) return;
		onClose();
	}, [isSaving, onClose]);

	const handleSave = useCallback(
		async (formData: SupplierContactValidationSchema) => {
			const data = ApiModelSupplierContact(formData);

			try {
				if (isEditing) {
					await updateContact({ id: contactId, supplierId, data }).unwrap();
				} else {
					await createContact({ data: { ...data, supplierId } }).unwrap();
				}

				dispatch(
					showMessage({
						message: isEditing ? "Contato alterado com sucesso" : "Contato cadastrado com sucesso",
						variant: "success",
					}),
				);
				onClose();
			} catch (error) {
				const { message } = new FetchApiError(error.status, error.data);
				dispatch(showMessage({ message, variant: "error" }));
			}
		},
		[isEditing, contactId, supplierId, updateContact, createContact, dispatch, onClose],
	);

	return {
		formMethods,
		formState: formMethods.formState,
		isLoadingContact: isEditing && isLoadingContact,
		isSaving,
		handleClose,
		handleSave: formMethods.handleSubmit(handleSave),
	};
};
```

Regras do diálogo:

- O `form` fica **dentro** do `DialogContent` com `className="contents"` e um `id`; o botão Salvar, nas `DialogActions`, aponta para ele com `form={ID}`.
- Um mesmo diálogo cria e edita (`xxxId: number | null`).
- A query de edição só roda com o diálogo aberto (`skip: !open || !isEditing`); o formulário é resetado a cada abertura.
- Fechar é bloqueado durante o salvamento. Todos os campos ficam desabilitados enquanto salva ou carrega.

Estado dos diálogos no componente pai (união discriminada, todos renderizados como irmãos):

```tsx
type SupplierDialog = { kind: "contact"; contactId: number | null } | { kind: "document"; documentId: number } | null;

const [dialog, setDialog] = useState<SupplierDialog>(null);
const handleCloseDialog = useCallback(() => setDialog(null), []);

<SupplierContactDialog
	open={dialog?.kind === "contact"}
	supplierId={supplierId}
	contactId={dialog?.kind === "contact" ? dialog.contactId : null}
	onClose={handleCloseDialog}
/>
```

Alternativa quando o diálogo é aberto de vários pontos da página: `withDialog` + `useDialogControl(ID)` (02 §6.3).

## 6. Tabela embutida numa seção

Dentro de uma aba ou de um formulário, a tabela não tem paginação de servidor nem altura de viewport:

```tsx
<PaperForm>
	<SectionForm title="Contatos">
		<div className="col-span-12" data-cy="supplier-contacts-table">
			<MRTTable
				columns={columns}
				data={tableData}
				tableOptions={tableOptions}
				tableContainer="normal"
				renderExternalToolbarContentLeft={() => (
					<Button
						variant="outlined"
						color="inherit"
						onClick={handleAddContact}
						disabled={!canAddContact}
						startIcon={<FuseSvgIcon size="md">heroicons-outline:plus</FuseSvgIcon>}
						data-cy="supplier-add-contact"
					>
						Adicionar contato
					</Button>
				)}
			/>
		</div>
	</SectionForm>

	{/* diálogos irmãos da tabela */}
</PaperForm>
```

`tableOptions` típico: `{ state: { isLoading }, enablePagination: false, enableSorting: false, enableRowActions: true, renderRowActionMenuItems, renderDetailPanel? }`.

## Não faça

- Lógica de dados dentro do componente: queries, mutations e `tableOptions` ficam em hooks.
- Mapear a resposta da API dentro do JSX: use `TableModel` / `FormModel` / `ApiModel`.
- Esquecer `withPermission` na página ou a checagem `hasPermission` nos botões e ações.
- Formulário de página com o botão Salvar dentro do `PaperForm`.
- Diálogo com o `<form>` envolvendo `DialogActions`.
