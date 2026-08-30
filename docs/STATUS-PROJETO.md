# Status do projeto — Seus Brownies / Cacau v1

> Atualizado em 30 de agosto de 2026. Este é o resumo operacional do projeto.
> Os documentos de prévia e importação preservam o histórico e a auditoria de
> cada etapa; não são substituídos por esta página.

## Propósito

O **Cacau v1** é o painel operacional dos Seus Brownies. A meta é manter uma
fonte única e rastreável para catálogo, compras, estoque, produção, vendas,
despesas e relatórios. O assistente reativo no WhatsApp, a autenticação e o
pagamento continuam fora da versão atual.

## Tecnologia adotada

| Camada | Decisão atual |
| --- | --- |
| Aplicação | TanStack Start, React e TypeScript |
| Interface | Tailwind CSS e componentes de interface locais |
| Servidor | Server Functions do TanStack Start |
| Banco | PostgreSQL com Drizzle ORM; ambiente de desenvolvimento no Neon |
| Hospedagem | Cloudflare Workers (`cacau-v1`) |
| Autenticação | Neon Auth, planejado para etapa futura |
| Mensageria | WhatsApp Cloud API, planejada para etapa futura |

Segredos e URLs de conexão ficam exclusivamente no ambiente/Worker. Nenhum
arquivo local de ambiente deve ser versionado ou compartilhado.

## O que já foi feito

### Painel e cadastros

- Painel em português com visão geral e rotas para categorias, produtos,
  compras, estoque, vendas, despesas e produção.
- Categorias e produtos com criação, edição e ativação/desativação; não há
  exclusão física para preservar o histórico.
- Produtos distinguem ingrediente, embalagem e produto final. Apenas produtos
  finais exigem preço de venda.

### Operação e estoque

- Compras registram itens, quantidades decimais, custos e entrada de estoque
  em uma única transação.
- Estoque é calculado pelo razão de movimentações; não existe saldo editável.
- Vendas e despesas têm validação no servidor. Vendas confirmadas ou pagas
  fazem baixa de estoque na mesma transação; rascunhos e canceladas não fazem.
- Itens de venda guardam nome e preço praticado no momento da venda.
- A visão geral usa dados reais e apresenta estados vazios para uma operação
  recém-iniciada.
- A rota `/relatorios` filtra períodos e consolida faturamento confirmado por
  canal, despesas por categoria, estoque valorizado por custo médio e vendas
  por produto. Custos, consumo e perdas de lotes aparecem quando os dados de
  produção real estiverem disponíveis.
- Há testes determinísticos para arredondamento monetário, quantidades,
  capacidade/rendimento, Bordinhas como coproduto, perdas com motivo, saldo
  insuficiente, dupla conclusão e agregações de relatório.

### Dados, importação e produção

- O catálogo inicial e o histórico de 2026 foram importados para o ambiente
  informado, com chaves externas, hashes e manifestos de aliases auditáveis.
- Há prévias somente leitura para catálogo, histórico e produção a partir do
  workbook. Elas não alteram o arquivo de origem nem gravam no banco.
- A receita-base, tarifas, 17 perfis e os 12 componentes de recheio aprovados
  foram carregados como dados de referência.
- A tela de produção cria lotes reais em rascunho. A conclusão prevista baixa
  insumos, registra saídas, entradas, perdas declaradas e custos operacionais
  na mesma transação.
- Energia e mão de obra são custos operacionais: não compõem estoque.
- Bordinhas é coproduto de lote, não perda automática.

### Infraestrutura

- O Worker está nomeado como `cacau-v1` e usa compatibilidade Node.
- A conexão ao PostgreSQL é aberta apenas por uma operação de servidor que
  realmente precisa do banco; ela não é enviada ao navegador.
- Painéis de desenvolvimento não fazem parte da interface pública.

## Situação de migrations e validação

- As migrations até `0007_unique_post.sql`, a carga do catálogo, do histórico
  e dos dados iniciais de produção já foram aplicadas no ambiente informado.
- As migrations `0008_high_rumiko_fujikawa.sql` e
  `0009_lethal_pyro.sql`, necessárias para o fluxo completo de produção real,
  foram aplicadas no ambiente autorizado em 29 de agosto de 2026.
- `lint` e `build` foram registrados como concluídos nas fases de cadastros,
  compras/estoque, vendas/despesas e dashboard. Qualquer mudança posterior
  deve repetir essas verificações quando Node.js estiver disponível.

## Homologação HML em development

O ciclo `compra -> estoque -> produção -> venda -> despesa -> relatórios` foi
homologado exclusivamente em `development`; seus dados HML devem permanecer
como trilha de auditoria.

- A compra HML 1 preserva Farinha `INS004` a `0.005` por grama. O lote 18 foi
  concluído sem perdas, com custo total `68.00` e saídas de `12.000` `PROD003`
  e `6.000` Bordinhas.
- O rateio alocado preserva `45.33` para `PROD003` e `22.67` para Bordinhas,
  totalizando exatamente `68.00`.
- As vendas HML 1 e 2 totalizam `12.00` cada; a despesa HML 1 registra `1.00`
  em `Homologação HML` e não afeta estoque. Os saldos consolidados são
  `10.000` `PROD003` e `6.000` Bordinhas.
- Faturamento confirmado, despesas e resultado financeiro simples são
  `24.00`, `1.00` e `23.00`. Isso não representa margem realizada: o modelo
  ainda não vincula venda a lote específico.
- As migrations chegam a `0011_demonic_redwing.sql`; `unit_cost` usa
  `numeric(12,3)` e os custos alocados de produção usam `numeric(12,2)`.

## FIFO de CMV local

A primeira entrega local de FIFO está preparada, mas ainda não foi aplicada em
nenhum banco: [FIFO-CMV-PRIMEIRA-ENTREGA.md](FIFO-CMV-PRIMEIRA-ENTREGA.md).
Ela cria camadas somente para saídas concluídas de produção e aloca CMV para
vendas confirmadas/pagas. A migration é portátil; o backfill HML foi separado
em script opt-in exclusivo de development. Perdas, ajustes, devoluções,
cancelamentos posteriores e produtos acabados comprados diretamente permanecem
explicitamente adiados para a próxima fase.

## Não faz parte do estado entregue

A ideia inicial de uma vitrine pública com carrinho, retirada/entrega e pedidos
de cliente não é o escopo canônico implementado. O modelo atual trabalha com
**vendas** operacionais (`sales` e `sale_items`), não com um novo fluxo
`orders`/`order_items`. Caso a vitrine seja retomada, ela deverá ser definida
como uma nova etapa, compatível com o modelo de vendas e estoque existente.

Também não foram implementados:

- autenticação, perfis e permissões;
- integração, webhook ou envio pela WhatsApp Cloud API;
- pagamentos online;
- upload/armazenamento de notas fiscais;
- regras de entrega, taxa, raio ou janela de atendimento;
- deploy de produção e configuração dos secrets do Worker;
- relatórios detalhados além dos indicadores atuais.

## Próximas etapas recomendadas

1. Preservar os dados HML em `development` como trilha de auditoria, sem
   limpeza ou reutilização de seus prefixos.
2. Decidir se margem por
   produto deverá receber vínculo explícito entre venda e lote.
3. Definir autenticação e permissões antes de abrir o painel para mais pessoas.
4. Decidir o canal de confirmação de pedidos e, depois, integrar o WhatsApp com
   processamento idempotente.
5. Se a vitrine pública voltar ao plano, especificar seu relacionamento com
   vendas, estoque, pagamento e entrega antes de implementá-la.

## Onde encontrar os detalhes

- [Fundação e decisões do MVP](MVP-01-FUNDACAO.md)
- [Prévia do catálogo](IMPORTACAO-WORKBOOK-PREVIA.md)
- [Prévia e importação do histórico](IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md)
- [Prévia de produção e fichas técnicas](IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md)
- [Registro das fases executadas](AUTO-EXECUCAO.md)
- [Checklist de homologação de produção](HOMOLOGACAO-PRODUCAO-REAL.md)
- [Proposta de acesso e itens futuros](ACESSO-E-ITENS-FUTUROS.md)
