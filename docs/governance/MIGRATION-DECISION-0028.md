# Decisão humana — migration 0028

Estado: `pending-human`. Dono aprovador, operador e revisor: `PENDING-HUMAN`.
`0027` cria mix/cenários; `0028_brave_xavin.sql` adiciona
`management_scenario_mix.product_name` varchar(120) NOT NULL sem default.
Se já houver mix, o ALTER falha. Ausência de journal ou falha da 0017 não
comprova ausência de aplicação manual de 0027 nem ausência de linhas.

## Opções e consequências

| Política                            | Efeito                                                                           | Requisito                                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Snapshot do nome no fato original   | renomeação/inativação futura não muda cenário histórico                          | fonte original comprovada e regra para reconstrução quando não existe snapshot                    |
| Referência dinâmica ao catálogo     | cenários antigos mudam após renomeação; inativos/excluídos podem perder contexto | aceite explícito do impacto e novo desenho compatível com coluna histórica                        |
| Ausência comprovada de mix          | permite desenho sem backfill                                                     | contagem externa revisada, catálogo/histórico coerentes e congelamento de writers entre 0027/0028 |
| Mix existente com backfill separado | preserva evidência e torna preenchimento rastreável                              | plano por origem, exceções, idempotência, prévia, autorização de escrita e reconciliação          |
| Fonte histórica desconhecida        | não fabricar nome atual ou placeholder como fato antigo                          | manter bloqueado ou aprovar projeto de estado ausente/nullable futuro                             |

Recomendação técnica: snapshot imutável de nome comprovado na origem; separar
nome reconstruído de histórico original quando a fonte não comprovar o momento.
Nome atual não é prova do nome histórico. Não preencher por inferência, não
usar string vazia, SKU ou ID como substituto sem decisão explícita. Produto
inativo mantém identidade; exclusão deve preservar auditoria e seguir FKs
RESTRICT. Não mudar a regra do mix: ativação exige 100%, histórico 103%
normaliza proporcionalmente conforme aprovação canônica; arredondamento/resíduo
determinísticos devem ser auditados sem alterar os pesos originais.

## Formulário obrigatório

- UTC/base/branch/endpoint/database e fonte da evidência revisada: `PENDING-HUMAN`.
- Histórico completo e aplicações manuais/parciais de 0027/0028: `PENDING-HUMAN`.
- Existência de cenários e contagem de mix; ausência não presumida: `PENDING-HUMAN`.
- Escritas entre 0027 e 0028, janela e prevenção de novas escritas: `PENDING-HUMAN`.
- Origem oficial do nome por registro, momento e hash/proveniência privada:
  `PENDING-HUMAN`.
- Snapshot versus dinâmica; comportamento para renomeados, excluídos e
  inativos, limite varchar(120) e conflitos: `PENDING-HUMAN`.
- Necessidade de backfill, prévia sanitizada, política de valores ausentes,
  recusa de fonte ambígua e exceções aprovadas: `PENDING-HUMAN`.
- Impacto nos cenários existentes, revisões/snapshots, relatórios e mix
  normalizado: `PENDING-HUMAN`.
- Idempotência, referência, proteção de fatos anteriores, rollback em falha
  e recuperação após commit: `PENDING-HUMAN`.
- Auditoria, retenção, responsável/revisor e aceite explícito: `PENDING-HUMAN`.

## Gate

Só `verified` com **ausência comprovada de dados entre 0027/0028**, incluindo
aplicações manuais, e writers controlados; **ou** plano de backfill explicitamente
aprovado com origem, exceções, idempotência, validação e autorização de escrita
separada. A política de nomes também precisa de aceite. Contagem sozinha é
triagem, não atestação temporal. Sem isso, `pending-human` e aplicação `prohibited`.
