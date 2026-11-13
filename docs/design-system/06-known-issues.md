# 06 — Problemas conhecidos (não copie)

**Quando ler:** antes de usar um trecho existente como modelo. Estes pontos existem no código hoje e estão fora do padrão; ao encontrar algo parecido, siga a documentação, não o código.

| Onde | Problema | O que fazer |
|---|---|---|
| `src/configs/themesConfig.ts` (tema claro, `info._states.outlinedBorder`) e `src/@fuse/default-settings/FuseDefaultSettings.ts` | Valor malformado `"rgba(rgba(2, 136, 209, 0.5)"`. A borda outlined de `info` não renderiza. | Evite depender de `info._states.outlinedBorder` até a correção. |
| `src/configs/themesConfig.ts` (tema claro, `action.focus`) | `rgba(255,255,255,0.12)` — branco sobre fundo claro, foco invisível. | Para foco visível use `primary._states.focusVisible`. |
| `src/styles/index.css` (`.favorite-icon`) | Usa `var(--color-primary)`, que não está definido. | Não use variáveis CSS de cor de marca; use o tema MUI. |
| Diálogos de anexo (ex.: `src/features/legal-proceedings/Form/LegalProceedingsEditingForm/tabs/LegalProceedingsAttachments/Form/components/LegalProceedingsAttachmentFormRegistrationDialog.tsx`) | `data-cy` copiados de outra tela (`readjustment-index-registration-*`). | Crie `data-cy` próprios da tela (04 §3). |
| `src/features/dashboard/charts/components/IndicatorCard.tsx` | Cores Tailwind cruas (`var(--color-blue-500)` etc.). | Use `palette.*` do tema. |
| `src/components/ui/IAChat/components/MessageBubbleText.tsx` | `text-primary` em links e `bg-gray-*` fixos. | Use `color="primary"`/`sx` com o tema. |
| `src/components/ui/Dialog/Dialog.tsx` | O wrapper aplica `rounded-md` (6px) por cima do raio 12 do tema. | Não adicione outro raio; aceite o do wrapper. |
| `PaperForm` (`src/components/layout/Form/PaperForm.tsx`) | Não repassa props extras: `<PaperForm data-cy="…">` (como em `MaintenancePurchases/index.tsx`) perde o `data-cy`. | Coloque o `data-cy` num `div` interno ou externo. |
| Mensagens antigas | Algumas exclusões dizem "deletado com sucesso". | Novas telas: "excluído/a com sucesso". |
| `FusePageSimple` / `FusePageCarded` (`src/@fuse/core`) | Existem mas nenhuma página usa. | Use `PageSimple` de `@/components/layout/Page`. |
| `@mui/icons-material` | Instalado, usado em um arquivo só. | Use `FuseSvgIcon` ou `lucide-react`. |
| `src/@fuse/tailwind/plugins/icon-size.js` | Plugin `icon-size-*` nunca usado. | Use a prop `size` do `FuseSvgIcon`. |
