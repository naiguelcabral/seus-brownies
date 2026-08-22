# Seus Brownies — Cacau v1

Painel operacional inicial para organizar produtos, compras, estoque, vendas, despesas e relatórios dos Seus Brownies.

## Executar localmente

Com Node.js e npm instalados, inicie o projeto pelo terminal na pasta deste repositório:

```bash
npm run ligar
```

O comando instala as dependências quando necessário, tenta buscar atualizações quando não há trabalho local pendente e abre o painel em `http://localhost:3000`.

## Salvar o trabalho

Ao encerrar, use:

```bash
npm run desligar
```

O comando registra as alterações no Git e sincroniza a branch quando houver conexão. Revise a mensagem do terminal caso exista algum conflito ou falha de conexão.

## Banco de dados

O painel possui operações reais em `/categorias`, `/produtos`, `/compras`, `/estoque`, `/vendas` e `/despesas`. O acesso ao PostgreSQL acontece somente em Server Functions; a `DATABASE_URL` não é enviada ao navegador. Ingredientes e embalagens podem não ter preço de venda, enquanto produtos finais exigem esse preço.

Compras criam entradas de estoque e vendas confirmadas ou pagas criam saídas. A visão geral mostra indicadores calculados do banco e apresenta estados vazios quando ainda não existem registros.

Consulte [a fundação do MVP](docs/MVP-01-FUNDACAO.md) para escopo, dependências externas e próximos passos.
