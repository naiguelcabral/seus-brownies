# Levantamento consolidado de pendências — Cacau v1

Checkpoint posterior: C01 recebeu custos exatos e compra em kg pelo total,
com 505 testes, PostgreSQL 17 e CI/CodeQL aprovados. Após aprovação humana,
schema aplicado e HML publicado em 18/10/2026. Falta homologação operacional
autenticada. O levantamento abaixo preserva a evidência anterior à correção. Ver [ADR-0002](../ADR-0002-CUSTOS-EXATOS-E-EXIBICAO-MONETARIA.md).

Data: 18 de outubro de 2026. Base de código: `736953e`, branch
`feat/input-catalog-kg-purchases`; árvore limpa no início da revisão.
Levantamento solicitado pelo usuário; não autoriza executar os itens levantados.

## Revalidação para definição da próxima etapa

Nova varredura em 18 de outubro de 2026, com base em `266ed58`, confirmou
o inventário abaixo por leitura de governança, roadmap, matriz de paridade,
readiness, resiliência, código de custos/catálogo/finanças, workflows e GitHub.
São 34 frentes atuais e sete evoluções condicionais; elas têm tamanhos
diferentes e não representam percentual de conclusão.

- Árvore limpa no início; branch atual e remota em `266ed58`, 58 commits à
  frente da main `32a9e11`, sem commits exclusivos desta; diff de 212 arquivos.
- PRs #44/#45 continuam abertas e draft; issue #36 continua aberta. Nenhuma
  PR da branch atual apareceu na listagem de PRs abertas.
- [CI 39114543300](https://github.com/naiguelcabral/seus-brownies/actions/runs/39114543300)
  e [CodeQL 39114543290](https://github.com/naiguelcabral/seus-brownies/actions/runs/39114543290)
  aprovados em `266ed58`. Nesta revalidação não foi repetida a consulta de
  alertas de segurança, a auditoria npm ou a suíte completa.
- C01 reproduzido novamente com as funções puras atuais, sem banco:
  entrada R$ 12,50, média R$ 0,013/g, consumo de 250 g R$ 3,25 e consumo
  de 1000 g R$ 13,00. `enrichCosts` ainda compõe essas funções.
- F01 confirmado: `summarizeFinancialIndicators` é chamado somente em testes.
  S01 confirmado no CRUD de catálogo inspecionado: não chama o writer de
  auditoria operacional. T04 confirmado no prompt documental do piloto,
  que ainda pede Prettier. A `0017` ativa mantém referências a `products.unit`.
- As contagens do banco e a versão HML da tabela abaixo permanecem evidências
  da consulta anterior, com seus instantes registrados; não foram consultadas
  novamente. Não houve escrita compartilhada, deploy ou mudança de código.

**Próximo pacote recomendado:** somente C01, com teste que reproduza o defeito,
conservação do valor nos consumos parciais/sucessivos/integrais, múltiplas
entradas e rollback transacional. O aceite exige que R$ 12,50 de entrada
continuem R$ 12,50 ao consumir todo o saldo, sem alterar precisão ou regra de
negócio silenciosamente. Depois, preparar O01–O04 e QA isolado I01/G02 para
homologar H01–H05. T01/T02 e S01 devem estar resolvidos ou ter escopo de
liberação explicitamente aceito antes da liberação definitiva I04; estar
listados em P2 não significa que sejam dispensáveis para produção.

## Critério e alcance

Cruzamento de roadmap, status, paridade workbook/sistema, runbooks, código,
Git/GitHub e duas consultas agregadas em transações explicitamente READ ONLY
na original `steep-brook-51659857` / `br-lingering-wind-acwh5wap` / `neondb`.
Sem consulta de linhas pessoais, credenciais ou arquivos de ambiente.

Estados usados: **corrigir** (defeito reproduzido), **cadastrar/configurar**
(estrutura existe, fatos faltam), **homologar** (implementação existe, falta
aceite operacional), **implementar** (lacuna de código), **decidir** (escopo ou
regra ainda depende de responsável). Teste local, publicação e homologação são
evidências diferentes. Ausência de registros não comprova defeito de software.
Esta é uma revisão dirigida de pendências; não substitui auditoria exaustiva
de segurança, desempenho ou de todos os caminhos de negócio.

## Situação confirmada

| Item | Evidência atual |
| --- | --- |
| HML | `b60a9d12-12b1-4458-81b4-53edaf674730`, publicação confirmada nesta conversa; Relatórios é a segunda guia |
| Catálogo | 36 produtos: 17 finais, 11 ingredientes e oito embalagens/materiais |
| Receita/perfis | zero receitas, itens de receita, perfis e componentes de perfil |
| Custos produtivos | zero tarifas e zero requisitos operacionais de receita |
| Operação | zero compras, movimentos de estoque, lotes, vendas, despesas e camadas FIFO |
| Gestão | um registro de parâmetros, um local/canal; zero cenários, mix, planos de ação, períodos e eventos financeiros |
| Reposição/fornecedores | zero insumos com ponto de reposição ou fornecedor padrão informado |
| Acesso | um Dono e um Gerente ativos; nenhum Funcionário cadastrado na allowlist consultada |
| Importações | dois recibos, somente catálogo de venda e insumos; referências consumidas |
| Schema da original | 31 recibos, coerentes com atualização específica até 0028 e duas pontes já documentadas |
| Integração | `origin/main` em `32a9e11`; branch atual 57 commits à frente, sem commits exclusivos da main; diff de 210 arquivos |
| GitHub | PRs abertas #44 e #45, ambas draft; issue #36 aberta; nenhuma PR da branch atual na listagem |
| Qualidade | CI `39114145780` e CodeQL `39114145813` aprovados em `736953e`; zero alertas abertos para esta branch |
| Dependências | `npm audit --json` nesta revisão: zero vulnerabilidades |

Contagens operacionais conferidas às `2026-10-18T09:10:03.101Z`; os demais
agregados de acesso/configuração foram consultados em seguida. Essas contagens
referem-se à original atual, não às bases históricas de homologação.

## P0 — corrigir antes de homologar custo produtivo

**C01 — custo de consumo em gramas perde o total exato por arredondamento.**

Requisito humano reforçado em 18 de outubro de 2026: o valor lançado em
centavos é exato e não pode ser arredondado ou substituído pela multiplicação
de um custo unitário aproximado. Entrada, consumo acumulado e saldo devem
conservar integralmente esse valor. Este esclarecimento não aprova aumento
de precisão do schema nem uma regra de truncamento/distribuição de resíduos.
Para consumo parcial com fração de centavo (250 g de 1000 g por R$ 12,50
correspondem exatamente a R$ 3,125), definir explicitamente a representação
antes de implementar: preservar a fração exata internamente ou autorizar uma
regra de alocação em centavos. Não presumir essa escolha.

A compra em kg mantém o valor total em `allocated_cost`, mas a produção
obtém primeiro o custo médio por grama com três casas e o multiplica pelo
consumo. Isso pode criar custo sem correspondência com o valor de entrada.

| Reprodução com funções atuais | Resultado |
| --- | --- |
| Entrada: 1000 g, custo total R$ 12,50 | valor de estoque: 1250 centavos |
| Custo médio arredondado por g | R$ 0,013 |
| Consumo de 250 g | R$ 3,25; proporção simples do total seria R$ 3,125 antes do fechamento em centavos |
| Consumo dos 1000 g | R$ 13,00, superior em R$ 0,50 ao valor de entrada |

Reproduzido sem banco com `calculateInventoryState` e
`calculateUnitCostCents`. Caminho efetivo: `enrichCosts`, em
[functions.ts](../../src/features/production/functions.ts), chama
`calculateWeightedAverageCost` e depois `calculateUnitCostCents`.

Falta corrigir a composição de consumo para conservar o valor disponível e
fechar resíduos em centavos, com testes de consumo parcial, sucessivo, integral,
várias compras e rollback. Não aumentar a precisão do schema nem mudar a regra
financeira silenciosamente. O teste anterior de kg verificou quantidade e
valor de entrada, mas não essa composição até a baixa produtiva.
Nenhum fato operacional foi alterado por esta revisão; a base consultada não
tem produção ou movimentos para quantificar eventual efeito histórico nela.

## P1 — preparar a operação e obter aceite real

| ID | Pendência | Estado e próximo resultado esperado |
| --- | --- | --- |
| O01 | Completar os insumos exigidos pela ficha técnica | **Cadastrar/reconciliar.** A receita usa `HIS-OVOS-GRANDES`, ausente do catálogo atual. Os dez SKUs adicionais das prévias históricas precisam de revisão de escopo; não importar todos por inferência. Os 19 `INS` cobrem a tabela inicial, mas não toda a necessidade da ficha/histórico. |
| O02 | Cadastrar a receita-base versionada | **Cadastrar.** Sete linhas técnicas vinculadas, com unidades e quantidades conferidas. Hoje não há receita selecionável na original. |
| O03 | Cadastrar perfis e componentes | **Cadastrar/homologar.** Reconciliar os 17 perfis previstos, rendimento, corte, coproduto Bordinhas, embalagens e recheios. Manifesto já registra decisão de 20 g/40 g para os recheios; falta aplicação no alvo atual, sem inventar nova decisão. Rever particularidades de bombom/kit e regras de embalagem. |
| O04 | Configurar energia e mão de obra | **Cadastrar/homologar.** Tarifas por vigência e requisitos produtivos da receita. São custos, sem saldo de estoque. Hoje as duas estruturas estão vazias. |
| O05 | Constituir estoque inicial rastreável | **Decidir/cadastrar.** Conferir estoque físico, documentos, quantidades e custos; registrar compras ou ajuste inicial autorizado com motivo e referências novas. Catálogo sozinho não cria saldo. Não importar planos como produção realizada. |
| O06 | Pontos de reposição e fornecedores | **Configurar.** Informar limites na unidade canônica e fornecedor padrão quando houver fonte válida; homologar lote/validade/fornecedor real das compras e alertas de estoque baixo. |
| O07 | Confirmar parâmetros e metas | **Homologar/configurar.** Conferir valores vigentes de custos fixos, reserva, margens, tolerâncias e dias/semanas. Um registro de parâmetros existe, mas isso não equivale a aceite de toda a operação. |
| O08 | Criar o primeiro cenário e mix | **Cadastrar/homologar.** Não há cenário/mix. Revisar premissas de custo após C01, versionar, ativar com 100% e testar projeção separada do realizado; não semear o mix histórico de 103% sem o procedimento aprovado de normalização. |
| O09 | Conferir locais e canais | **Configurar/homologar.** Existe um local; confrontar com os cinco locais/canais das prévias históricas, classificação e uso nas vendas. Decidir quais fazem parte da operação atual. |
| O10 | Escolher entre começar do corte atual ou importar histórico | **Decidir; condicional.** Só se o histórico for desejado: revalidar workbook, aliases, duplicidade, datas, custos, idempotência e impacto nos relatórios. Recibos do catálogo não autorizam essa carga; bases históricas devem ser preservadas. |
| O11 | Manutenção diária de fichas/perfis/tarifas | **Decidir/implementar.** O inventário atual oferece consulta/uso na Produção e scripts de importação, sem tela própria de edição desses cadastros. Definir se o procedimento controlado será suficiente ou entregar gestão versionada pela interface, com auditoria. |
| H01 | Login e sessão no HML atual | **Homologar.** Login → Estoque → Relatórios → recarga → logout, expiração/revogação, OTP e recuperação. A correção do 429 foi publicada; falta comprovação integrada, sem prometer que a redução de chamadas eliminou todo limite do provedor. |
| H02 | Controles antiabuso reais | **Homologar.** Cinco falhas, cooldown durável, limiter distribuído, Turnstile exigido/válido/inválido/replay, recuperação sem enumeração e falhas de auditoria. Usar identidade e cenário autorizados; o binding distribuído já está publicado. |
| H03 | Matriz de acesso por papel | **Homologar.** Dono, Gerente e Funcionário, inclusive chamada direta de Server Functions e negativas. Decidir identidade de teste de Funcionário e eventual segundo Gerente; não conceder papel para contornar teste. |
| H04 | Fluxo compra → produção → venda | **Homologar após C01/O01–O05.** Compra em kg, saldo em g, consumo parcial, saídas/camadas FIFO, venda, baixa, CMV, custos e autoria. Cobrir falta de estoque, repetição, concorrência e falha transacional, primeiro em ambiente descartável. |
| H05 | Lifecycle financeiro | **Homologar.** Entrega por competência, recebimento de caixa, cancelamento pré-entrega, devolução, reembolso versus crédito, resgate parcial, fechamento e correção de período. Confirmar preservação histórica e ausência de retorno de alimento pós-entrega. |
| H06 | Aceite das telas para uso diário | **Homologar.** Navegação por papel, celular, acessibilidade, desempenho percebido, filtros/paginação, estados vazios/erro, catálogo, compras, estoque, produção, vendas, financeiro, relatórios, CSV, cenários e plano de ação. Ver bundle publicado não substitui interação autenticada; não foram coletadas métricas de performance nesta revisão. |

Fontes de cadastro: [prévia de produção](../IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md),
[prévia histórica](../IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md) e
[manifesto técnico](../../data/receita-base-vinculos.json).

## P2 — completar produto, integração e sustentação

| ID | Pendência | Estado e próximo resultado esperado |
| --- | --- | --- |
| F01 | Indicadores financeiros completos na aplicação | **Implementar/integrar.** `summarizeFinancialIndicators` existe, mas só é chamado em testes. Integrar contribuição, lucro gerencial, custos fixos/reserva e fluxo de caixa a fontes classificadas e telas, sem duplicar energia/MO já incorporadas ao lote. Receita, CMV e margem bruta já possuem caminhos implementados. |
| F02 | Consolidar reconciliação de ponta a ponta | **Completar/homologar.** Já existem diagnóstico de razão/FIFO/reversões em Relatórios, cobertura entrega/FIFO no Financeiro e reconciliação de saída produtiva. Definir lacunas entre esses diagnósticos, saldo físico, estoque de insumos e CMV por competência, com casos reais e divergências sem correção automática. Não reimplementar do zero como sugerem checkboxes antigos. |
| F03 | Relatórios e alertas restantes | **Implementar/homologar por requisito.** Alerta de margem mínima realizada; comparações temporais específicas por canal; ranking por sabor depende de taxonomia explícita. Margem por produto/período/local/lote já possui componentes e exige primeiro dados e aceite. |
| F04 | Cobertura e sugestão de reposição | **Definir/implementar depois de histórico confiável.** Hoje não há consumo. Determinar janela, unidade e regra aprovada; não transformar estoque vazio em recomendação automática de compra. |
| T01 | Integrar o código publicado à main | **Revisar/integrar.** 57 commits e 210 arquivos ainda fora de `origin/main`; inclui TS 7/Oxc, segurança, reparos específicos, evidências, catálogo e UI. Reconciliar PRs #44/#45, preparar revisão do pacote atual e CI do resultado integrado; merge continua humano. Não mesclar tudo apenas porque HML funciona. |
| T02 | Finalizar a cadeia genérica de migrations | **Corrigir/decidir.** Issue #36 aberta; `0017` ativa ainda referencia `products.unit`. A original foi corrigida por ponte específica e tem schema até 0028; isso não corrige instalações novas nem libera o migrador genérico. Fechar estratégia auditável e provas para os alvos aplicáveis, mantendo o preflight bloqueante. |
| T03 | Executar os novos contratos de negócio em regressão integrada | **Completar testes.** Acrescentar o caso C01 e seu fluxo até consumo/FIFO, integrar os ensaios relevantes em PostgreSQL 17 à CI conforme escopo e registrar E2E autorizado. A suíte verde de 495 casos não cobre o caso monetário reproduzido. |
| T04 | Alinhar ferramentas e runtimes | **Corrigir manutenção.** Piloto/runbook ainda orientam Prettier; projeto usa Oxfmt. Definir Python suportado e configurar sua validação explícita na CI. Conferir extensão Oxc no editor humano. Avaliar avisos atuais das Actions sobre runtime/runner; sem upgrade automático de major. |
| S01 | Cobertura de autoria e auditoria de mutações | **Implementar/revisar.** CRUD de categorias/produtos não chama o writer de auditoria operacional no arquivo inspecionado. Mapear todas as mutações restantes e registrar ator/origem/motivo quando aplicável na mesma transação; não confundir autenticação com trilha completa de autoria. |
| S02 | Gestão autorizada de acessos pela interface | **Decidir/implementar.** Não existe rota administrativa de identidades/papéis no inventário atual. Definir concessão, revogação, troca de papel e autoria com as permissões já aprovadas; dupla aprovação é decisão futura, não controle hoje entregue. |
| I01 | Separar e formalizar ambientes de QA e produção | **Decidir/configurar.** O Worker é HML, mas o banco atual é a original/default chamada `production`; identidades Auth estão no contexto G1 documentado. Definir topologia, acesso mínimo, custo, dados permitidos e alvo de cada teste. Não executar testes destrutivos ou limpar essa base por causa do nome HML. |
| I02 | Backup e recuperação operacionais | **Decidir/implantar/homologar.** Houve backup e ensaio específicos da atualização; ainda falta política recorrente, cópia independente, retenção, RPO/RTO, responsáveis e ensaio periódico. Tratar o limite de snapshots sem apagar backups por inferência. |
| I03 | Monitoramento e resposta a incidentes | **Implantar/homologar.** Logs Cloudflare e auditoria auth existem; faltam cobertura estruturada dos demais domínios, alertas de erro/disponibilidade, responsáveis, correlação e política de retenção. |
| I04 | Liberação definitiva de produção | **Decidir/executar após os gates.** Versão integrada/revisada, schema, ambientes, secrets, domínio se desejado, recuperação, checklist de operação e aceite humano. HML publicado não significa produção liberada. |
| G01 | Reconciliar documentação canônica e fila | **Atualizar.** Deduplicar pendências superadas de deploy, migrations aplicadas na original, catálogo, rate limit, CMV e vulnerabilidades. Atualizar matriz de ambientes/paridade e fila do controlador sem apagar evidências históricas; este levantamento é o retrato reconciliado. |
| G02 | Plano de QA e critérios de liberação | **Organizar/executar.** Cenários por papel/módulo, responsáveis, ambiente, referências inéditas, severidade, evidências sanitizadas e aceite. Distinguir execução que lê de execução que escreve. |

## Evoluções condicionais de roadmap

Estas frentes não são automaticamente bloqueadores para uso interno dos Seus
Brownies; exigem confirmar prioridade e escopo antes de implementação.

| ID | Frente | Trabalho restante |
| --- | --- | --- |
| R01 | WhatsApp/mensageria | ADR, webhook assinado, evento persistido antes do processamento, idempotência, parser, IA só para interpretação, prévia humana, lifecycle, retry, auditoria e testes de replay. Há tabela de controle, mas isso não equivale à integração completa. |
| R02 | OCR e notas/documentos | Storage, upload seguro, extração candidata, validação/categorização, prévia, hash/deduplicação, vínculo com compra e retenção/privacidade. |
| R03 | Pagamentos e entregas ampliadas | Definir casos de uso/provedor, integração, idempotência e conciliação; especificar logística além da marcação de entrega/competência já existente. |
| R04 | SaaS multitenant | Aprovar memberships, tenant ativo e mapeamento histórico; migration gradual, unicidades/FKs/locks por tenant e testes de isolamento. Não atribuir tenant fictício aos fatos existentes. Não é requisito automático para uma única operação interna. |
| R05 | Gestão diária e produção avançada | Checklist operacional, UX diária, planejamento entre lotes e eventuais relatórios/otimizações adicionais com fonte/regra explícitas. |
| R06 | Exportação XLSX | CSV seguro já existe; XLSX é evolução fora do escopo atual, condicionada a necessidade confirmada. |
| R07 | Autonomia/automação do agente | Avaliar piloto/níveis 2–3, revisão automática de CI/dependências e multiagente somente sob governança e autorização adequadas; corrigir T04 antes de usar o controlador. |

## Pendências antigas que não devem ser repetidas como trabalho novo

| Registro antigo | Situação reconciliada |
| --- | --- |
| Publicar ordem das guias e compras em kg | Já publicado e conferido tecnicamente; falta apenas aceite autenticado quando aplicável. |
| Cadastrar 17 produtos finais e 19 insumos | Já persistidos e auditados; não repetir recibos. O01 trata complemento da ficha, não recarga do catálogo. |
| Aplicar 0019/0020/0021/0022/0027/0028 na original | Pacote específico até 0028 já aplicado; não executar migrations isoladas novamente. A cadeia geral permanece T02. |
| Decidir política financeira G2 e quantidades de recheio | Decisões já registradas. Falta aplicar/homologar conforme escopo, não pedir novamente a mesma política. |
| Configurar binding distribuído HML | Declarado e publicado; falta teste antiabuso integrado H02. |
| Incorporar Knip/CodeQL e limpar 48 ocorrências | Já feito nesta branch; três referências contextuais justificadas não são 48 tarefas novas. Falta integração à main. |
| Corrigir 13/16 vulnerabilidades antigas | Auditoria atual do lockfile retornou zero; manter acompanhamento, sem tratar números antigos como achado vigente. |
| Criar CMV/margem e reconciliação do zero | Componentes, relatórios e diagnósticos já existem; F01/F02 distinguem integração restante de homologação. |

## Ordem recomendada de execução

1. C01: corrigir custo com testes de conservação de valor antes de movimentar produção.
2. Reconciliar cadastro técnico O01–O04 e preparar cenário QA isolado I01/G02.
3. Homologar acesso e segurança H01–H03; constituir estoque rastreável O05.
4. Homologar compra → produção → venda → financeiro H04/H05; tratar falhas antes de aceite.
5. Configurar gestão O06–O09 e completar indicadores/reconciliação F01–F04.
6. Em paralelo à revisão técnica, reconciliar main/PRs e cadeia genérica T01/T02;
   completar auditoria, ferramentas, documentação e testes T03/T04/S01/G01.
7. Fechar ambiente, recuperação, monitoramento e checklist de produção I01–I04.
8. Só então priorizar as evoluções condicionais R01–R07 e eventual histórico O10.

## Fontes e limites finais

- [Roadmap](ROADMAP-CODEX.md), [status](PROJECT-STATUS.md),
  [paridade](WORKBOOK-SYSTEM-PARITY.md),
  [readiness de produção](PRODUCTION-READINESS.md) e
  [resiliência](OPERATIONS-RESILIENCE-RUNBOOK.md).
- [Issue #36](https://github.com/naiguelcabral/seus-brownies/issues/36),
  [PR #44](https://github.com/naiguelcabral/seus-brownies/pull/44) e
  [PR #45](https://github.com/naiguelcabral/seus-brownies/pull/45), consultadas nesta revisão.
- [CI do código-base](https://github.com/naiguelcabral/seus-brownies/actions/runs/39114145780)
  e [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/39114145813).

O levantamento não corrigiu C01, criou cadastros operacionais, executou E2E
mutável, aplicou migration, fez merge ou publicou nova versão. Alterações
desta tarefa são apenas documentais. Não há estimativa confiável de prazo ou
percentual global de conclusão sem detalhamento dos próximos pacotes e aceite.
