# MVP-01 — Fundação do Cacau v1

## Visão do Cacau v1

O Cacau é o painel operacional dos Seus Brownies. Ele reunirá o cardápio, compras, estoque, vendas, despesas e relatórios para que a operação artesanal tenha uma fonte única de informação. A base prioriza rastreabilidade: estoque é resultado de movimentações e valores históricos de vendas e compras não mudam quando um produto é alterado.

## Escopo desta entrega

- Painel inicial responsivo, em português do Brasil, com navegação para Visão geral, Produtos, Compras, Estoque, Vendas, Despesas e Relatórios.
- Dados visuais identificados como dados de exemplo, sem conexão com banco nem integrações externas.
- Remoção das telas demonstrativas padrão do TanStack Start.
- Schema Drizzle/PostgreSQL para categorias, produtos, movimentações de estoque, compras e itens, vendas e itens, despesas e processamento futuro de mensagens.
- Migration gerada, sem aplicação em banco.
- Arquivo `.env.example` sem qualquer segredo.

## Modelo de dados

Os valores financeiros usam `numeric(12,2)` do PostgreSQL para evitar imprecisão de ponto flutuante. Cada produto é classificado como ingrediente, embalagem ou produto final e informa sua unidade de medida (`g`, `kg`, `ml`, `l` ou unidade). Quantidades em compras, itens de venda e movimentações usam `numeric(14,3)`, suportando registros como `1,500 kg` e `0,250 kg` sem perda de precisão.

O produto não tem campo de saldo editável: o saldo é calculado exclusivamente a partir de `stock_movements.quantity_delta`, em que entradas são positivas e saídas são negativas. Compras têm uma referência opcional para uma futura foto ou arquivo de nota fiscal; nenhum upload é implementado nesta etapa.

As tabelas `sale_items` mantêm nome e preço como retrato do momento da venda. `message_processing_records` guarda identificador único do provedor, estado, tentativas e erro para permitir idempotência quando a integração com WhatsApp existir.

## Dependências fora desta entrega

| Dependência     | O que permanece pendente                                                                     |
| --------------- | -------------------------------------------------------------------------------------------- |
| Neon            | Criar a branch `development`, configurar a conexão local e aplicar a migration.              |
| Meta / WhatsApp | Criar app, webhook, validação de assinatura e fluxo de mensagens. Nenhuma chamada foi feita. |
| Cloudflare      | Configurar secrets, ambiente e deploy do Worker. Nenhum deploy foi feito.                    |

## Única informação necessária depois

Insira somente a string de conexão da branch **`development`** do Neon em `DATABASE_URL` no arquivo `.env.local`. Não versione esse arquivo.

Depois de configurá-la, os comandos sugeridos são:

```bash
npm run db:generate
npm run db:migrate
```

O primeiro apenas atualiza a migration a partir do schema. O segundo cria as tabelas na branch configurada; execute-o somente depois de revisar a migration.

## Próximos passos

1. Implementar relatórios detalhados usando os registros reais.
2. Integrar o webhook de WhatsApp com processamento idempotente.
3. Definir autenticação, permissões, upload de nota fiscal e estratégia de deploy antes de disponibilizar o painel.

## MVP-02 — Cadastro de categorias e produtos

As páginas `/categorias` e `/produtos` agora usam Server Functions do TanStack Start e Drizzle para listar, criar, editar e ativar/desativar registros. Não existe exclusão física: itens inativos permanecem disponíveis no histórico.

O acesso ao banco acontece exclusivamente nas funções de servidor. O navegador recebe dados das listas e envia apenas os campos dos formulários; `DATABASE_URL` não é exposta ao cliente.

Para suportar ingredientes e embalagens, `products.sale_price` passou a aceitar `NULL`. Produtos finais continuam exigindo preço de venda pela validação de formulário e do servidor. Essa alteração gera uma migration incremental, pois a migration inicial já foi aplicada no ambiente development.

## Fases operacionais seguintes

Compras e itens de compra agora são registrados com quantidades decimais e custos. A mesma transação cria as entradas em `stock_movements`. Vendas registram itens e totais calculados no servidor; somente os estados `confirmed` e `paid` criam saídas de estoque. Despesas são registradas separadamente.

A visão geral consulta o banco para mostrar produtos ativos, itens sem saldo ou com saldo negativo, compras recentes, vendas recentes, despesas do mês e quantidade de itens com saldo. Todas as listas possuem estados vazios para a operação recém-iniciada.

Migration pendente de aplicação: `0001_nervous_carnage.sql`, que torna `products.sale_price` opcional.
