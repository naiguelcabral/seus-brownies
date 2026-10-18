# Mix de referência normalizado — 18/10/2026

Estado: **preparado; criação autenticada pendente**. O usuário esclareceu:
“Somente o sistema, como cenário em rascunho”. A autorização cobre cadastrar
um cenário `draft` pela funcionalidade existente, preservando o workbook e
sem ativação. Não autoriza corrigir por inferência os custos históricos ou
criar fatos operacionais.

## Conteúdo conferido

Fonte: `Workbook_Gerenciamento_Seus_Brownies.xlsx`, SHA-256
`25aa62df5fc9b2e01402e9c242142322d9c6f54a345e800cb947b77865ce5b64`,
aba `10_Metas_e_Cenarios`, linhas 19–35. Hash reconferido; arquivo inalterado.
Os 17 SKUs foram associados pelos IDs reais da original
`br-lingering-wind-acwh5wap` / `neondb`; todos são produtos finais ativos e os
preços coincidem com o catálogo. Não usar o número ordinal do SKU como ID.

O sistema preserva pesos originais totalizando `1.030000` e calcula o mix
normalizado em **10.000 pontos-base = 100%**, pelo maior resto com desempate
pelo menor ID real. Isso distribui 4,86% a PROD011, PROD012 e PROD014;
PROD003, PROD007, PROD009 e PROD010 recebem 4,85%. Os seis pesos de 10%
recebem 9,71%, e os quatro de 2% recebem 1,94%. A ordem de entrada não altera
o resultado. Não introduz regra nova de arredondamento.

Meta R$ 10.000,00, custos fixos R$ 2.200,00, 20 dias, quatro semanas, margem
mínima 70% e reserva 0% conferem com os parâmetros atuais. Custos planejados
são os valores históricos da fonte, arredondados em decimal para três casas
conforme o contrato existente. Strings originais completas preservadas na
evidência. Essa projeção não homologa energia, mão de obra, adesivo,
Bordinhas ou montagem/cobertura de bombom/kit; a descrição do rascunho explicita
essas pendências e a reserva ainda a validar.

Projeção calculada pelas funções existentes: faturamento R$ 15.868,00,
lucro gerencial R$ 10.101,81, 1.492 unidades mensais/380 semanais. São
estimativas condicionadas aos custos históricos, sem resultado realizado.

## Validação e próximo passo

Contrato, soma exata, cálculo independente dos maiores restos e invariância
à ordem passaram. Os 14 testes existentes de cálculos/rota de cenários
passaram. Sem alteração de código, schema, deploy ou operação compartilhada.

Evidência e payload nativo:
[scenario-mix-draft-preparation-2026-10-18.json](evidence/scenario-mix-draft-preparation-2026-10-18.json).

O navegador abriu `/cenarios` e foi redirecionado ao login. Solicitação de
login enviada ao usuário; não solicitar senha na conversa. A função nativa
`createScenario` exige principal autorizado e registra autor, histórico e
auditoria em transação. Criar pela sessão autenticada, conferir os 17 itens,
o status `draft`, total normalizado 10.000 e histórico, sem clicar em ativar.
Antes de salvar, conferir se já existe o cenário para evitar duplicação.
Após sucesso, registrar ID/revisão e readback independente sanitizado e
atualizar este estado. Não atribuir a criação a um usuário por SQL para
substituir a sessão ausente.
