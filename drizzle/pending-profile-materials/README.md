# Materiais de perfil — migration aditiva candidata

`0031_brave_thor.sql` acrescenta somente `coating` e `packaging` ao enum
`production_profile_component_role`. Gerada por Drizzle a partir do snapshot
`../pending-exact-costs/meta/0030_snapshot.json`; o snapshot 0031 e o journal
local descrevem a proposta, não os recibos efetivos do alvo.

A cadeia histórica publicada permanece intacta. Não aplicar o journal local
nem repetir as nove colunas de custos exatos já aplicadas. Antes da aplicação,
conferir identidade do alvo, recibos e enum; usar referência nova e auditoria.
Aplicar o DDL e confirmar seu commit antes de inserir dados com os novos valores.
Não foram inseridos componentes, alteradas fichas ou realizadas operações no HML.

Recuperação: manter os valores aditivos e reverter o código se necessário;
não remover/recriar o enum nem apagar dados. A retirada de componentes futuros
exige correção auditável. Bordinhas variável e taxas por pagamento não fazem
parte desta migration.
