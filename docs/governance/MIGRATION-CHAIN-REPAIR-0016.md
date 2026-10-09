# Reparação da cadeia pendente a partir da 0016

Tarefa: [#36](https://github.com/naiguelcabral/seus-brownies/issues/36).
Data: 9 de outubro de 2026. Pacote preparatório: PR #35.
**Não autoriza SQL HML, aplicação de migrations, backfill ou deploy.**

## Sequência e condição de decisão

A preparação #35 foi integrada em `a542ec7`, com CI pós-merge
`37944260848` verde no mesmo SHA. Esse gate preparatório está concluído.
A correção deve ocorrer em tarefa/branch e PR próprias. A preferência
inicial do Dono é substituir a cadeia pendente por sequência corrigida e
auditável a partir da `0016`, preservando todos os SQLs/hashes/journal/snapshots
antigos e os SHAs de origem como evidência fora do caminho ativo do migrador.
Nenhuma estratégia está aprovada e nenhum arquivo histórico é substituído aqui.

Antes de aprovar substituição, inventariar **todas** as bases compartilhadas
relevantes e comprovar ausência de `0017+` com histórico/hash/timestamps e
catálogo. Ausência de journal ou falha local não prova ausência de aplicação
manual/parcial. Estado desconhecido, alvo ambíguo ou evidência incompleta bloqueia
a decisão. Confirmar o banco efetivo do Worker; não trocar branch por inferência.
Consulta externa exige identidade exata e conexão comprovadamente somente leitura.
Não criar roles, branches ou alterar infraestrutura implicitamente.

## Comparação obrigatória

| Estratégia                       | Prova e risco a avaliar                                                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Substituir a cadeia não aplicada | Preferência inicial condicionada ao inventário; preservar evidência antiga, manter 0000–0016 intactas, revisar novo journal/snapshots/hashes e compatibilidade do migrador. |
| Compatibilidade pré-migration    | Provar semântica do trigger e nomenclatura, efeitos temporários, retirada da compatibilidade e rastreabilidade; não criar coluna fictícia que permita contornar proteção.   |
| Nova linha derivada da 0016      | Provar bootstrap vazio e atualização de 0016, seleção inequívoca da linha, equivalência de catálogo e tratamento de qualquer histórico divergente.                          |

Uma `0029` posterior sozinha não resolve a falha anterior da `0017`.
Se houver qualquer aplicação compartilhada de `0017+`, cancelar a proposta de
substituição e revisar um caminho que preserve esse histórico.

## Provas em PostgreSQL descartável

Usar PostgreSQL 17 e apenas dados sintéticos, sem rede para bases compartilhadas.
Para cada candidata, registrar comandos reproduzíveis, versão, SQLs/hashes e
resultado para (a) banco até `0016` e (b) instalação vazia. Provar ordem/journal,
rollback em falha, reaplicação inócua, preservação de registros sintéticos,
catálogo real e invariantes de dinheiro/estoque/FIFO/idempotência/auditoria.
Validar trigger em produto usado e não usado, alterações de tipo/unidade,
constraints, enums, tipos/defaults/nulabilidade, funções e índices.

O verificador offline da #35 compara o JSON fornecido com o histórico e as
definições dos snapshots; não é coletor nem atestação externa. Implementar e
provar coleta/normalização independente do catálogo real, incluindo checks SQL
manuais e definições de funções/triggers ausentes do snapshot. Não usar cópia
do snapshot como evidência de PostgreSQL.

## Gates de dados independentes

- `0019`: aprovar explicitamente os parâmetros financeiros do singleton e
  a política de fatos históricos. Prova sintética não aprova valores reais.
- `0028`: determinar existência de mix e política de nomes históricos; não
  inventar preenchimento. Provar tanto tabela vazia quanto cenário sintético
  com mix preexistente. Não permitir escrita entre `0027` e `0028` sem plano.

## Entrega

PR corretiva separada com comparação das três opções, candidata comprovada,
manifesto antigo/novo, evidências e limitações. CI deve passar no SHA final.
Sem aplicação HML, sem aprovação automática da estratégia/substituição, sem
merge corretivo automático. Backup/restauração/RPO/RTO/janela e aprovação
específica de aplicação continuam necessários em uma etapa futura.
