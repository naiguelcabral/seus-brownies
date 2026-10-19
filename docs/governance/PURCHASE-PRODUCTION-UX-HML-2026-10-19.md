# Compras e Produção — revisão de UX, 19/10/2026

Continuação solicitada pelo usuário após a simplificação de Cenários.
Base `bf71274`, branch `feat/input-catalog-kg-purchases`. Publicação somente
no `cacau-v1-hml`, dentro da autorização de usabilidade vigente.

## Comportamento preparado

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
Build isolado, CI/CodeQL, publicação e conferência autenticada ainda pendentes.

Rollback: republicar o código HML anterior `dc0a37b` sem restaurar banco ou
reverter migrations. Não executar novamente importações ou referências antigas.
