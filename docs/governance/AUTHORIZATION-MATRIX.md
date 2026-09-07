# Matriz de autorização inicial — G1

## Estado

Matriz reconciliada em 2026-09-07. Seus guards estruturais estão aplicados às 30
Server Functions existentes: sem principal Neon verificado, vínculo ativo em
`app_user_access` e papel canônico, elas falham fechadas. A política e as
migrations de transição para Dono, Gerente e Funcionário já estão versionadas;
as migrations `0015` e `0016` foram aplicadas no banco HML, com a transição de
papel e os vínculos liberados registrados em auditoria.

Em 6 de setembro, o Worker HML recebeu o código atual, `/login` respondeu
`200` e `/` sem sessão redirecionou para `/login`; a versão publicada reconhece
`owner`. O Turnstile foi publicado com o widget limitado a `localhost`,
`127.0.0.1` e ao hostname HML; a site key pública foi incluída no bundle HML,
o segredo foi atualizado somente no Worker HML e a validação sanitizada por
Siteverify passou. Isso não equivale à homologação end-to-end: desafio real,
rejeição de replay, login, OTP, reset, logout, cookie, sessão, autorização e
negações por papel reais seguem pendentes de validação integrada autorizada. O
diagnóstico anterior do `403` permanece preservado como registro histórico em
`G1-CLOUDFLARE-HML.md` e não autoriza nova mudança material de permissões, que
continua sujeita a `HUMAN-APPROVALS.md`.

## Princípios

- A decisão é sempre tomada no servidor, por permissão e não somente por papel
  exibido na interface.
- Todo usuário autenticado recebe somente as permissões do seu vínculo Cacau.
- Leitura de relatório que contenha receita, despesa, custo ou margem é uma
  permissão financeira; não é consequência automática de poder vender ou
  produzir.
- Alterações de estoque, custo, FIFO, cancelamento e devolução são operações
  financeiras/auditáveis e permanecem explicitamente restritas.
- O escopo “dados próprios” não é habilitado até existir autoria auditável nos
  fatos operacionais. Hoje as tabelas de venda, compra e produção não possuem
  esse vínculo.

## Papéis

| Papel       | Finalidade proposta                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| Dono        | Toda a operação, configuração e administração de acessos.                                                     |
| Gerente     | Gestão diária, sem administrar identidades ou papéis.                                                         |
| Funcionário | Selecionar itens de catálogo e registrar compras e vendas, sem dashboard, relatórios ou leituras financeiras. |

`admin`, `production`, `sales` e `viewer` são valores legados da enumeração.
Não devem ser concedidos a novas contas. A migration `0016` converte o vínculo
Admin existente para `owner`; ela foi aplicada em HML. A compatibilidade de
leitura permanece apenas para uma transição reversível de vínculos legados.

## Permissões por domínio

| Permissão                              | Dono | Gerente | Funcionário | Server Functions atuais                                  |
| -------------------------------------- | ---- | ------- | ----------- | -------------------------------------------------------- |
| `catalog:read`                         | sim  | sim     | sim         | listagens de catálogo e itens de compra/venda            |
| `catalog:write`                        | sim  | sim     | não         | criar, editar e inativar categoria/produto               |
| `purchases:read`                       | sim  | sim     | não         | `listPurchases`                                          |
| `purchases:write`                      | sim  | sim     | sim         | `createPurchase`                                         |
| `inventory:read`                       | sim  | sim     | não         | `listInventory` (expõe custos)                           |
| `sales:read`                           | sim  | sim     | não         | `listSales`                                              |
| `sales:write`                          | sim  | sim     | sim         | `createSale`                                             |
| `expenses:read` / `expenses:write`     | sim  | sim     | não         | `listExpenses`, `createExpense`                          |
| `production:read` / `production:write` | sim  | sim     | não         | workspace, prévia, criação, consulta e conclusão de lote |
| `reports:financial:read`               | sim  | sim     | não         | `getOperationalReports`                                  |
| `dashboard:read`                       | sim  | sim     | não         | `getDashboard`                                           |
| `fifo:lifecycle:write`                 | sim  | não     | não         | cancelamento, devolução, perda e ajustes                 |
| `fifo:audit:read`                      | sim  | não     | não         | `getFifoMigrationAudit`                                  |
| `access:manage`                        | sim  | não     | não         | vínculos e papéis futuros                                |

## Rota e proteção de interface

Todas as rotas atuais são operacionais. O desenho usa uma rota de
login pública e um layout autenticado para `/`, `/categorias`, `/produtos`,
`/compras`, `/estoque`, `/vendas`, `/despesas`, `/producao`, `/relatorios` e
`/fifo-migration-audit`. A guarda de rota melhora a navegação, e cada Server
Function acima aplica a mesma permissão no servidor.

## Decisões pendentes antes da aplicação

1. se Gerente pode executar lifecycle FIFO ou somente solicitar/aprovar;
2. quais projeções sem custo serão usadas por Produção, Venda e Consulta;
3. se Venda e Consulta terão escopo próprio, por local ou global;
4. quais eventos exigem dupla aprovação e como isso será registrado;
5. quais leituras administrativas e técnicas ficam restritas ao Dono.
