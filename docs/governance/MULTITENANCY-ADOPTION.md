# Adoção SaaS multitenant — decisão e plano de migração

## Estado em 10 de setembro de 2026

O schema contém 29 tabelas Cacau e fatos HML auditáveis. Hoje não há tenant
resolvido no principal do servidor, nem uma regra aprovada que relacione fatos
históricos, identidades e organizações. Portanto, adicionar `tenant_id NOT
NULL` diretamente ou usar `tenant-test-001` como default de produção seria um
backfill silencioso e atribuiria estoque, dinheiro, FIFO e auditoria a um
cliente sem evidência. Essa operação não é segura.

O código já preserva duas bases da fase financeira: cálculos de operações/FIFO
usam `bigint` em centavos e milésimos, e os writers FIFO usam transação e locks
`FOR UPDATE` em ordem estável. A mudança SaaS não altera essas regras.

## Modelo proposto para revisão

- `tenants`: `id` textual estável, nome e criação.
- `tenant_memberships`: vínculo N:N entre `auth_user_id` e tenant, com papel,
  atividade e datas. Ele substitui a suposição atual de um único vínculo global
  em `app_user_access` somente após migração aprovada.
- O principal resolvido no servidor contém `{ authUserId, tenantId, role }`.
  O tenant vem do vínculo/membership selecionado no servidor, nunca de payload,
  busca da rota ou armazenamento do navegador.
- Todo fato Cacau recebe `tenant_id`; leituras, mutações, locks FIFO e joins
  incluem esse predicado. Chaves únicas de negócio passam a ser compostas com
  `tenant_id` quando a identidade deve poder repetir entre clientes.

## Tabelas e isolamento

Os grupos abaixo exigem `tenant_id` e índice composto com o caminho de acesso:

| Grupo                | Tabelas                                                                                                                                                                                                                                                             | Índices/uniqueness a revisar                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Catálogo             | categories, products, sales_locations, product_import_aliases                                                                                                                                                                                                       | `(tenant_id, name)`, `(tenant_id, sku)`, aliases e fontes                |
| Operação             | purchases, purchase_items, sales, sale_items, expenses, stock_movements                                                                                                                                                                                             | chaves de idempotência, fontes e histórico por tenant                    |
| Produção             | recipe_versions, recipe_items, recipe_operational_requirements, operational_cost_rates, production_profiles, production_profile_components, production_batches, production_batch_outputs, production_batch_consumptions, production_batch_losses, operational_costs | fontes, perfis e FKs compostas que impedem referências cruzadas          |
| FIFO                 | inventory_cost_layers, inventory_cost_allocations, inventory_cost_reversals                                                                                                                                                                                         | `(tenant_id, product_id, available_at, id)` e locks filtrados por tenant |
| Auditoria/importação | operational_audit_events, historical_import_records, message_processing_records                                                                                                                                                                                     | referências, deduplicação e retenção por tenant                          |
| Acesso               | app_user_access, auth_audit_events                                                                                                                                                                                                                                  | membership e auditoria com tenant quando conhecido                       |

`auth_login_attempts` exige decisão específica: a tentativa ocorre antes de se
conhecer um membership. As alternativas são mantê-la como controle global de
identidade, associá-la a um tenant escolhido antes do login, ou ter uma chave
de escopo explícita. Não se deve gravar um tenant inventado.

## Migração segura em etapas

1. Criar `tenants` e `tenant_memberships`, sem alterar fatos existentes.
2. Acrescentar `tenant_id` inicialmente anulável e índices de consulta às
   tabelas de fatos. Não remover unicidades globais nesta etapa.
3. Em cópia descartável, produzir e revisar uma tabela de mapeamento auditável
   de cada fato e vínculo histórico para tenant. Nenhum agente executa esse
   backfill em HML ou produção.
4. Aplicar o mapeamento aprovado em janela controlada, validar contagens por
   tabela, reconciliação FIFO/CMV e ausência de valores nulos.
5. Só então tornar colunas `NOT NULL`, trocar unicidades por versões compostas
   e introduzir FKs/locks com `tenant_id`. A migração deve ser reversível antes
   do passo de remoção de constraints antigas.
6. Alterar o principal, middleware, Server Functions e loaders para exigir
   tenant resolvido. Testar negação de tenant ausente e isolamento cruzado em
   toda leitura, mutação e acesso direto a Server Function.

## Decisões humanas necessárias

1. Confirmar se uma identidade pode pertencer a mais de um tenant e como
   seleciona o tenant ativo na sessão. Recomenda-se `tenant_memberships` N:N.
2. Aprovar o tenant de cada vínculo e de cada fato histórico antes de qualquer
   backfill. Recomenda-se ensaio em branch Neon descartável com reconciliação.
3. Definir quais chaves são globais e quais podem repetir por tenant,
   especialmente SKU, fontes de importação, idempotência e identidade de login.
4. Definir se tentativas de login são globais por identidade ou possuem escopo
   de tenant anterior à autenticação.

## Critérios para a implementação posterior

- Migration Drizzle revisada, sem `DEFAULT` que atribua tenant de produção.
- Todos os inserts recebem o tenant do contexto servidor; nenhum payload aceita
  `tenant_id` como autoridade.
- Todas as consultas e locks FIFO usam `tenant_id`; IDs isolados não permitem
  leitura ou mutação cruzada.
- Cálculos continuam em `bigint`/centavos internamente e somente formatam moeda
  na UI.
- Testes incluem dois tenants com SKU e chave idempotente repetidos, tentativa
  de leitura/mutação cruzada, concorrência FIFO por tenant e negação sem
  membership.
