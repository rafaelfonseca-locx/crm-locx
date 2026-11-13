# 01 — Fundamentos

**Quando ler:** antes de escolher qualquer cor, tamanho de fonte, espaçamento, raio, sombra ou ícone.

Fontes da verdade no código:

- Paletas: `src/configs/themesConfig.ts` (temas `default` = claro e `defaultDark` = escuro)
- Tipografia e overrides de componentes: `src/@fuse/default-settings/FuseDefaultSettings.ts`
- Montagem do tema: `src/@fuse/core/FuseSettings/hooks/fuseThemeHooks.tsx` (`defaultThemeOptions` ← `themesConfig` ← `mustHaveThemeOptions`)
- Tailwind: `src/styles/index.css` (sem `tailwind.config`; tudo em `@theme`)
- Tipos extras da paleta: `src/theme.d.ts`

## 1. Cores

Sempre acesse as cores **pelo tema**, nunca com hexadecimal no componente.

```tsx
// Certo
<Typography color="text.secondary">…</Typography>
<FuseSvgIcon color="error">heroicons-outline:trash</FuseSvgIcon>
<Box sx={(theme) => ({ borderColor: theme.palette.divider, backgroundColor: theme.palette.background.paper })} />
<Chip color="success" label="Aprovado" />

// Errado
<div className="bg-primary text-primary" />
<div style={{ color: "#FFCC00" }} />
```

### 1.1 Cores de marca e de status

| Token | Claro (main / dark / light / contraste) | Escuro | Uso |
|---|---|---|---|
| `primary` | `#FFCC00` / `#FBC02D` / `#FDD835` / `#000000` | `#FFCC00` / `#FBC02D` / `#FFEE58` / `rgba(0,0,0,.87)` | Amarelo LocX. Botão principal (`contained`), foco de input, ícone do título da página, selecionados |
| `secondary` | `#3A271A` / `#2E1E13` / `#6B4F3E` / `#FFFFFF` | igual | Marrom LocX. Chips/realces secundários, valor monetário em destaque no tema claro |
| `error` | `#D32F2F` / `#C62828` / `#EF5350` | `#F44336` / `#D32F2F` / `#E57373` | Excluir, erros de validação |
| `warning` | `#EF6C00` / `#E65100` / `#FF9800` | `#FFA726` / `#F57C00` / `#FFB74D` | Alertas, avisos de permissão |
| `info` | `#0288D1` / `#01579B` / `#03A9F4` | `#29B6F6` / `#0288D1` / `#4FC3F7` | Informação, links |
| `success` | `#2E7D32` / `#1B5E20` / `#4CAF50` | `#66BB6A` / `#388E3C` / `#81C784` | Sucesso, aprovado, ativo |

O botão `contained` primário tem **texto preto** sobre amarelo (contraste), não branco.

### 1.2 Texto, fundo, divisor e ações

| Token | Claro | Escuro |
|---|---|---|
| `text.primary` | `rgba(0,0,0,.87)` | `#FFFFFF` |
| `text.secondary` | `rgba(0,0,0,.60)` | `rgba(255,255,255,.70)` |
| `text.disabled` | `rgba(0,0,0,.38)` | `rgba(255,255,255,.38)` |
| `background.default` (fundo da página) | `#F6F6F6` | `#121212` |
| `background.paper` / `paper-elevation-1` (cartões) | `#FFFFFF` | `#1E1E1E` |
| `divider` | `rgba(0,0,0,.15)` | `rgba(255,255,255,.12)` |
| `action.hover` / `selected` | `rgba(0,0,0,.04)` / `.08` | `rgba(255,255,255,.08)` / `.16` |

O fundo da página é cinza-claro e os blocos de conteúdo são `Paper` brancos — é isso que dá a aparência de "cartões" do sistema.

### 1.3 Tokens customizados

- `palette.<cor>._states.{hover, selected, focus, focusVisible, outlinedBorder}` — versões translúcidas de cada cor (claro: `.04/.08/.12/.3/.5`). Use em hovers e bordas: `sx={{ "&:hover": { backgroundColor: "primary._states.hover" } }}`.
- `palette.common.black_states` / `white_states` — mesmas opacidades sobre preto/branco.
- `palette.background["paper-elevation-0".."paper-elevation-24"]` — fundo por elevação (no claro tudo `#FFFFFF`).
- `palette._components` — cores de componentes MUI (fundo de alert por severidade, tooltip `rgba(97,97,97,.9)`, snackbar `#323232`, borda de chip `#BDBDBD`, borda de input `rgba(0,0,0,.23)`).
- Tailwind `@theme` só define duas cores próprias: `--color-table-selected-row: #FFF9C4` e `--color-table-error-cell: #f4433626`.

## 2. Tipografia

- Família: `"Inter var", Roboto, "Helvetica", Arial, sans-serif` (carregada em `index.html` de `/assets/fonts/inter/inter.css`). `font-feature-settings: "salt"`.
- **Tamanho base do corpo: 13px** (`body1` e `body2` = `0.8125rem`).
- Pesos: 300, 400, 500, 600 (botões e cabeçalho de tabela), 700 (`font-bold`, títulos de página e seção).

| Variante MUI | Tamanho | Uso típico |
|---|---|---|
| `h1`…`h6` | 40 / 36 / 32 / 28 / 24 / 20 px | Raro em telas de gestão |
| `subtitle1` | 16px | Título de `SectionForm` (com `font-bold`) |
| `subtitle2` | 14px | Título de sub-seção (`isSubSection`, `font-medium`) |
| `body1` / `body2` | 13px | Texto e valores |
| `caption` | 12px | Rótulos de `DetailField`, legendas, metadados |
| `button` | 14px, peso 600, sem caixa alta | Botões |

Padrões de composição:

```tsx
<Typography className="text-xl font-bold truncate">Título da página</Typography>   // PageTitle
<Typography variant="subtitle1" className="font-bold">Seção</Typography>             // SectionForm
<Typography variant="caption" color="text.secondary">Rótulo</Typography>
<Typography variant="body2" fontWeight={500}>Valor</Typography>
```

Escala Tailwind (customizada, um degrau menor que o padrão): `text-xxs` 8px · `text-xs` 10px · `text-sm` 12px · `text-base` 14px · `text-lg` 18px · `text-xl` 20px · `text-2xl` 24px · `text-3xl` 30px · `text-4xl` 36px. Prefira `Typography` com `variant`; use `text-*` para ajustes pontuais.

## 3. Espaçamento e grid

- Espaçamento MUI: `theme.spacing(1)` = 8px. Tailwind: `--spacing: 0.25rem` → `gap-3` = 12px, `p-4` = 16px.
- Valores mais usados: `gap-3` (entre campos, entre blocos), `space-y-3` (entre seções num `PaperForm`), `p-4` (interno do `PaperForm`), `gap-2` (botões lado a lado), `space-x-2` (ações do cabeçalho).
- **Grid de formulário: 12 colunas, `gap-3`** (`GridForm`, usado dentro de toda `SectionForm`). Cada campo define a própria largura:

| Largura | Classe | Uso |
|---|---|---|
| Linha inteira | `col-span-12` | textarea, switch, radio, upload, tabela embutida |
| 1/2 | `col-span-12 md:col-span-6` | campos longos (nome, fornecedor) |
| 1/3 | `col-span-12 md:col-span-4` | campo padrão em telas de cadastro |
| 1/4 | `col-span-12 md:col-span-3` | selects, datas, valores, números, códigos e siglas curtas |

No mobile (abaixo de `md`) todo campo ocupa `col-span-12`, exceto pares numéricos curtos (`col-span-6 md:col-span-3`).

## 4. Breakpoints

| Nome | MUI e Tailwind |
|---|---|
| `xs` | 0 |
| `sm` | 600px (`37.5rem`) |
| `md` | 960px (`60rem`) |
| `lg` | 1280px (`75rem`) |
| `xl` | 1920px (`120rem`) |

Atenção: os breakpoints do Tailwind foram **redefinidos** para igualar os do MUI; `md:` aqui é 960px, não 768px.

## 5. Raios, alturas e sombras

| Elemento | Raio | Altura |
|---|---|---|
| `Paper` (MUI) / `PaperForm` | 12px (`rounded-xl`) | — |
| `Dialog` | 12px do tema; o wrapper aplica `rounded-md` | Título e ações com 64px |
| `Button` | 4px | small 32 · medium 40 · large 48 |
| `IconButton` | 4px | 40 / 36 / 32 |
| Input / Select / Autocomplete | 4px | medium 40 · small 36 |
| `Chip` | 4px | medium 32 · small 28 |
| `Alert` | 4px | 32 (small 24) |
| `Tab` | 8px | 36 (barra de abas 42) |
| Popover / menu | 8px | — |
| Avatar | 4px (variante `rounded`), 32×32, fundo `primary.main` | — |

- Botões não têm sombra (`boxShadow: none`). Cartões usam `shadow-sm` (o `PaperForm` aplica `inset-shadow-xs shadow-sm`).
- Raios Tailwind mais usados: `rounded-md`, `rounded-lg`, `rounded-full` (avatares, pílulas).

## 6. Dark mode

- O tema troca entre "Default" e "Default Dark" (`src/configs/themeOptions.ts`); o `FuseTheme` coloca a classe `.light` ou `.dark` no `<body>`.
- Variante Tailwind: `dark:` (`@custom-variant dark (&:where(.dark, .dark *))`).
- Como as cores vêm do tema, componentes que usam `palette.*`/`sx` funcionam nos dois modos sem código extra. Só use `dark:` para casos fora do tema.
- Qualquer elemento com classe `border*` ou `divide-*` recebe automaticamente `palette.divider` como cor de borda.

## 7. Ícones

### 7.1 `FuseSvgIcon` (padrão para ações, menus e campos)

```tsx
import FuseSvgIcon from "@/@fuse/core/FuseSvgIcon";

<FuseSvgIcon size="xl">heroicons-outline:pencil-square</FuseSvgIcon>
<FuseSvgIcon size="xl" color="error">heroicons-outline:trash</FuseSvgIcon>
```

- Filho no formato `"<conjunto>:<nome>"` → sprite em `public/assets/icons/<conjunto>.svg`. Conjunto principal: `heroicons-outline` (também existe `heroicons-solid`).
- `size`: `xs` 12 · `sm` 14 · `md` 16 · `lg` 18 · **`xl` 20 (padrão)** · `xxl` 24 · `xxxl` 32.
- `color`: `inherit` (padrão), `primary`, `secondary`, `info`, `success`, `warning`, `error`, `action`, `disabled`.

| Ação | Ícone |
|---|---|
| Editar | `heroicons-outline:pencil-square` |
| Excluir | `heroicons-outline:trash` (com `color="error"`) |
| Adicionar | `heroicons-outline:plus` (`size="md"` como `startIcon`) |
| Documento | `heroicons-outline:document-text` |
| Download | `heroicons-outline:arrow-down-tray` |
| Anexo | `heroicons-outline:paper-clip` |
| Visualizar | `heroicons-outline:eye` |
| Informação (tooltip) | `heroicons-outline:information-circle` |
| Fechar | `heroicons-outline:x-mark` |
| Duplicar | `heroicons-outline:document-duplicate` |
| Navegação | `heroicons-outline:chevron-left` / `chevron-right` / `chevron-down` |
| Bloqueado | `heroicons-outline:lock-closed` |

### 7.2 `lucide-react` (títulos de página, estados vazios, ícones de destaque)

```tsx
import { FolderOpen } from "lucide-react";

<PageTitle title="Categorias" icon={<FolderOpen strokeWidth={1.5} size={16} />} />
```

- **Sempre `strokeWidth={1.5}`.** Tamanhos: 16 (ícone de `PageTitle` e menus), 18, 20; 40 em estados vazios.
- Ícones de menu de ação com lucide usam `{ size: 20, strokeWidth: 1.5 }`.

## 8. MUI × Tailwind: quem faz o quê

| Preocupação | Use |
|---|---|
| Componentes (botão, input, diálogo, menu, chip, tooltip) | MUI (via wrappers do projeto) |
| Cor, fundo, borda temática | Props MUI (`color`, `variant`) ou `sx` com `palette` |
| Layout, espaçamento, grid, tamanho, truncamento | Tailwind no `className` |
| Estilo reutilizável complexo | `styled()` do MUI (raro) |

Proporção no código: ~5.000 usos de `className` Tailwind contra ~80 `sx` nas features. Prefira `className`; use `sx` só quando a regra depende do tema.

## Não faça

- `bg-primary`, `text-primary`, `border-primary` ou qualquer token estilo shadcn.
- Hexadecimal solto em componente (exceto em dados, como a cor de um status vinda da API).
- Breakpoints do Tailwind padrão na cabeça (`md` aqui é 960px).
- Ícone lucide sem `strokeWidth={1.5}`.
- `@mui/icons-material` (só é usado em um arquivo legado).
