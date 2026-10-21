# Metas e cenários — usabilidade, 19/10/2026

Execução única autorizada pelo heartbeat `retomar-cacau-s-02h33`, às 02:33
Brasília. Branch `feat/input-catalog-kg-purchases`, base `96642c0`.

## Entrega publicada

Código `dc0a37b01d9fa5bac54013e2316484cbc9e00b6f` (incremento `364a1c1`),
publicado às02:47 Brasília no `cacau-v1-hml`, versão
`97ffb52e-9ea5-4dff-a1a9-01738724e26c` com100% de tráfego. Produção principal
não alterada. Recibo: `evidence/scenario-ux-hml-2026-10-19.json`.


- Cenário ativo primeiro, com meta conjunta após custos, orçamento fixo,
  faturamento-alvo e lucro projetado. Quando a reserva é zero, os títulos
  explicitam que a projeção antecede as taxas de pagamento. Comparação por
  meio continua visível e separada, sem média de pagamentos presumida.
- Premissas/volume, mix, simulador Pix e comparação detalhada do realizado
  ficam expansíveis. Ausência de resultado continua explícita, sem zero
  fictício. Tabelas largas têm rolagem local no celular.
- Histórico em largura integral com busca, status, paginação e detalhes de
  cada versão. Novo cenário abre modal inicialmente vazio; fechar preserva
  o preenchimento local, retomável por Continuar rascunho. Iniciar outro
  preenchimento solicita descarte explícito. Salvar continua sendo ação
  separada de ativar.
- Editor com prévia do mesmo cálculo de domínio, normalização exata em 100%,
  participações ajustadas e projeção conjunta; contribuição inviável aparece
  antes de salvar. Produtos já incluídos deixam de aparecer no seletor.
- Ativar/arquivar/criar versão abrem confirmação com efeito e motivo.
  A cópia abre a nova versão em rascunho para revisão. Falhas mantêm o modal
  e os campos; atualização visual que falhe após salvar informa que a
  gravação já ocorreu, evitando apresentar sucesso como falha de escrita.

## Integridade e limites

Sem alteração de schema, cálculo financeiro, normalização, RBAC no servidor,
controle de revisão ou funções de lifecycle. Nenhum cenário ativado, copiado,
arquivado ou editado na base compartilhada para demonstração. Nenhuma nova
compra, fornada, venda, despesa ou taxa histórica registrada. Os incrementos
recebimentos/lucro/modais/data publicados em 18/10 permanecem preservados.
A prévia não valida estoque ou produção e não representa resultado realizado.
Cenários ativos continuam imutáveis: alterações pedem nova versão auditada.
Não há cota obrigatória para Bordinhas ou qualquer produto.

## Verificações

- 529 testes Node aprovados; contratos de apresentação atualizados para os
  componentes extraídos, mantendo as verificações de ausência/RBAC/paginação.
- Cinco ensaios de navegador locais: resumo/detalhes, normalização de 103%,
  preservação de campos e conflito, motivo/duplo envio, efeitos/cancelamento,
  celular 375 × 812. Fixture sem configuração do app, autenticação ou banco.
- Lint, tipos, formatação e Knip conferidos; Knip sem novos achados, mantém
  três referências contextuais da baseline previamente revisada.
- Antes da publicação, leitura independente do HML confirmou dois cenários,
  33 linhas de mix, quatro eventos de histórico, 178 eventos operacionais e
  zero compras/vendas/lotes/despesas/fatos financeiros/movimentos.
- Build HML isolado do HEAD corrigido aprovado. CI39206192382 e
  CodeQL39206192124 aprovados; análises1978425415 (JS/TS),1978424483 (Actions)
  e1978424464 (Python) sem resultados, sem erros e zero alertas abertos.
  A primeira CI identificou raiz DOM nullable na fixture; corrigida com
  guarda explícita no commit publicado e gates repetidos com sucesso.
- Sessão autenticada HML: novo editor vazio e confirmação de nova versão
  abertos e cancelados, sem salvar nem preencher fatos sintéticos. Resumo
  e disclosure conferidos; mix informado101% normalizado em100% preservado.
- Leitura independente depois da conferência confirmou contagens e digests
  idênticos em cenários/mix/histórico/auditoria operacional e nas seis tabelas
  operacionais. Os dois cenários e quatro históricos permaneceram intactos.
- Capturas locais: `/tmp/cacau-scenarios-ux-hml.png` e
  `/tmp/cacau-scenario-modal-hml.png`. Mutações e falhas foram ensaiadas somente
  com callbacks sintéticos na fixture e pela suíte de contratos existente,
  sem criar operações fictícias no HML.

Não há pendência humana desta entrega. A revisão posterior de Compras/Produção
permanece no roadmap como tarefa separada, fora desta execução única.

Rollback de interface: republicar o código HML anterior `41820ba` no alvo
HML, sem restaurar banco nem aplicar/reverter migrations.
