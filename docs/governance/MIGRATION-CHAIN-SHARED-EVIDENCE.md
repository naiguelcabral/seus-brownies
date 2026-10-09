# Coleta pendente das bases compartilhadas — tarefa 36

**BLOCKED_ACCESS_AND_TARGET_MAPPING.** Este roteiro não autoriza aplicação,
criação de papéis, grants, alteração de PUBLIC, secrets, endpoints ou deploy.
Continuação da PR [#38](https://github.com/naiguelcabral/seus-brownies/pull/38).

## Verificação de acesso realizada

A API da conta lista dois projetos Seus Brownies. Nos cinco branches inventariados,
`list_postgres_roles` retorna somente `neondb_owner`, sem prova de ACLs não graváveis.
Os cinco endpoints são `read_write`. O conector `run_sql` aceita projeto/branch/database,
mas não aceita selecionar role; obter uma DSN resolve por padrão o proprietário.
Portanto nenhum desses mecanismos comprova a conexão exigida. Não foi solicitada
DSN privilegiada nem executado SQL externo. Nenhuma sessão autenticada de navegador
Cloudflare/Neon está disponível nesta execução para conferir o Worker.

| Projeto              | Branch                                  | Endpoint                    | Estado do gate                    |
| -------------------- | --------------------------------------- | --------------------------- | --------------------------------- |
| cool-base-25902164   | br-empty-frog-acy6xycn / production     | ep-raspy-resonance-ac4rhkwk | Sem papel não gravável comprovado |
| cool-base-25902164   | br-lively-term-ac9i0mvr / development   | ep-young-cloud-acftfl9s     | Sem papel não gravável comprovado |
| steep-brook-51659857 | br-lingering-wind-acwh5wap / production | ep-late-water-acahd1z1      | Sem papel não gravável comprovado |
| steep-brook-51659857 | br-bitter-dew-ac31uci9 / Development    | ep-tiny-night-ac0pjhlr      | Sem papel não gravável comprovado |
| steep-brook-51659857 | br-patient-lake-ac2t0cvq / g1-auth-hml  | ep-old-sound-acmcy3e9       | Sem papel não gravável comprovado |

`read_write` descreve o endpoint e não as ACLs do usuário. Um endpoint desse tipo
pode receber um leitor autorizado; o nome do endpoint ou da role não é prova de
privilégios. Da mesma forma, um endpoint read-only sozinho não prova todas as ACLs.
`archived`/`idle` não prova banco vazio ou ausência de aplicação. O inventário da API
não descarta cópias/backups/bases externas nem estabelece vínculo com o Worker.

## Diagnóstico preparado e prova descartável

`scripts/migration-chain-access-diagnostic.sql` consulta somente identidade e
metadados. O wrapper `.mjs` não cria conexão, não carrega DSN/credencial e não tem
CLI de acesso externo. Ele inicia READ ONLY, fixa search_path em pg_catalog,
limita timeout e sempre desfaz sua própria transação. Usar cliente dedicado,
fora de qualquer transação existente.

As verificações conservadoras incluem default/transaction read-only, superuser,
CREATEROLE/CREATEDB/replication/BYPASSRLS, caminhos SET ROLE incluindo session_user,
CREATE/TEMP no database, CREATE em schemas, escrita em tabelas ou colunas,
USAGE/UPDATE em sequências, ownership e funções SECURITY DEFINER executáveis.
Campos ausentes, tipos inesperados ou privilégios detectados bloqueiam o diagnóstico.
SECURITY DEFINER é rejeitado mesmo se seu corpo aparentemente só lê.

O teste PostgreSQL 17 cria todos os papéis/grants **somente num banco novo do serviço
efêmero da CI**. Exercita proprietário rejeitado, leitor sem escrita, INSERT de
tabela, UPDATE de coluna, sequência, TEMP, função SECURITY DEFINER via PUBLIC e
membership NOINHERIT que ainda permite SET ROLE. Nenhum desses grants é feito no Neon.
Resultados novos da CI devem ser confirmados no SHA final antes de afirmar aprovação.

`acl_checks_passed` não é atestação universal: extensões, large objects, acesso a
outros bancos/serviços, mudanças concorrentes de ACL e outros efeitos precisam de
revisão do administrador. O relatório sempre retorna `application_authorized:false`,
`replacement_authorized:false`, `shared_history_collected:false` e exige revisão do
operador. Não transforma o resultado em autorização de introspecção ou migration.

## Dados necessários para fechar o gate

1. O administrador disponibiliza uma conexão já aprovada, com papel não gravável
   e destino exato em cada uma das cinco bases. Se isso exigir novo papel/grants,
   tratar como mudança de acesso separada e explicitamente autorizada. Não revogar
   privilégios PUBLIC numa base compartilhada para fazer o diagnóstico passar.
   Credenciais ficam no gerenciador de segredos/local; nunca na issue, PR ou conversa.
2. O operador confirma identidade e modo read-only antes de coletar histórico ou
   catálogo. Pode usar o SQL de diagnóstico dentro de uma transação READ ONLY
   com cliente dedicado; qualquer resultado incerto mantém o bloqueio.
3. Em cada database, registrar UTC, identificadores projeto/branch/endpoint/database,
   role/session_user, proveniência do coletor e histórico completo de
   `drizzle.__drizzle_migrations` com `hash` e `created_at::text` ordenados. Se a tabela
   não existir, registrar a ausência como **não comprovado**, não como aprovação.
4. Coletar o catálogo real com o coletor independente da PR e também listar todos
   os schemas/relações não internos. Conferir tipos/defaults/constraints/índices,
   enums e definições manuais de funções/triggers, inclusive aplicação parcial.
   O artefato `baseline-0016-catalog.json` da CI é referência sintética reproduzível
   para comparação, nunca evidência de uma base compartilhada.
5. Confirmar a abrangência do inventário, incluindo eventuais cópias, bases externas
   ou restaurações compartilhadas. Qualquer base desconhecida ou divergência bloqueia
   a substituição. Se qualquer 0017+ já tiver sido aplicada, preservar esse histórico
   e revisar um plano compatível antes de alterar a linha ativa.
6. Conferir operacionalmente a versão/deployment ativo de `cacau-v1-hml` e qual
   endpoint/database o binding DATABASE_URL efetivamente usa. Registrar somente
   identificadores sanitizados, UTC e responsável; não revelar valor do secret.
   Um nome de binding ou configuração Git não comprova seu valor publicado.

Exportações externas completas ficam privadas. Publicar somente conclusões e
hashes sanitizados após revisar conteúdo; não subir DSNs, credenciais, dados reais
ou corpos de funções contendo segredos. Nenhum teste escreve nas bases compartilhadas.

## Condição para terminar a tarefa

Com evidências atuais e completas, revisar a opção de substituição preferida,
arquivar os bytes/hashes antigos fora do caminho ativo, preparar a sequência
corretiva e repetir bootstrap/upgrade/rollback. Manter `0019` e `0028` como decisões
de dados distintas, incluindo parâmetros financeiros e nomes históricos do mix.
Revisão/CI da PR não autoriza aplicar HML. A issue #36 permanece aberta enquanto
acesso, abrangência ou vínculo Worker→database estiverem não comprovados.
