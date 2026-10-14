# Reconciliação pós-integração — 8 de outubro de 2026

## Base e evidências

Base auditada: `origin/main` em
`98172b97076415c4bb98554e1c6c82928bbe3895`.

- As PRs #31, #32 e #33 são ancestrais da ponta auditada. Seus merges são,
  respectivamente, `2336658`, `2f7d19b` e `98172b9`.
- A CI consolidada da #31 (`37804204150`), #32 (`37813883831`) e #33
  (`37834057113`) concluiu com `success`.
- A #13 permanece aberta, marcada `CHANGES-REQUIRED` e não é ancestral da
  `main`. Nenhum patch exclusivo dela foi incluído nos três lotes.
- Esta reconciliação é leitura de Git/GitHub e validação local. Não aplicou
  migration, não escreveu em banco e não alterou deploy, Cloudflare, Neon,
  secret, binding ou ambiente externo.

## Matriz de PRs

| PR  | Entrega e destino                                                              | Estado na reconciliação                                                    | Classificação e ação                                                                              |
| --- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| #4  | Paridade operacional do workbook; migrations `0019`/`0020` somente versionadas | Histórico, não ancestral como PR individual; conteúdo reconciliado por #11 | `historical-draft`; manter congelada como evidência.                                              |
| #5  | Cenários gerenciais versionados; migrations `0027`/`0028` somente versionadas  | Histórico, não ancestral como PR individual; entrega reconciliada por #12  | `historical-draft`; manter congelada como evidência.                                              |
| #13 | Loader persistente de credencial GitHub MCP                                    | Aberta, head `1922bae`, CI `37698011783` verde, não ancestral              | `changes-required`; requer decisão humana sobre entrega de token a processo persistente e filhos. |
| #14 | Fila, status, handoff e log de governança                                      | Incorporada pelo lote #33                                                  | `integrated`; não reaplicar.                                                                      |
| #15 | Diagnóstico FIFO somente leitura                                               | Incorporada pelo lote #31                                                  | `integrated`; não reaplicar.                                                                      |
| #16 | Tendências operacionais                                                        | Incorporada pelo lote #31                                                  | `integrated`; não reaplicar.                                                                      |
| #17 | Ranking de produtos                                                            | Incorporada pelo lote #31                                                  | `integrated`; não reaplicar.                                                                      |
| #18 | Perdas declaradas e coprodutos                                                 | Incorporada pelo lote #31                                                  | `integrated`; não reaplicar.                                                                      |
| #19 | Rendimento por lote                                                            | Incorporada pelo lote #32                                                  | `integrated`; não reaplicar.                                                                      |
| #20 | Diagnóstico de insumo insuficiente                                             | Incorporada pelo lote #32                                                  | `integrated`; não reaplicar.                                                                      |
| #21 | Telemetria de auth allowlisted e `request_id`                                  | Incorporada pelo lote #33                                                  | `integrated`; não reaplicar.                                                                      |
| #22 | Inicialização concorrente da memória local                                     | Incorporada pelo lote #33                                                  | `integrated`; não reaplicar.                                                                      |
| #23 | Continuidade após gates limpos                                                 | Incorporada pelo lote #33                                                  | `integrated`; não reaplicar.                                                                      |
| #24 | Checklist de readiness de produção                                             | Incorporada pelo lote #32                                                  | `integrated`; não reaplicar.                                                                      |
| #25 | Matriz de ambientes e evidência HML somente leitura                            | Incorporada pelo lote #33                                                  | `integrated`; não reaplicar.                                                                      |
| #26 | Reconciliação custo físico ponderado × FIFO                                    | Incorporada pelo lote #32                                                  | `integrated`; não reaplicar.                                                                      |
| #27 | Testes locais de invariantes da conclusão de produção                          | Incorporada pelo lote #32                                                  | `integrated`; não reaplicar.                                                                      |
| #28 | Sinais operacionais e hooks locais sanitizados                                 | Incorporada pelo lote #33                                                  | `integrated`; não reaplicar.                                                                      |
| #29 | Smoke público local isolado                                                    | Incorporada pelo lote #33                                                  | `integrated`; não reaplicar.                                                                      |
| #30 | Cobertura entrega × FIFO somente leitura                                       | Incorporada pelo lote #31                                                  | `integrated`; não reaplicar.                                                                      |
| #31 | Integração de #15–#18 e #30                                                    | Merge `2336658`; CI `37804204150` verde                                    | `integrated`; lote financeiro definitivo.                                                         |
| #32 | Integração de #19, #20, #24, #26 e #27                                         | Merge `2f7d19b`; CI `37813883831` verde                                    | `integrated`; lote de produção definitivo.                                                        |
| #33 | Integração de #14, #21–#23, #25, #28 e #29                                     | Merge `98172b9`; CI `37834057113` verde                                    | `integrated`; lote de plataforma definitivo.                                                      |

As PRs #4 e #5 não devem ser fechadas, retargetadas ou reutilizadas: #11 e
#12 são as reconciliações posteriores que preservam suas entregas. Não há
evidência de entrega das PRs #14–#30 ausente dos lotes #31–#33, exceto #13,
que foi excluída deliberadamente.

## Auditoria da árvore consolidada

- **Segurança:** telemetria de auth limita campos e valores; memória local
  permanece confinada ao checkout, recusa symlink, usa permissões privadas,
  lock, escrita atômica, deduplicação e retenção. Guards de caminhos são
  NUL-safe e não alteram staging quando bloqueiam. Smoke isolado bloqueia
  tráfego externo e mutações. O código consolidado não declara nem realiza
  deploy, migration, correção de dados ou persistência de credencial.
- **Finanças e estoque:** diagnósticos de FIFO, cobertura de entregas e custo
  de lote são somente leitura, preservam lacunas e precisão exata; não fazem
  backfill nem correção automática de estoque, CMV ou histórico. Regras de
  competência, caixa e margem seguem os documentos canônicos.
- **Produção e relatórios:** rendimento, perdas, coproduto e alertas são
  rastreáveis; os testes do writer preservam idempotência e rollback locais.
  O checklist de readiness não afirma homologação física, schema aplicado ou
  produção pronta.
- **Governança:** o controlador continua após um gate apenas para pacote
  independente pronto, sem promover dependências ou contornar bloqueios.
  Evidência local, CI, HML somente leitura e produção permanecem distinguidas.

## Inventário de migrations

Há migrations versionadas de `0000` a `0028`. A aplicação não foi consultada
nem inferida por esta rodada. A documentação histórica comprova aplicação
controlada apenas onde explicitamente registrada; o estado HML atual do schema
não está provado por esta reconciliação.

| Faixa         | Relação                                      | Estado seguro                                                                               |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `0000`–`0013` | fundação operacional e FIFO                  | aplicação atual fora do escopo desta auditoria; não presumir.                               |
| `0014`–`0016` | allowlist/auth/auditoria G1                  | há evidência histórica em branch HML específica; revalidar antes de qualquer novo ambiente. |
| `0017`–`0018` | idempotência e auditoria operacional         | versionadas; aplicação nesta rodada não comprovada.                                         |
| `0019`–`0026` | paridade workbook e capacidades operacionais | versionadas pelas reconciliações posteriores; aplicação atual não comprovada.               |
| `0027`–`0028` | cenários WP-D                                | versionadas e não aplicadas por esta rodada.                                                |

Antes de qualquer aplicação são obrigatórios: autorização humana específica,
alvo confirmado, backup verificável, janela, plano de rollback e validação
posterior. Não há backfill autorizado.

## Gates e backlog

| Área    | Estado que permanece                                                                             |
| ------- | ------------------------------------------------------------------------------------------------ |
| G0 / G8 | Governança integrada; a #13 e decisões de autonomia persistente são humanas.                     |
| G1      | Código local integrado; homologação HML de sessão, Turnstile e RBAC é externa.                   |
| G2      | Diagnósticos integrados; sem decisão nova para semântica financeira pendente.                    |
| G3      | Relatórios integrados; ranking por sabor exige modelo canônico/homologação.                      |
| G4 / G5 | Mensageria e OCR não iniciados, dependem de decisão e infraestrutura.                            |
| G6      | Readiness e testes locais integrados; operação física, schema e HML permanecem gates.            |
| G7      | Hooks/sinais locais integrados; backup, restauração e observabilidade externa requerem operação. |

## Próxima frente recomendada

Preparar a revisão controlada das migrations pendentes: inventariar impacto,
alvo, backup, janela e rollback para decisão humana, sem aplicar migrations
nem acessar banco nesta frente.
