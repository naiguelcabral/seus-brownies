# Visão geral estruturada — 18/10/2026

Estado: dashboard implementado localmente; publicação HML pendente de
autorização. Solicitação: dashboard estruturada e prática na Visão geral.

## Organização entregue

- Resumo com horário de atualização em Brasília, mês das despesas e botão
  para atualizar os dados, com estado de carregamento/erro.
- Quatro cartões navegáveis: produtos ativos, itens com saldo, reposição e
  despesas do mês. No celular usam duas colunas.
- Área de atenção com saldo e limite de reposição, prévia dos cinco itens,
  total explícito e acesso à lista completa de estoque. Sem alerta, mostra
  orientação para revisar os limites cadastrados.
- Ações rápidas para vendas, compras, produção, despesas, relatórios e metas,
  filtradas pelas permissões existentes da conta.
- Últimos registros de compras e vendas, com datas, valores e situação.
  Os cinco registros de cada tipo são independentes do período mensal.
- Orientação inicial quando não há compras/vendas. Não cria demonstrações
  nem mistura rascunho/cancelamento, metas ou projeções com receita realizada.
- Rota com estados de carregamento e erro recuperável. Layout responsivo.

A consulta de despesas agora limita o intervalo ao mês exibido, em calendário
de Brasília, com início inclusivo e início do mês seguinte exclusivo. Antes,
usava o mês UTC do runtime e apenas limite inferior, podendo incluir despesas
de meses futuros. Não muda fatos, competência, caixa, CMV ou cálculos de custo.
Os indicadores de estoque mantêm o cálculo exato de reposição no servidor.
Data/hora das vendas usa o timestamp original, sem tratá-lo como data de compra.

Arquivos principais: `src/routes/index.tsx`,
`src/features/dashboard/DashboardOverview.tsx`,
`src/features/dashboard/period.ts` e a consulta `getDashboard` existente.
Sem schema, nova dependência, mudança de RBAC, dado compartilhado ou deploy.

## Verificações

- 509 testes Node aprovados; dois novos casos verificam virada de mês no
  horário de Brasília, virada de ano e fevereiro bissexto.
- Quatro cenários locais de navegador: vazio/atalhos, reposição e situação,
  atualização/permissões e disposição móvel sem rolagem horizontal.
- Cinco cenários do modal de Produtos aprovados após extrair o servidor de
  ensaio compartilhado. Fixtures constroem os componentes reais com CSS da
  aplicação, dados sintéticos e configuração/ambiente isolados; não acessam
  auth ou banco. Entradas HTML declaradas no Knip, sem alterar a baseline.
- Tipos, lint e Oxfmt aprovados. Knip mantém três achados anteriores e zero
  novos. Build isolado de CI aprovado no commit `bae3fa1`, com chave pública
  sintética explícita e árvore limpa. Warning CSS sourcemap não bloqueante.

Ensaio: `node node_modules/@playwright/test/cli.js test --config
playwright.dashboard.config.ts`. Artefatos locais em
`/tmp/cacau-dashboard-{desktop,mobile,empty}.png` e
`/tmp/cacau-dashboard-results`; apenas dados sintéticos.

Não foram executados CI/CodeQL remotos ou escrita no banco. Próximo gate:
autorização específica para publicar no Worker HML já utilizado, incluindo
o modal de Produtos que está na mesma branch. Não autoriza produção.
