# Matriz de autorização inicial — G1

## Estado

Matriz técnica de 2026-09-03. Seus guards estruturais estão aplicados às 30
Server Functions existentes: sem principal Neon verificado, vínculo ativo em
`app_user_access` e papel canônico, elas falham fechadas. A integração ainda
não está ativa em HML porque os bindings externos e secrets não foram gravados.
Qualquer mudança material de permissões continua sujeita a `HUMAN-APPROVALS.md`.

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

| Papel    | Finalidade proposta                                                                |
| -------- | ---------------------------------------------------------------------------------- |
| Admin    | Administração do acesso, configuração e toda a operação autorizada.                |
| Gestor   | Gestão diária, sem administração de identidades ou papéis.                         |
| Produção | Planejar, registrar e concluir produção; consultar catálogo e estoque necessários. |
| Venda    | Registrar vendas e consultar catálogo/estoque estritamente necessários.            |
| Consulta | Consultar dados operacionais e relatórios previamente autorizados, sem mutar.      |

## Permissões por domínio

| Permissão | Admin | Gestor | Produção | Venda | Consulta | Server Functions atuais |
| --- | --- | --- | --- | --- | --- |
| `catalog:read` | sim | sim | sim | sim | sim | `listCategories`, `listProducts`, `listPurchasableProducts`, `listSaleProducts` |
| `catalog:write` | sim | sim | não | não | não | criar, editar e inativar categoria/produto |
| `purchases:read` | sim | sim | não | não | não | `listPurchases` |
| `purchases:write` | sim | sim | não | não | não | `createPurchase` |
| `inventory:read` | sim | sim | sim | sim* | sim* | `listInventory` |
| `sales:read` | sim | sim | não | proposta† | proposta† | `listSales` |
| `sales:write` | sim | sim | não | sim | não | `createSale` |
| `expenses:read` / `expenses:write` | sim | sim | não | não | não | `listExpenses`, `createExpense` |
| `production:read` / `production:write` | sim | sim | sim | não | não | workspace, prévia, criação, consulta e conclusão de lote |
| `reports:financial:read` | sim | sim | não | não | proposta‡ | `getOperationalReports` |
| `dashboard:read` | sim | sim | proposta‡ | proposta‡ | proposta‡ | `getDashboard` |
| `fifo:lifecycle:write` | sim | proposta§ | não | não | não | cancelamento, devolução, perda e ajustes |
| `fifo:audit:read` | sim | não | não | não | não | `getFifoMigrationAudit` |
| `access:manage` | sim | não | não | não | não | usuários, vínculos e papéis futuros |

\* A resposta atual de `listInventory` expõe custos de movimentos. Para Venda
e Consulta, habilitar esta leitura depende de uma projeção sem custo, em vez de
somente esconder valores na UI.

† “Apenas próprias” exige `actor_id` ou vínculo equivalente nos fatos de venda,
além de regra de delegação. Enquanto isso não existir, a opção segura é negar.

‡ `getOperationalReports` e `getDashboard` agregam dados financeiros. Consulta,
Produção e Venda só poderão recebê-los após definir uma projeção não financeira
e o escopo permitido.

§ Cancelamento, devolução, perda e ajuste afetam estoque e CMV/FIFO. Gestor só
poderá recebê-los se a revisão humana confirmar a separação de deveres e a
trilha de aprovação.

## Rota e proteção de interface

Todas as rotas atuais são operacionais. O desenho inicial é usar uma rota de
login pública e um layout autenticado para `/`, `/categorias`, `/produtos`,
`/compras`, `/estoque`, `/vendas`, `/despesas`, `/producao`, `/relatorios` e
`/fifo-migration-audit`. A guarda de rota melhora a navegação, mas cada Server
Function acima ainda deverá aplicar a mesma permissão no servidor.

## Decisões pendentes antes da aplicação

1. se Gestor pode executar lifecycle FIFO ou somente solicitar/aprovar;
2. quais projeções sem custo serão usadas por Produção, Venda e Consulta;
3. se Venda e Consulta terão escopo próprio, por local ou global;
4. quais eventos exigem dupla aprovação e como isso será registrado;
5. quais leituras administrativas e técnicas ficam restritas ao Admin.
