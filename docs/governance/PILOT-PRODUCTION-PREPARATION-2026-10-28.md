# Produção do piloto com referência do workbook — 28/10/2026

## Escopo autorizado

O usuário pediu usar o workbook como base de custos por ser ambiente de teste
e depois executar as atualizações e seguir o piloto. Escolheu 24 brownies
5×5 de brigadeiro e, nesta rodada, **preparar só a produção por enquanto**.
Confirmou que entrará na aba do Codex. A leitura da sessão anterior recuperou
essas decisões; os registros de 27/10 continuam válidos para as três compras
já concluídas, cujas referências não podem ser reutilizadas.

A autorização atual permite o complemento simulado no piloto isolado e o
lote de teste. Não transforma referências do workbook em compras históricas,
contagem física ou produção real. Venda, pagamento e entrega ficam fora
desta rodada. HML anterior e produção preservam seus gates.

## Fonte e plano privado

Workbook anexado somente em leitura, SHA-256
`add0174b9d8f7224e03f88f71d7f92c599fc998e502e2174e68f8d49854ebbeb`.
A análise foi reconferida com Artifact Tool; os custos das compras existentes
foram preservados. Quatro materiais sem saldo usam os preços e unidades de
`03_Cadastro_Insumos!B8:F10` e `B13:F13`. Energia e mão de obra usam as
tarifas/consumos do cadastro, não os totais antigos divergentes da ficha.
Dados comerciais e os cálculos detalhados permanecem privados.

Usar **Estoque → Ajuste positivo**, com custo total, origem contendo hash e
célula e motivo explícito de teste autorizado. Esse fluxo já existe, preserva
autoria/RBAC/CSRF, cria movimento/camada e auditoria na mesma transação e
recusa referência repetida. Não usar uma compra fictícia nem SQL direto.
O plano privado contém quatro referências estáveis; antes de retomar, consultar
os movimentos correspondentes. Nunca gerar novas referências para contornar
uma resposta perdida ou uma recusa de repetição.

O lote usa receita versão 2, perfil 33 e saída de 24 unidades do produto 16,
sem alterar receitas ou perfis. Energia/mão de obra são referências do teste,
registradas como tais nas observações. Recuperação de Bordinhas zero é uma
premissa da simulação, sem medição física declarada. Data do ensaio corrente,
sem inferir data antiga de compra ou reconstruir saldos históricos.

## Verificações realizadas

Leitura independente do piloto às 21:46 UTC: três compras, sete itens,
sete movimentos, nenhum lote e nenhuma venda. Os quatro materiais seguem
sem saldo. Fonte operacional: projeto `steep-brook-51659857`, branch
`br-blue-shadow-ackpk8ex`, banco `neondb`, conforme o recibo já integrado.

Em PostgreSQL 17 descartável local, com cadastro/receita/perfis e movimentos
necessários à simulação, as rotinas reais de persistência comprovaram:

- estoque insuficiente rejeita a conclusão sem novos movimentos;
- os quatro ajustes entram com custo/origem/auditoria;
- quatro repetições de ajuste são recusadas;
- a conclusão conserva o custo racional calculado independentemente;
- o estoque permanece não negativo e a camada FIFO contém 24 unidades;
- nova conclusão do mesmo lote é recusada sem efeitos adicionais.

81 testes direcionados passaram, zero falhas/ignorados: custo exato,
lifecycle, writer de conclusão e recuperação medida. O laboratório não
comprova Auth, interface ou inclusão no ambiente publicado. Houve reparos
na montagem da fixture local (produtos relacionados e tarifas faltantes),
sem alteração do código da aplicação. Workbook e banco remoto não foram
modificados. Não houve build ou deploy: não há mudança de bundle.

[Recibo sanitizado](../../evidence/pilot-production-preparation-2026-10-28.json).

## Estado e próximo passo

A aba controlável abriu em `/login`; falta sessão autenticada para executar
os quatro ajustes e o lote pela aplicação com a autoria da pessoa. O usuário
informou que entrará nessa aba. Não fabricar principal, copiar sessão do
tablet, receber senha/OTP ou substituir o fluxo por SQL.

Após a entrada: reconferir perfil e movimentos; gravar os ajustes pendentes
com as mesmas referências; preencher Produção e conferir a prévia; salvar
rascunho, anotar o ID e concluir esse mesmo lote uma vez. A criação do
rascunho não possui UUID idempotente no contrato atual: diante de resposta
incerta, consultar histórico/auditoria antes de tentar criar outro.
Reler estoque, consumos, custos, saída, camada e autoria independentemente.
I05 segue parcial até essa execução e demais aceites; I04 não está liberado.

## Novo resultado de dependências

`npm ci` preservou o lockfile. Auditoria online em 28/10 retornou dez pacotes
sinalizados: nove baixos e um crítico. `better-auth@1.7.6`, transitivo do SDK
Neon, está na faixa dos advisories
[GHSA-965c-763c-88jm](https://github.com/advisories/GHSA-965c-763c-88jm)
e [GHSA-r4xp-prcw-77qf](https://github.com/advisories/GHSA-r4xp-prcw-77qf).
O advisory crítico exige combinação de Magic Link, OAuth e armazenamento de
estado; a presença do pacote não comprova exploração no piloto.

O código local usa `createAuthServer` do SDK como proxy para Neon Auth.
A configuração/versão do servidor gerenciado não foi atestada nesta rodada.
Corrigir/revisar o grafo e confirmar a aplicabilidade no provedor em S03
antes de declarar segurança encerrada ou liberar I04. Não usar `audit fix
--force`, trocar provedor, alterar plugins ou reduzir controles por inferência.
A auditoria offline reportou zero durante a instalação, mas não substitui a
consulta online acima. Nenhuma dependência ou configuração remota alterada.
