# Materiais de perfil e taxas — migrations aditivas

`0031_brave_thor.sql` acrescenta somente `coating` e `packaging` ao enum
`production_profile_component_role`. Gerada por Drizzle a partir do snapshot
`../pending-exact-costs/meta/0030_snapshot.json`; o snapshot 0031 e o journal
local descrevem a proposta, não os recibos efetivos do alvo.

`0032_long_slapstick.sql` acrescenta `management_settings.payment_fees` JSONB
nullable; o snapshot0032 registra a evolução aditiva. Aplicação controlada pelo
pacote PROFILE-RECOVERY-FEES-2026-10-18-002, com recibos e auditoria próprios.

A cadeia histórica publicada permanece intacta. Não aplicar o journal local
nem repetir as nove colunas de custos exatos já aplicadas. Antes da aplicação,
conferir identidade do alvo, recibos e enum; usar referência nova e auditoria.
Aplicar o DDL e confirmar seu commit antes de inserir dados com os novos valores.
Estado da publicação e conferências em
`docs/governance/COST-RECOVERY-FEES-HML-2026-10-18.md`.

Recuperação: manter os valores aditivos e reverter o código se necessário;
não remover/recriar o enum nem apagar dados. A retirada de componentes futuros
exige correção auditável. Recuperação variável é configuração versionada de receita; taxas de pagamento
são parâmetros, sem lançamentos financeiros automáticos.


`0033_payment_settlement.sql` acrescenta somente três campos nullable de
pagamento/classificação. Execução auditável independente, sem reaplicar0031/
0032: `evidence/payment-settlement-schema-2026-10-18.json`. Preservação, ensaio
e recibo em `docs/governance/PAYMENT-SETTLEMENT-PROFIT-HML-2026-10-18.md`.
