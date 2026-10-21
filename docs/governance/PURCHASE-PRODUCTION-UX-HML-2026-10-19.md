# Compras e Produção — revisão de UX, 19/10/2026

Continuação solicitada pelo usuário após a simplificação de Cenários.
Base `bf71274`, branch `feat/input-catalog-kg-purchases`. Publicação somente
no `cacau-v1-hml`, dentro da autorização de usabilidade vigente.

## Comportamento publicado

Commit `a76c37c31842ca588e9fa0c5d2ff64c5c846ba24`, versão HML
`6bc5bd55-2bca-4adb-a8b1-36b6b42bf1a6` a100%, publicada às03:01 Brasília.
Recibo: `evidence/purchase-production-ux-hml-2026-10-19.json`.


Compras mostra quantidade de itens e total somado em centavos exatos. O total
pago por item não é multiplicado pela quantidade. Valores incompletos ou
inválidos deixam o resumo pendente, sem mostrar total fechado fictício.
Ingredientes em massa indicam compra em kg; embalagens usam unidades legíveis.
Lote/validade e nota/observações ficam em seções opcionais expansíveis.
O botão explicita que registrar a compra atualiza imediatamente o estoque.
Fechar conserva preenchimento e chave idempotente; erro conserva ambos.

Produção mantém rascunho separado de conclusão. “Quantidade de receitas”
explica o antigo multiplicador. Aproveitamento variável de Bordinhas e perdas
são opcionais expansíveis. Mão de obra e energia continuam explícitas e
obrigatórias segundo o contrato do servidor, sem repetir a diária por lote.
Após gravação bem-sucedida, os campos de custos são limpos para o próximo
lote. Erro antes da gravação preserva todos os dados.

Mudanças de data, receita, quantidade, custos e inclusão/remoção de saídas ou
perdas invalidam a prévia anterior. Trocar receita limpa também perdas da
receita anterior. A prévia aparece antes das ações e recebe rolagem visual
automática. Detalhes e auditoria abrem em modal nativo, com foco restaurado,
fechamento bloqueado enquanto a conclusão estiver em andamento e confirmação
explícita existente antes de concluir. O mesmo backend revalida estoque e
custos transacionalmente. Não foi alterada a regra de conclusão ou FIFO.

Falha de atualização visual após salvar compra/rascunho ou concluir lote
informa que a gravação ocorreu e orienta recarregar. Após conclusão salva e
leitura de detalhes indisponível, o modal antigo é fechado para não deixar
uma ação de conclusão obsoleta. Erros de escrita continuam reportados.

Paginação das duas rotas aceita também números serializados como texto;
nav de paginação quebra linha no celular. Nenhuma mudança de schema,
endpoint, autenticação, RBAC, cálculo de produção ou contrato financeiro.

## Ensaios e limites

529 testes Node, lint/tipos/formatação e Knip aprovados, sem novo achado na
baseline. Seis testes de navegador importam as próprias páginas de Compras e
Produção, com aliases Vite exclusivamente na fixture para funções sintéticas,
roteador de ensaio e layout. Servidor sem config do app ou arquivos locais
de ambiente; requisições externas abortadas. Cobrem total sem multiplicar kg,
campos/mesma chave após falha, prévia invalidada, limpeza de custos, conclusão
confirmada com falha posterior de leitura e celular375×812.

Nove ensaios de regressão de Cenários e taxas/modais financeiros aprovados,
pois compartilham o servidor de preview agora parametrizável. Os aliases não
existem no build do produto. Funções de escrita, validações, transações e
permissões reais continuam cobertas pela suíte existente; a fixture não é
uma homologação de gravações em banco.

Antes da publicação, consulta independente confirmou21 tabelas relevantes,
incluindo compras/lotes/consumos/perdas/FIFO, cenários, catálogo, receitas,
perfis e auditoria operacional. Nenhum fato operacional criado no HML.
Build HML isolado aprovado. CI39207328944 e CodeQL39207328870 concluídos
com sucesso; análises1978472319 (JS/TS),1978471403 (Actions) e1978471244
(Python) sem resultados ou erros; zero alertas abertos no commit publicado.

Conferência autenticada HML: Compras mostra resumo pendente em vez de total
fictício, kg/unidades legíveis, opcionais recolhidos e ação explícita de
atualizar estoque. Produção exibe receita-base2/850 g frios, data19/10/2026,
quantidade de receitas e custos reais em branco; opcionais recolhidos.
Modais foram abertos e fechados sem preencher/salvar compras ou lotes.
Não havia lote real para abrir auditoria/concluir no HML; esses caminhos
foram exercitados somente nos testes locais, conforme limite registrado.

Leitura independente após a conferência confirmou21 tabelas com as mesmas
contagens e digests. Nenhum fato novo e nenhuma alteração de auditoria,
catálogo, receita, perfil ou cenário nas tabelas acompanhadas. Metadados de
autenticação não integram esse comparativo. Capturas locais:
`/tmp/cacau-compras-ux-hml.png` e `/tmp/cacau-producao-ux-hml.png`.
Produção principal e secrets preservados; nenhuma pendência humana desta
entrega. Sem compras/produção reais previstas, não lançar operações por
conveniência de demonstração.

Rollback: republicar o código HML anterior `dc0a37b` sem restaurar banco ou
reverter migrations. Não executar novamente importações ou referências antigas.
