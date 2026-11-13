# Plano de funcionalidades (reunião de handoff de 13/11/2026)

Mapeamento do que a reunião comercial pediu ou mostrou que falta no CRM. Nada aqui foi desenvolvido ainda. A ordem no fim é a sugestão de execução.

## 1. Parceiros: desconto e remuneração

**Regra de negócio.** Cada parceiro tem um acordo próprio, e as duas partes são opcionais:
- **Desconto para o indicado**: o parceiro pode oferecer desconto aos clientes que ele indica (ex.: 10% no primeiro ano).
- **Remuneração do parceiro**: pode existir ou não. Quando existe, é percentual da mensalidade (cashback recorrente ou por um período), valor fixo por venda ou desconto na assinatura do próprio parceiro.

**Dados**
- No parceiro: tipo de acordo (só indicação, desconto, remuneração, os dois), percentual ou valor do desconto, regra da remuneração (percentual, valor fixo, por quantos meses), observações do acordo, responsável padrão pelas indicações (ver item 9).
- Na venda indicada: desconto aplicado, valor da remuneração calculado, status (não se aplica, pendente, paga), data do pagamento.

**Telas**
- Parceiro: card "Acordo" editável e, nas indicações, colunas Desconto, Remuneração e Status.
- Página Parceiros: total a pagar (pendente) e pago no período.
- Ao marcar como ganho um lead indicado: o diálogo mostra o desconto do parceiro e já calcula a remuneração.

## 2. Pós-venda (nova aba)

Objetivo: acompanhar quem virou cliente e evitar cancelamento.

- Ao marcar como ganho, o cliente entra no pós-venda com tarefas automáticas: boas-vindas (D+2), check-in de uso (D+7), check-in (D+30) e revisão (D+90).
- Saúde do cliente: Saudável, Atenção, Em risco, Cancelou. Atualizada pelo responsável a cada contato.
- Motivo de cancelamento obrigatório ao marcar Cancelou (lista padronizada + detalhe).
- Aba **Pós-venda** no menu: clientes por saúde, próximos check-ins, atrasados, cancelamentos do mês.
- Início: indicador de clientes em risco e cancelamentos.

## 3. Trial com o comercial

- Campo no trial: **Demo com dados de exemplo** ou **com os dados do cliente** (o vendedor pergunta antes de montar).
- Marcação **Acessou o trial?** (sim / não / quase não usou), com aviso no card quando passar 2 dias sem acesso.
- Item padrão no roteiro: "Confirmar primeiro acesso".
- Responsabilidade de criar, acompanhar e excluir o trial: depende do alinhamento com o Filipão; no CRM basta o vendedor registrar.

## 4. Cadência de retomada D0/D2/D5/D10

- Ação **Iniciar cadência** no lead (e em lote, item 7): cria 4 tarefas (D0, D2, D5, D10) para o responsável.
- Registrar resposta encerra a cadência e apaga as tarefas restantes.
- Sem resposta depois do D10: o CRM sugere marcar como perdido com motivo "Sem resposta".
- Indicador no card do pipeline: "Cadência D5 de D10".

## 5. Situação "Em nutrição"

- Novo status ao lado de Em aberto, Ganho e Perdido. Sai do pipeline ativo, mas não conta como perda.
- Campo "Retomar em" (data) que cria uma tarefa de lembrete.
- Aba **Em nutrição** na lista de leads.
- Migração: leads com a tag `nutricao` passam para o novo status.

## 6. Campanha / oferta no lead

- Campo **Campanha** (ex.: Black Friday 2026), escolhido de uma lista que a gestão mantém.
- Filtro por campanha no pipeline e na lista; no Início, leads e vendas por campanha.
- Migração: tag `black-friday` vira a campanha "Black Friday 2026".

## 7. Ações em lote

- Na lista de leads: selecionar vários e **Transferir responsável**, **Adicionar tag**, **Definir campanha**, **Iniciar cadência**, **Mover para nutrição**.

## 8. Motivo de perda detalhado e funcionalidades pedidas

- Motivos padronizados: Preço, Falta de funcionalidade, Cadastro/implantação complexa, Sem tempo no trial, Não acessou o trial, Sem resposta, Fora do perfil, Escolheu concorrente, Pausado, Outro. Detalhe em texto obrigatório.
- Campo **Funcionalidades pedidas** no lead (lista: nota fiscal, integração com WhatsApp, gestão de obras, limite de IA por plano, outros), preenchível a qualquer momento, não só na perda.
- Relatório para produto: ranking de funcionalidades pedidas, com quantos leads e quanto de receita estimada dependem de cada uma.
- Migração: tags `pedido:*` viram funcionalidades pedidas.

## 9. Responsável padrão por parceiro ou indicador

- No parceiro: responsável padrão das indicações. Lead novo com "Indicado por" já entra com esse responsável.
- **Indicação interna** (CEO, colaboradores): campo "Indicado por (pessoa da LocX)" para indicações de quem trabalha aqui (ex.: Paulo, Fabrício), sem acordo de parceria, com regra de responsável padrão (ex.: indicações do Paulo → Douglas).
- Migração: tag `indicacao-paulo` vira indicação interna do Paulo.

## 10. Mais de um contato por lead

- Contatos do lead: nome, cargo, e-mail, telefone e papel (Decisor, Usuário, Financeiro, Indicador).
- O contato principal continua sendo o do lead; os demais aparecem no card Contato com atalhos de WhatsApp e e-mail.
- Exemplos da reunião: F4 Holding (Júlio decisor, Ana Dutra usuária); André e Rodrigo; Vicente Bolina (contato com Paty).

## 11. "Como chegou até nós"

- Campo com lista: Site/Google, Instagram, Workshop, Indicação de parceiro, Indicação interna, Evento, ChatGPT/IA, Base fria, Outro, mais detalhe livre.
- Perguntado no pré-atendimento; aparece na qualificação.
- Relatório no Início junto de "Canal de entrada".

## 12. Relatório por vendedor

- Página ou visão para a reunião de acompanhamento: por vendedor, leads em aberto por etapa, atividades registradas na semana, leads sem atividade há mais de 7 dias, cadências em andamento, trials, ganhos e perdas com motivo.
- Filtro de período e exportação (PDF ou planilha).

## 13. Entrada da base fria (automação de mensagens)

- Webhook dedicado para a automação de disparo: quem responder entra como lead novo com canal **Base fria** e origem da lista (ex.: Localiza, Desktop, Bluefit).
- Distribuição no rodízio, como os leads do RD.

## Ordem sugerida para o desenvolvimento

1. **Base de dados comuns**: motivos de perda padronizados e funcionalidades pedidas (8), campanha (6), status Em nutrição (5), como chegou (11). São campos e migrações das tags aplicadas pelo plano da reunião.
2. **Rotina do vendedor**: cadência D0–D10 (4) e ações em lote (7).
3. **Parceiros**: acordo, desconto, remuneração (1), responsável padrão e indicação interna (9).
4. **Pós-venda** (2).
5. **Trial** (3), **contatos múltiplos** (10), **relatório por vendedor** (12) e **base fria** (13).
