# Custos, recuperação e taxas — entrega HML de 18/10/2026

## Decisões aplicadas ao pacote

Usuário autorizou “Pode fazer tudo e publicar”. Confirmou oito ovos por forma
44 × 31,3 × 3 cm, com 850 g de massa assada/fria; 32 ovos fazem quatro formas.
5×5 rende48 simples ou24 recheados; 7×7 rende24 simples ou12 recheados.
As apresentações são alternativas. Bordinhas são recuperação variável, inclusive
zero, vendida em pacotes de100 g/R$6. Um saquinho próprio de referência0,11
mais um adesivo0,16 por pacote; sem fundir identidades de estoque pelo preço.

Após a correção do usuário (“as vendas são de todos os brownies”), a meta é
conjunta: todas as vendas realizadas contam. O plano-base não exige uma cota
mínima de Bordinhas. O mix dos demais16 produtos fica orientativo e normalizado
para100%; vendas de Bordinhas somam resultado conforme disponibilidade real.
O cenário original de17 produtos será arquivado, preservando seus17 itens e
histórico. Uma nova versão terá16 itens de planejamento e meta conjunta10mil.

Fixos2288 =2200 anteriores +88 MEI; incluem600 de MO (4 diárias de150) e
energia. Planejamento usa custos físicos sem cobrar essas parcelas novamente.
Débito1,43%, crédito3,36%, Pix0,49 por pagamento; sem média presumida por local.
Comparações separam os meios e o Pix exige informar número de transações.
Parâmetros e simulações não criam recebimentos, pagamentos ou despesas reais.

## Implementação

Nova receita-base versionada (source RECIPE-BASE-002) e17 perfis completos.
Versão anterior arquivada e seus itens/perfis preservados. Sete consumos de
receita, dois requisitos operacionais e31 componentes na versão nova:
12 recheios,17 adesivos e2 coberturas. Bombom com cerca de50 g de cobertura;
kit4 com200 g e somente embalagem externa/um adesivo. Rendimentos históricos
77 bombons e19,25 kits são referências; o formulário aceita unidades inteiras
na versão nova, permitindo registrar19 kits e1 bombom avulso.

Recuperação é informada em gramas; o sistema calcula pacotes inteiros e mostra
saldo inferior a100 g separadamente, sem lançar fração de pacote vendável.
Custo comum segue massa alocada aos pacotes e saídas principais. Recheios,
cobertura, embalagens e adesivos ficam no produto que os consumiu. Custos
exatos, projeções em centavos, estoques e camadas FIFO fecham na transação.
Custos de sobras não embaladas ficam absorvidos no lote; não é criado estoque
vendável nem ativo separado para esse saldo. Perdas continuam explícitas.

MO/energia da receita nova são valores reais totais informados por lote,
inclusive zero quando aplicável. Não converter150/diária em uma tarifa horária
presumida. As referências horárias antigas permanecem históricas; o writer
persiste unidade batch e não vincula a tarifa antiga ao total manual.

Ensaio encontrou e corrigiu movimentos de produção retroativos: movimentação e
disponibilidade FIFO agora usam a conclusão; a data informada do lote continua
separada. Não houve backfill ou alteração de movimentos existentes.

## Pacote auditável e sequência de publicação

Referência final: PROFILE-RECOVERY-FEES-2026-10-18-002. O candidato001 foi
consumido somente na cópia privada; nunca aplicado à original. Não reutilizar
nenhum recibo. Os arquivos finais em evidence/profile-materials-* são gerados
por scripts/prepare-profile-release.ts com entrada de backup lógico somente
leitura. Migrations0031/0032 acrescentam dois valores de enum e payment_fees
nullable; cadeia histórica ativa e nove colunas de custos exatos preservadas.

Sequência: validar/commitar fontes, build isolado, aplicar apenas schema com
nova auditoria/35 recibos; publicar Worker compatível; aplicar dados em outra
transação, ler independentemente, verificar UI e ativar versão nova pelo fluxo
autenticado autorizado. DDL de enum commita antes de usar os novos valores.
Não executar db:push nem db:migrate genérico. Aplicação HML concluída em18/10/2026, cerca de22h03 Brasília.

As pré-condições fixam33 recibos originais e fingerprints semânticos dos nove
cadastros relevantes. Timestamps de criação/atualização são excluídos apenas
no guard de equivalência da cópia; preservação de linhas antigas é verificada
inteiramente dentro da transação. Aplicação gera auditoria com antes/depois,
recibo/hash e motivo. Nenhum fato de compra, venda, estoque ou produção criado.

## Backup e recuperação

Provedor recusou novo snapshot e nova branch por limites da conta. Backups
Neon existentes permaneceram intactos; backup lógico atual dos cadastros,
parâmetros, cenários, histórico e auditoria foi salvo em /tmp, sem credenciais.
A cópia privada br-aged-violet-ac5aap1s validou o primeiro pacote; a diferença
inicial para a original era só timestamps de importação e ausência do cenário,
que foi semeado na cópia sob referência de fixture, sem operações.

O pacote final002 foi ensaiado exatamente em réplica lógica PostgreSQL17 local,
partindo do schema versionado e dados atuais dos cadastros originais. Passaram
rollback tardio, aplicação, preservação do mix histórico e bloqueio de repetição.
Recuperação após aplicação preserva novos registros/recibos e histórico; caso
necessário, fazer revisão compensatória de configuração usando o backup e os
antes/depois auditados. Não remover enum/colunas, apagar histórico ou repetir
cargas anteriores. Antes de reativar receita anterior, considerar os lotes que
possam ter sido criados após a entrega.

## Validações até o checkpoint de publicação

524 testes Node passaram, dois ensaios locais de navegador passaram (Pix por
transação e celular). Lint/tipos/formatação e Knip sem novos achados; builds isolados CI/HML aprovados. PostgreSQL17 com compras/lotes sintéticos passou:
consumo, custo exato268,58, alocação específica por produto, totais reais de MO,
FIFO, segunda conclusão rejeitada e falta de estoque sem efeitos parciais.
Nenhuma operação sintética foi enviada ao HML. CI39183477371 e CodeQL39183477521 aprovados no commit73ead0a; API confirmou
zero resultados nas três linguagens e zero alertas abertos na branch.


## Entrega confirmada

Commit73ead0a publicado no cacau-v1-hml: versão
`e206d319-feb7-4cc9-b86e-f61d83049b56`,100% de tráfego. Schema e dados002
aplicados em transações separadas, na sequência documentada;35 recibos.
Conferência independente:38 produtos, receita2/v2 ativa com7 consumos,
17 perfis/31 componentes ativos (12 recheios,17 adesivos,2 coberturas),
85 eventos auditáveis da entrega. Receita anterior, seus perfis/componentes
e17 itens do cenário anterior preservados. Referência002 consumida: não repetir.

Cenário2/v2/revisão2 ativado pelo fluxo autenticado do Dono com motivo;
16 itens orientativos somam10.000 pontos-base. Meta conjunta10mil, fixos2288.
Página confirma base antes das taxas15897; comparações de débito16186 e
crédito16642 de faturamento para ultrapassar10mil após custos/taxas. Pix
exige quantidade de pagamentos explícita. São estimativas pelas referências
de custo, não garantia de lucro ou de capacidade mensal. No limite de64
receitas mensais, taxas e arredondamentos podem exigir produção adicional.
Bombom, kit e Ninho7×7 continuam com alerta de margem mínima, sem aumentar
preços automaticamente.

Banco compartilhado continua com zero lotes e zero movimentos de estoque.
Não houve compra/venda/despesa sintética nem alteração de produção principal,
auth ou secrets. Sessão HML conferiu cenário ativo, parâmetros e prévia de48 simples5×5:
8 ovos,300 g de chocolate em pó,500 g de açúcar,240 g de farinha,215 ml de óleo,
0,8 m de papel,48 embalagens e48 adesivos. Estoque insuficiente corretamente
sinalizado; nenhum rascunho salvo. Homologação
operacional real e classificação de despesas para lucro realizado permanecem
tarefas separadas; esta entrega não afirma encerrá-las. Taxas são premissas e
simulações, sem lançamento financeiro automático.

Recibo: `evidence/cost-recovery-fees-hml-execution-2026-10-18.json`.
