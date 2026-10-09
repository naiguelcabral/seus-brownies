# Gates de evidência das migrations 0017–0028

## Escopo, autoridade e checkpoint

Pacote de preparação, 9 de outubro de 2026. **Não fecha gates humanos por
inferência e não autoriza SQL externo, alteração de acesso, migration ou deploy.**
Base: `origin/main` `1e5bd557a1bd57c89f65fe03fa013eb0f8af6d70`.
PR #35: `MERGED`, base `main`, HEAD `10e62c26c5657bbc494f2650e296470061fe6043`,
merge `a542ec73d914bcca12090b38df69bf16a49e9bbf`, escopo documentação,
verificador offline e testes. CIs da PR/push `37943877875`/`37943868409`
verdes; pós-merge `37944260848` e CI da main atual `37944960379` verdes no
respectivo SHA. Árvore e staging de origem limpos, sem operação Git pendente;
referências remotas atualizadas antes das alterações. Checkout existente preservado.

Branch desta tarefa: `codex/hml-migration-evidence-gates`, baseada na main.
Experimentos da PR #38 são trabalho separado, não integrado ou copiado para
a cadeia ativa. Os registros anteriores de readiness/reconciliação permanecem
inalterados. [Manifesto de origem](evidence/hml-source-manifest.json): 29 SQLs,
27 snapshots e journal; nenhum deles é alterado. SHA, teste e CI finais deste
pacote serão registrados na PR em draft.

## Estado dos quatro gates

| Gate                  | Estado atual    | Condição objetiva de fechamento                                                                                                           |
| --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Acesso não gravável   | `blocked`       | Conexão já aprovada, destino exato, ACL/ownership/capacidades revisados, identidade e READ ONLY comprovados; relatório assinado e vigente |
| Abrangência das bases | `pending-human` | Declaração completa de bases, contas, cópias, dumps e restaurações, inclusive inexistência, com responsável/UTC                           |
| Worker→database       | `unverified`    | Atestação privada do destino da versão ativa, fingerprint e correspondência exata à matriz; versão reconfirmada                           |
| Dados 0019 e 0028     | `pending-human` | Dois aceites independentes conforme os formulários de decisão                                                                             |

`verified` exige evidência revisada, não apenas metadados. `ready-for-readonly-audit`
exige os três primeiros gates e autorização específica da coleta; não autoriza
reparação. `ready-for-repair-design` exige histórico e catálogo de **todas** as
bases relevantes, revisão de aplicações parciais e das decisões de dados.
Aplicação, escrita externa, alteração de infraestrutura e deploy: `prohibited`
nesta tarefa. Nenhuma base está atualmente `confirmed-hml`.

## Matriz das cinco bases

Metadados atuais do MCP, UTC/proveniência e IDs completos em
[hml-evidence-targets.json](evidence/hml-evidence-targets.json). Para **cada linha**:
banco `neondb`, papel disponível listado `neondb_owner` (owner; não é leitor
comprovado), endpoint `read_write`; histórico, schema, backup, restauração e
vínculo Worker = `unverified`. Confiança alta nos IDs de metadados e insuficiente
no ambiente efetivo. Evidência faltante: conexão não gravável, histórico completo,
catálogo independente, declaração de origem/abrangência, backup/restore e binding.
Responsáveis necessários: operador Neon, operador Cloudflare e Dono dos dados.

| Projeto                | Branch/identificador                        | Endpoint                      | Ambiente alegado           | Relação documentada com HML                                                | Classificação              |
| ---------------------- | ------------------------------------------- | ----------------------------- | -------------------------- | -------------------------------------------------------------------------- | -------------------------- |
| `cool-base-25902164`   | `production` / `br-empty-frog-acy6xycn`     | `ep-raspy-resonance-ac4rhkwk` | produção pelo nome/default | pai do development; não prova uso operacional                              | `production-do-not-access` |
| `cool-base-25902164`   | `development` / `br-lively-term-ac9i0mvr`   | `ep-young-cloud-acftfl9s`     | development                | ENVIRONMENT-MATRIX aponta este alvo; histórico alerta ausência de relações | `candidate-hml`            |
| `steep-brook-51659857` | `production` / `br-lingering-wind-acwh5wap` | `ep-late-water-acahd1z1`      | produção pelo nome/default | ancestral do branch histórico de auth                                      | `production-do-not-access` |
| `steep-brook-51659857` | `Development` / `br-bitter-dew-ac31uci9`    | `ep-tiny-night-ac0pjhlr`      | desenvolvimento alegado    | pai de g1-auth-hml; não atesta vínculo Worker                              | `insufficient-evidence`    |
| `steep-brook-51659857` | `g1-auth-hml` / `br-patient-lake-ac2t0cvq`  | `ep-old-sound-acmcy3e9`       | HML histórico alegado      | documentação G1 histórica, sem binding atual comprovado                    | `candidate-hml`            |

Não houve SQL externo. `archived`/`idle`, nome de branch, ausência de journal
ou tamanho não comprovam ausência de migrations. `read_write` identifica a
capacidade do compute, não a role da sessão. API de roles não comprova ACLs;
o acesso MCP SQL conhecido não seleciona role. Nenhum destino de produção
pode ser liberado pelo verificador deste pacote, nem com nome falsificado.
Sua auditoria, necessária para cobertura global, depende de evidência privada
revisada do operador e autorização separada; não usar este coletor ali.

## Proposta de acesso de auditoria — não executar configuração

Checklist para um operador com autorização administrativa **separada**:

- [ ] Registrar projeto, branch, endpoint, database, finalidade, ticket de
      aprovação, responsável e expiração, máximo quatro horas por sessão.
- [ ] Usar mecanismo privado aprovado, separado da aplicação; não fornecer
      DSN, senha, token ou usuário sensível no Git, PR ou conversa. TLS e destino
      fixados pelo operador antes de injetar o cliente na biblioteca.
- [ ] Role LOGIN sem SUPERUSER, CREATEDB, CREATEROLE, REPLICATION ou BYPASSRLS;
      sem ownership de database/schema/relação/função/tipo, sem memberships ou
      caminho SET ROLE/SET SESSION AUTHORIZATION; grant option ausente.
- [ ] `default_transaction_read_only=on`; conexão inicia READ ONLY e cada
      transação de coleta usa READ ONLY. Isso é defesa adicional, não ACL.
- [ ] Somente CONNECT no database exato, USAGE nos schemas necessários e
      SELECT no journal e nas tabelas da allowlist de agregação. Catálogos exigem
      leitura padrão; não conceder pg_read_all_data nem acesso a negócio por conveniência.
- [ ] Sem CREATE database/schema, TEMP, escrita por tabela/coluna, REFERENCES,
      TRIGGER, MAINTAIN, USAGE/UPDATE de sequências ou alteração de objetos.
- [ ] Revisar privilégios herdados de PUBLIC: revogar só da role não remove
      direitos vindos de PUBLIC. Não alterar PUBLIC unilateralmente; se a política
      vigente impedir leitor seguro, manter `blocked` e decidir a solução humana.
- [ ] Sem execução de funções/procedures customizadas, SECURITY DEFINER,
      extensões mutáveis, foreign servers, large objects graváveis ou capabilities
      especiais, incluindo funções instaladas em pg_catalog, acesso a filesystem,
      configuração privilegiada e efeitos externos. Revisão humana indispensável.
- [ ] Impedir acesso via views/RLS que chamem funções. O coletor rejeita views,
      foreign tables, temporárias, particionadas e RLS para leituras agregadas/journal.
- [ ] Não ampliar SELECT por erro de coleta: parar e revisar o mínimo necessário.
- [ ] Reproduzir a política em PostgreSQL 17 descartável com dados sintéticos,
      testar recusa de UPDATE sem alteração de linhas (25006 em READ ONLY e 42501
      em READ WRITE). **Teste negativo de escrita externo é proibido neste pacote.**
- [ ] Devolver somente resultado, SQLSTATE, UTC, IDs, fingerprints e aceite da
      revisão; nomes de role/session_user e exportações completas ficam privados.
- [ ] Após coleta, operador autorizado encerra sessões, retira acesso pelo
      processo aprovado, revoga concessões apenas dessa auditoria, invalida o meio
      de autenticação e confirma impossibilidade de reconexão. Não remover acesso
      de terceiros; não executar REVOKE/DROP automaticamente.

Consultas propostas: `SHOW transaction_read_only`,
`SHOW default_transaction_read_only` e [hml-evidence-access.sql](../../scripts/hml-evidence-access.sql)
somente dentro de `BEGIN READ ONLY`. Retorno esperado: ambos `on`, identidade
coincidente com a role aprovada, atributos/capacidades de escrita e ownership
zerados. Qualquer falta/erro/resultado divergente bloqueia. Direitos sobre
large objects são avaliados pela ACL efetiva; não existe atalho de owner readonly.
Defaults READ ONLY não impedem todas as capacidades (por exemplo temporárias);
[documentação PostgreSQL 17](https://www.postgresql.org/docs/17/runtime-config-client.html)
e [privilégios](https://www.postgresql.org/docs/17/sql-grant.html) fundamentam os controles.

## Verificador preparado

`scripts/hml-evidence-verifier.mjs` é **biblioteca sem conexão/CLI**. Não aceita
DSN, não lê ambiente nem cria driver. `verifyEvidence(client, target)` exige
cliente privado fornecido pelo operador, já limitado e vinculado ao destino
atestável; transport/TLS e aprovação não podem ser provados por um objeto JS.
`target` contém apenas IDs públicos, papel aprovado mantido em memória,
`environment:hml`, `classification:confirmed-hml`, `operatorApproved:true`,
`capabilityReviewApproved:true`, `connectionBoundByOperator:true`, expiração
UTC ≤4h, `destinationFingerprint` e `referenceCatalogDigest`.

O digest de referência deve vir da **mesma consulta de catálogo** em referência
PostgreSQL 17 descartável pertinente, nunca do snapshot Drizzle ou do próprio
alvo observado. Sem referência independente, não iniciar a coleta. O digest
normaliza chaves de objetos e mantém arrays ordenados pela consulta; tipos,
defaults, nulabilidade, constraints, índices, enums, funções, triggers e
políticas entram no catálogo privado. Nomes de schemas e relações extras
também alteram o digest. Divergência exige revisão privada, não correção.

Fluxo: valida allowlist/produção/validade antes de SQL → transação REPEATABLE
READ READ ONLY → SHOW → ACL → catálogo → journal completo → contagens exatas
de `management_settings`, `sales`, `sale_items`, `management_scenarios` e
`management_scenario_mix` quando presentes → ROLLBACK sempre. Não consulta
nomes, preços, configurações financeiras ou linhas operacionais. Expõe apenas
IDs, hashes validados/timestamps, fingerprints, contagens e estados. Erros de
driver são substituídos por códigos constantes; falha de rollback exige fechar
a conexão. Timeouts 10s/lock 2s limitam consultas; não elevá-los automaticamente.

Histórico deve corresponder exatamente aos 17 hashes/timestamps de `0000–0016`.
Ausência, duplicata, extra ou divergência mantém `blocked`. Mesmo match e digest
igual exigem revisão de aplicações parciais, abrangência e proveniência; nenhum
resultado autoriza aplicação/reparo. Exportações privadas podem ser coletadas
pelo processo aprovado do operador; esta biblioteca não persiste nem imprime
catálogo bruto. Contagens são somente triagem dos gates 0019/0028, não decisão.

## Worker e declaração formal

GETs atuais confirmaram deployment `8268b409-34bc-4881-9694-52c292da2da3`,
versão `e241b715-99bf-4a83-82ba-eef24fedadaa`, 100%, `cacau-v1-hml`.
A versão ativa lista `DATABASE_URL` como `secret_text`; valor nunca lido.
Procedimento e formulário: [HML-DATABASE-OPERATOR-ATTESTATION.md](HML-DATABASE-OPERATOR-ATTESTATION.md).
O sanitizador não infere project/branch do usuário ou parâmetros: somente
correspondência exata ao host/database atual da matriz. Fingerprint SHA-256
identifica destino normalizado, não protege credenciais porque elas são
descartadas antes do hash. Destino não é segredo de alta entropia; o hash não
deve ser tratado como prova de posse nem autenticação.

## Decisões e estratégia da cadeia

[0019](MIGRATION-DECISION-0019.md) e [0028](MIGRATION-DECISION-0028.md):
`pending-human`, sem valores novos escolhidos ou backfill inventado.
`0017` permanece `needs-fix-forward`; `0018` bloqueada por ela; `0019`
`needs-data-decision`; `0020–0027` somente prova diagnóstica temporária;
`0028` `needs-data-decision`. Nenhuma aplicação compartilhada comprovada aqui.

| Opção                                              | 0016 / vazio                                                                | Hashes/journal                                                                          | Parcial e bases desconhecidas                                                  | Auditoria, recuperação e requisito                                                                                                                                                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Substituir pendentes desde 0016                    | Experimentos separados da #38 passaram; reprovar no SHA candidato escolhido | novos hashes/journal/snapshots; preservar 0000–0016 e arquivar antigos fora do migrador | alto risco se qualquer 0017+ já aplicada ou manual                             | preferência condicionada; ausência global de 0017+ e parcial obrigatória; rollback transacional em falha, restauração/fix-forward após commit; nenhum SQL reverso aprovado                                                   |
| Compatibilidade antes de 0017                      | Experimentos separados passaram somente com retirada e função corrigida     | mantém SQL antigo, adiciona etapas/snapshots; seleção inequívoca necessária             | coluna/trigger transitórios podem afetar código e locks; desconhecido bloqueia | revisão de nomenclatura, não criar coluna fictícia que contorne proteção; restaurar/fix-forward; precisa histórico global, ausência global não é premissa universal da opção mas compatibilidade individual deve ser provada |
| Nova linha desde 0016                              | Experimentos separados passaram; nova seleção do migrador necessária        | nova linha/histórico com evidência de derivação e catálogo equivalente                  | duas linhas concorrentes ou baseline inferida são inaceitáveis                 | manifesto antigo/novo, revisão do bootstrap; restauração/fix-forward; não apagar história aplicada; desconhecido bloqueia                                                                                                    |
| Adiar reparo e manter operação compatível restrita | não muda schema nem corrige bootstrap                                       | preserva cadeia e hashes                                                                | não resolve bloqueio; evita aceitar premissa externa sem prova                 | manter recursos dependentes sem homologação; qualquer desativação/deploy exige tarefa autorizada; sem rollback de schema                                                                                                     |

Uma 0029 isolada não é alcançável antes da falha da 0017. Se houver 0017+,
preservar integralmente histórico aplicado e desenhar fix-forward para o estado
real. Nenhuma recomendação avança sem histórico de todas as bases relevantes.
Backup válido/restauração testada, RPO/RTO, janela, manutenção, compatibilidade
de código e autorização específica de aplicação permanecem gates adicionais.

## Verificação e próximo passo

Testes sintéticos cobrem vazamento, TTY, protocolos, produção por nome e IDs,
expiração/aprovação/fingerprint, ownership/escrita/membership, READ ONLY,
histórico/duplicata/drift, RLS/views e rollback em erro. Workflow
`hml-evidence-gates-disposable.yml` usa PostgreSQL 17 em loopback e credenciais
fictícias próprias; não usa Neon nem cria recurso externo compartilhado.
Ele valida SQL de catálogo e ACL, agregados, recusa de escrita, grant por
coluna, SET ROLE e drift numa fixture mínima, **não representa schema real
nem substitui os experimentos de migrations da PR #38**. O serviço é descartado
ao terminar o job; só resultados sanitizados entram nos logs.

Próximo passo exato: operador preenche o formulário de atestação e as decisões
0019/0028, apresenta conexão já aprovada e referência de catálogo independente;
revisor confere IDs, versão ativa, abrangência e validade. Só então outra tarefa
autoriza a coleta externa. Nenhum comando de aplicação faz parte deste pacote.
