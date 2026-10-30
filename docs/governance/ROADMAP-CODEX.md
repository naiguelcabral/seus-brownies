# Roadmap único — Cacau v1

## I05: conferência manual dispensada e estoque negativo autorizado no piloto — 30/10/2026

Usuário pediu continuar os testes podendo negativar estoque e esclareceu “Pular a conferência manual; manter o histórico”. Essa decisão dispensa a conferência manual após cada etapa, não o histórico automático, autoria, transações ou idempotência. Autoriza uma exceção restrita ao piloto para saldo negativo; a regra normal permanece nos demais ambientes.

A implementação ainda não foi alterada ou publicada. Permitir a saída sem saldo também exige custo para a parte faltante: perguntado se deve usar o último custo de entrada (zero provisório somente quando não existir) ou sempre zero provisório. Aguardar essa decisão antes de alterar o custo, os escritores e seus testes; não desativar a auditoria nem remover apenas a checagem física deixando a alocação FIFO/custo inconsistente. Nenhuma escrita operacional nesta preparação, nenhum lote adicional ou repetição de referências. Piloto continua b3f972f2; a conclusão antes relatada não foi confirmada no último checkpoint. A investigação dessa conclusão não deve virar nova rodada obrigatória de conferência manual para o usuário.

Uso oficial nesta retomada: 48% restante na janela e 48% semanal; reserva de 5% não atingida. Próximo passo: incorporar a escolha de custo, isolar a exceção no servidor do piloto, cobrir saldo insuficiente, repetição, restauração e ambientes normais, revisar/integrar/publicar pelo fluxo habitual. Não declarar a exceção já ativa.

## I05: proteção do saldo publicada; conclusão simulada no tablet pendente — 30/10/2026

Usuário aceitou o padrão visual e confirmou “Simulação no piloto, sem produção física” para o rascunho #1 dos 24 brigadeiros. Prévia privada confirmou insumos suficientes e custos de referência, preservando compras e quatro complementos já registrados.

Regressão em PostgreSQL/HTTP local reproduziu uma perda após produção levando o insumo a −1, pois uma camada de ajuste positivo residual ainda permitia alocação. PR #105 revalida a soma de stock_movements sob o lock de produto existente, antes do plano FIFO e de qualquer escrita. Bloqueia saldo insuficiente/inválido; mantém custos, autoria, referências, transação e regras de produção. Não reconcilia camadas residuais de insumos nem amplia sua cobertura FIFO parcial.

661 testes Node, 18 ensaios conectados, lint/tipos/formato, Knip sem novos achados e build isolado aprovados. Doze checks finais e três workflows da main aprovados; três análises CodeQL reais sem achados/erros/avisos. Integração normal em 2fb5613, árvore igual ao HEAD aprovado dc4a19a. Publicado somente no piloto às 10:14:50 UTC (07:14:50 Brasília), versão b3f972f2-bc71-436c-9c30-fb654570bd9c a 100%. Configuração e seis nomes de secrets preservados; dez GETs públicos aprovados.

Leitura pós-publicação às 10:15:18 UTC mantém três compras/sete itens/onze movimentos, um rascunho com 24 unidades planejadas e realizado nulo, zero conclusão/venda/eventos financeiros. Nenhuma escrita operacional pelo agente. Aba controlável permanece em login; sessão do tablet não é compartilhada. Usuário orientado a atualizar a página e usar Produção → Ver lote #1 → Concluir lote e atualizar estoque na própria sessão. Usuário informou “Lote concluído”, mas duas leituras independentes, a última às 10:18:27 UTC, ainda mostram draft, onze movimentos e zero auditoria de conclusão. Solicitado status após atualizar a página e texto exato de eventual mensagem; aguardar esse retorno e investigar a divergência antes de repetir. Se houver conclusão confirmada, conferir saída 24, nove consumos/uma entrada, dois custos, custo exato e autoria/auditoria. Não repetir compras/complementos, criar outro lote, inventar produção física ou registrar venda/pagamento. I05 parcial/I04 mantidos. [Recibo](../../evidence/pilot-production-ledger-guard-publication-2026-10-30.json).

## I05: fonte e ícones padronizados e publicados — 30/10/2026

Pedido de manter o padrão das abas superiores aplicado em estoque.tsx e PositiveAdjustmentBatchImporter.tsx: fonte sans de 14px/negrito, cores/espaçamento da navegação e ícones Lucide de 16px nas quatro ações e no atalho de conferência. Ícones decorativos ocultos da árvore acessível; rótulos, comportamento, formulários e permissões preservados. PR #103 integrada em 5bfde91, árvore igual ao HEAD aprovado e6c0410. Doze checks finais e três workflows da main aprovados, com três análises CodeQL reais zeradas. Qualidade local, Knip sem novos achados, 17 ensaios conectados existentes e conferência visual em 375px aprovados; nenhum teste novo para espelhar estilos. Audit zero e build/deploy isolado aprovados.

Publicado somente no piloto às 09:17:04 UTC (06:17:04 Brasília): versão ab3d9fa2-be43-44b8-a2fd-b4a4f74e80d2, 100%. Configuração e seis nomes de secrets preservados; dez GETs de smoke aprovados. Leitura independente antes/depois mantém onze movimentos, um rascunho e zero conclusão/venda/eventos financeiros. Sem escrita operacional pelo agente. Aceite visual no tablet ainda separado; I05 parcial e I04 mantidos. [Recibo](../../evidence/pilot-inventory-navigation-style-publication-2026-10-30.json).

## I05: ações em janelas publicadas — 29/10/2026

PR #101 integrada normalmente em ed0b060, árvore igual ao HEAD aprovado 945ba74. Doze checks finais e os três workflows da main aprovados; CodeQL real com três análises sem achados/erros/avisos. 651 testes Node, 17 casos conectados, qualidade, Knip sem novos achados, audit zero e build/deploy isolado aprovados. Publicado somente no piloto às 00:46:17 UTC de 30/10 (21:46:17 Brasília de 29/10): versão 05356941-6c4a-4a42-a8f0-5b1ac5be5ad3, 100%. Configuração e seis bindings de secrets preservados; dez GETs públicos aprovados.

Compensação pós-entrega, perda de estoque e ajustes positivo/negativo agora são botões em Ciclo de vida e ajustes; cada ação abre somente seu formulário em janela. Campos preservados ao reabrir, confirmação renovada, foco/retorno visíveis e edição/fechamento/reenvio bloqueados enquanto registra. Perfis, escritores, payloads e auditoria preservados. A seleção ambígua da captura foi resolvida com região acessível nomeada; o ensaio de rede lenta foi corrigido para encaminhar uma vez cada requisição, sem retirar as asserções ou a restrição de origem local.

Complementos do workbook aceitos pelo usuário e conferidos independentemente: quatro movimentos/camadas/auditorias, valores esperados e ator autorizado. Contagens antes/depois da publicação: três compras, sete itens, onze movimentos, um rascunho, zero conclusão/venda/eventos financeiros. Lote #1 conserva 24 unidades planejadas, realizado nulo. Nenhuma escrita operacional pelo agente nesta entrega. Aceite visual no tablet ainda separado; retomar somente a preparação do mesmo lote, sem inferir produção física. I05 parcial e I04 mantidos. [Recibo](../../evidence/pilot-inventory-dialogs-publication-2026-10-29.json).

## I05: ações de estoque em janelas — 29/10/2026

Usuário pediu botões para compensação pós-entrega, perda de estoque, ajuste positivo e ajuste negativo dentro de Ciclo de vida e ajustes. Candidata abre somente o formulário escolhido em OperationDialog, com foco/fechamento, campos preservados ao reabrir e confirmação renovada. Bloqueia edição/fechamento/reenvio durante a gravação e mantém retorno dentro da janela; falha de atualização do histórico não transforma uma gravação confirmada em falha. Permissões, validações e escritores existentes preservados, sem schema ou API novos.

651 testes Node, lint/tipos/formato e Knip sem novos achados aprovados; laboratório conectado, build e publicação pendentes neste checkpoint. Leitura independente dos complementos confirmou quatro movimentos/camadas/auditorias com quantidades e custos exatos esperados e ator autorizado. Lote #1 permanece rascunho; I05 parcial/I04 mantidos, sem conclusão física presumida.

## I05: rendimento corrigido e publicado — 29/10/2026

PR #97 integrada em fb314fd, árvore igual ao HEAD aprovado dc2a9a6. Doze checks finais e os três workflows da main aprovados; análises CodeQL reais com zero achados/erros/avisos. 651 testes Node, 43 ensaios locais de navegador, qualidade, Knip sem novos achados, build isolado e auditoria zero aprovados. Publicado somente no piloto às 21:10:41 UTC: versão b3688e0d-d389-4cac-821a-2a3d5cdc2e13, 100%. Configuração e seis bindings de secrets preservados; dez GETs públicos aprovados.

A auditoria agora apresenta `24 un.` em vez de interpolar `24.000 unit`. Leitura independente pós-publicação às 21:11:17 UTC mantém lote #1 em rascunho, planejado 24 unidades, realizado/conclusão nulos e zero complementos do workbook. Nenhuma quantidade, cálculo, estoque ou fato de produção alterado. Usuário pode atualizar a página e reabrir o mesmo lote; aceite visual autenticado no tablet ainda separado. Depois confirmar os quatro complementos pelo fluxo já preparado e retomar a preparação. Não recriar lote/referências nem inferir produção física. I05 parcial e I04 mantidos. [Recibo](../../evidence/pilot-production-quantity-publication-2026-10-29.json).

## I05: apresentação do rendimento no rascunho — 29/10/2026

Usuário relatou que o rascunho #1 parecia indicar 24 mil unidades. Leitura independente às 16:27:03 UTC confirmou saída planejada `24.000` no decimal canônico do PostgreSQL (24 unidades), realizado nulo e status draft. A auditoria da interface interpolava o decimal sem formatação brasileira. Candidata apresenta `24 un.` e conserva frações com vírgula, milhares, diferenças negativas e ausência de realizado. Nenhuma alteração do lote, banco ou cálculos.

Regressões cobrem 24 versus 24 mil, frações, valores acima da precisão Number, rascunho sem produção e tela em 375/768px sem chamadas de escrita. Validação, integração e publicação em andamento. I05 parcial e I04 mantidos; conservar compras, referências dos complementos e rascunho #1.

## I05: conferência única publicada; confirmação no tablet pendente — 29/10/2026

PR #95 integrada em 24c9dc1, árvore igual ao HEAD aprovado 242d2f6. Doze checks finais passaram; três workflows da main e suas análises CodeQL reais sem achados, erros ou avisos. 649 testes Node, 17 casos conectados, qualidade, Knip sem novos achados, audit zero e build isolado aprovados. O ensaio de push encontrou espera indevida por networkidle na abertura de login; trocada por prontidão do documento, conservando as asserções de UI/RPC e segurança. Versão final de push/PR e main aprovadas.

Publicado somente no piloto às 15:08:40 UTC: versão f27304c7-aa80-4619-b549-3072be85c512, 100%, fonte 24c9dc1. Configuração, seis nomes de secrets e limites preservados; dez GETs de smoke público aprovados. Leitura independente às 16:11:54 UTC: três compras, sete itens/movimentos, um rascunho e zero ajustes/conclusão/venda/eventos financeiros.

Manifesto privado dos quatro complementos preparado com cadastro e referências originais conferidos; confirmação deve ocorrer na sessão Dono/Administrador do tablet. Publicação não inclui ajustes operacionais. Depois conferir movimentos, camadas, custo e autoria por leitura independente e retomar o rascunho #1 dos 24 brigadeiros. Não repetir compras, criar outro rascunho ou inferir produção física. I05 parcial e I04 mantidos. Recuperação de sessão relatada pelo usuário não atesta solução permanente dos 429. [Contrato](POSITIVE-ADJUSTMENT-BATCH.md) e [recibo](../../evidence/pilot-adjustment-batch-publication-2026-10-29.json).

## I05: conferência única de complementos em preparação — 29/10/2026

Usuário confirmou que o painel abriu no tablet e escolheu “Preparar uma conferência única no piloto, como fizemos com as compras”. A recuperação relatada supera a espera pendente do checkpoint anterior; não comprova solução permanente dos 429. Sessão do tablet permanece separada do navegador controlável.

Candidata acrescenta conferência sem escrita e confirmação dos ajustes na sessão do próprio usuário. Usa o escritor transacional existente e referências estáveis; recibos coincidentes são preservados na retomada e divergências bloqueiam o fluxo. Não altera permissões, contas, secrets, Auth ou schema. 649 testes Node, lint/tipos/formato, Knip sem novos achados e build isolado aprovados. Laboratório conectado passou em 17/17 casos; a consulta de auditoria do próprio teste recebeu correção de tipo. Revisão visual acrescenta atualização dos cartões após confirmação; repetir laboratório e conferir CI/CodeQL no HEAD final antes da publicação.

Rascunho #1 preservado; três compras, sete movimentos e nenhum dos quatro complementos na última leitura independente. Nenhuma nova escrita operacional. I05 parcial e I04 mantidos. [Contrato e retomada](POSITIVE-ADJUSTMENT-BATCH.md).

## Sessão do Dono: login aceito e consulta limitada pelo provedor — 29/10/2026

Usuário tentou a conta Dono pelo tablet e informou a mensagem exata
“Não foi possível verificar a sessão”. Leitura restrita da auditoria do piloto
confirmou login aceito da identidade Dono às 13:06:48.591 UTC. Consulta seca
à observabilidade encontrou `auth.session.provider`, stage `http_error`,
status 429 e code nulo no piloto; campos desse evento vistos às
13:06:49.337 UTC. Associação temporal compatível com a falha relatada,
sem correlação por Ray/request ID. Não inferir senha incorreta nem alterar
perfil, secrets ou limites de proteção. Pedido para aguardar dois minutos e
reabrir o piloto uma vez foi orientação de recuperação, sem sucesso ainda
confirmado pelo usuário.

Nenhuma alteração de código/configuração/contas ou escrita operacional nesta
investigação. Piloto continua 48b34e2d (fonte 844f425), com recibo #94 já
integrado na main de38496. Rascunho #1 preservado, quatro complementos ainda
pendentes; não criar outro lote, repetir compras ou trocar referências.
[Recibo sanitizado](../../evidence/pilot-owner-session-429-2026-10-29.json).

## I05: correção de permissões/retorno publicada — 29/10/2026

PR #93 integrada em `844f425`; main com CI/build, negócio/navegador e CodeQL
aprovados e análises reais zeradas. Versão `48b34e2d`, 100% no piloto,
configuração/contagens preservadas e smoke público aprovado. Matriz de acesso
não mudou. Pendências de integração/deploy abaixo são históricas e superadas.

Lote #1 continua rascunho de 24 brigadeiros; quatro complementos aguardam
sessão Dono. Login foi aberto após encerrar a sessão Gerente. Não recriar
lote, concluir produção física por inferência ou registrar venda. I05 parcial,
I04 e demais gates mantidos. [Recibo](PILOT-INVENTORY-PERMISSION-FEEDBACK-2026-10-29.md).

## I05: rascunho #1 e correção de retorno/permissões — 29/10/2026

Preparação do lote de 24 brigadeiros salva como rascunho #1, sem movimento de
estoque. Complementos aguardam sessão Dono já existente; Gerente não pode
ajustar FIFO. Candidata elimina formulários indevidos e torna a mensagem
visível, preservando a matriz/servidor. Validação local aprovada; conferir
CI/CodeQL e integrar/publicar a correção antes de declarar a UX resolvida.
Não repetir compras ou criar outro rascunho. I05 parcial e I04 mantidos.
[Recibo](PILOT-INVENTORY-PERMISSION-FEEDBACK-2026-10-29.md).

## S03: atualização publicada no piloto — 29/10/2026

PR #91 integrada em `91299ef` após revisão/checks; três workflows da main
aprovados e CodeQL real zerado. Audit online repetido com zero; candidata
validada com 642 testes e build isolado. Publicação autorizada concluída:
versão `16a49edf`, 100%, somente no piloto. Configuração e contagens
operacionais preservadas, smoke público aprovado e painel autenticado aberto.

Pendência de deploy e suspensão por reserva abaixo são históricas e superadas.
Prosseguir com preparação dos 24 brownies de brigadeiro na sessão do usuário,
sem inventar venda ou repetir compras. I05 parcial e I04, peer herdado da UI,
Dependabot alerts desativados e limites do servidor Auth continuam abertos.
[Recibo](PILOT-SECURITY-PUBLICATION-2026-10-29.md).

## Checkpoint de reserva — 28/10/2026

5% restante atingidos antes do deploy. PR #91 Seroval preparada e validada
localmente; conferir CI/CodeQL e revisar/integrar o patch antes da publicação
já autorizada no piloto. Reset 28/10 às 23:18:28 Brasília, retomada somente
após renovação confirmada. Nenhuma publicação ou escrita operacional ocorreu.
[Handoff](AUTONOMY-HANDOFF.md#publicação-do-piloto-suspensa-na-reserva--28102026).

## S03: novo alerta Seroval antes do deploy — 28/10/2026

Publicação autorizada do piloto ainda não executada: auditoria online
detectou dois advisories moderados em Seroval 1.6.9 após o fechamento #89/#90.
Patch mínimo 1.6.11 na PR #91, sem atualizar TanStack; oito regressões,
642 testes, qualidade, audit zero e build isolado aprovados. Conferir CI/CodeQL, revisar e integrar
esse incremento antes de publicar. A configuração remota permanece intacta;
o checkpoint anterior de audit zero não representa essa nova consulta.
[Recibo](../../evidence/seroval-predeploy-review-2026-10-28.json).

## S03: patch integrado; publicação pendente — 28/10/2026

PR #89 integrada após autorização em `4dc504b`, com a árvore aprovada intacta.
CI/build da main e laboratórios de negócio/navegador aprovados; três análises
CodeQL do merge sem resultados/erros/avisos, zero alertas abertos na main.
Correção do grafo entregue: dez alertas npm removidos na candidata, 640 testes
e build isolado aprovados. Não houve deploy; publicação no piloto é próxima
etapa separada. Peer herdado da UI, Dependabot alerts desativados e comprovação
interna do servidor Auth permanecem nos limites S03; não liberam I04.
[Recibo](SECURITY-ALERT-REVIEW-2026-10-28.md#integração-autorizada).

## S03: novos alertas verificados e candidata corrigida — 28/10/2026

Quatro advisories geram dez registros npm. Candidata Better Auth 1.7.10 e
renderer 2.2.0 remove os alertas; audit online zerado e gates locais de
qualidade, 640 testes e build isolado do piloto aprovados. Doze checks da
PR #89 em `e07454c` aprovados e três análises CodeQL sem resultados/erros/
avisos; zero alertas abertos da candidata. Recibo posterior só documental.
Magic Link desativado foi relido no piloto e no Auth anterior; não comprova
versão do serviço nem configuração interna OAuth Proxy/limiter. Peer interno
herdado da UI segue registrado. Dependabot alerts desativados segundo a API;
nenhuma mudança remota. Revisão/integração/publicação e aceites I05/I04 ficam
separados. [Revisão e recibo](SECURITY-ALERT-REVIEW-2026-10-28.md).

## I05: fase de compras executada e conferida — 27/10/2026

Após abertura sem dados pelo link e orientação de colagem do mesmo lote,
usuário confirmou sucesso. Leitura independente reconciliou
três compras/sete itens/sete movimentos/seis insumos com o plano aprovado:
quantidades, totais, datas, custo exato, cadastro único e quatro auditorias com
ator autenticado coerente. Sem duplicação observada; referências consumidas.
[Recibo sanitizado](../../evidence/pilot-receipt-purchase-acceptance-2026-10-27.json).

Fase de compras concluída; I05 permanece parcial para produção, venda e
aceite completo. Próxima fase exige fatos operacionais próprios, sem inventar
fornada/venda/pagamento ou repetir estas notas. Não alterar receitas por
inferência. RPO/RTO e demais gates anteriores não são encerrados por este ensaio.

## I05: alternativa autenticada pelo tablet — 27/10/2026

[Importação assistida](PURCHASE-BATCH-IMPORT.md) integrada pela PR #85 para executar
as compras aprovadas na sessão do usuário, sem depender do navegador do
computador. Conferência explícita, cadastro normal e transações individuais
com UUIDs estáveis. Preservar exclusões e leitura independente antes/depois.
Doze checks aprovados, CodeQL sem alertas e ensaio HTTP/UI/PostgreSQL 17
incluindo retomada sem duplicação. Publicada no piloto na versão `0cdcdb1d`,
100%, em 27/10 às 12:08 Brasília. Link do manifesto privado entregue ao
usuário; leitura posterior à publicação permanece sem compras/itens/movimentos.
A confirmação pela sessão do tablet e a conferência independente foram
concluídas no checkpoint acima. I05 permanece parcial.

## I05: dados aprovados, rotina validada e execução publicada pendente — 27/10/2026

Prévia de insumos das notas aprovada pelo usuário, com embalagens e exclusões
confirmadas. Três compras/sete linhas validadas localmente em PostgreSQL 17
descartável: quantidades/datas/custo exato e proteção contra repetição/conflito.
Após a validação local, faltava sessão autenticada na aba controlável;
a alternativa atual é o importador na sessão do tablet, publicado acima.
Não usar SQL para contornar RBAC nem atribuir ao agente a sessão
do usuário em outro dispositivo. Reconferir catálogo, duplicidades e saldos
antes de gravar pela aplicação. Cobertura Top Blend exige cadastro próprio;
não alterar receitas por inferência. Produção/venda/pagamento não autorizados
pela nota. [Evidência sanitizada](../../evidence/pilot-receipt-local-validation-2026-10-27.json).

## H01/I05: entrada recuperada e ensaio pendente — 27/10/2026

Entrada confirmada pelo usuário e por `login/success` às 01:01 Brasília;
identidade recuperada corresponde ao ator e contador zerado pelo fluxo normal.
Aceite pontual na versão `0814fb16`; causa das recusas anteriores inconclusiva.
Não repetir reset/configuração. Próxima etapa: ensaio manual de nota histórica
no piloto, conferindo duplicidade, data original, unidades e saldos. Não criar
fatos fictícios, repetir importação ou declarar I04 aprovado. H01/H02 mantêm
logout/revogação/replay/estabilidade como pendências.
[Recibo atualizado](../../evidence/pilot-login-code-publication-2026-10-27.json).

## Histórico da investigação H01/I05 — 26–27/10/2026

PR #82 integrada em `1d0218e` e publicada somente no piloto em `0814fb16`,
após renovação oficial de 100% em 27/10. 632 testes locais/build, 12 checks da
PR e três workflows da main aprovados; CodeQL real sem achados/alertas.
Tentativa privada concluída com sucesso, conforme aceite acima. Ensaio ainda
sem aceite. Não repetir reset como solução presumida.
[Recibo](../../evidence/pilot-login-code-publication-2026-10-27.json).

Persistência às 21:47 após reset e primeiro cooldown: novo HTTP 401 do Auth,
com senha digitada manualmente e identidade da recuperação conferida. Novo
cooldown até 22:02:18 Brasília. Preparar/publicar o código normalizado da
recusa em telemetria com lista fixa; correlacionar nova tentativa antes de
alterar configuração ou declarar o acesso recuperado.

Cadastro/vínculo ativo e destino Auth efetivo conferidos, sem alterar conta.
Diagnóstico seguro do status HTTP de login integrado na PR #80 (`8261f5e`) e
publicado somente no piloto em `62efd08b`, com CI/CodeQL aprovados.
Nova tentativa correlacionada: HTTP 401 do Auth, seguido de cooldown de 15
minutos após cinco falhas, até 21:36 Brasília. Recuperação pelo próprio usuário
concluída às 21:25; novas tentativas ainda barradas antes do provedor pelo
cooldown. Confirmar entrada após 21:37, com a nova senha, antes de declarar login
corrigido. A presença do widget não comprova Siteverify/replay.
[Investigação](PILOT-LOGIN-INVESTIGATION-2026-10-26.md).
O ensaio de notas históricas aguarda o acesso autenticado.

## Estado das cinco etapas após a publicação — 26/10/2026

1. Integrações #73/#76/#77/#78 concluídas; código do piloto `53e410e`, com CI, laboratórios e CodeQL da main aprovados.
2. S02/A04 integrados e publicados no piloto, com diretório restrito configurado. Validação real de concessão/sessão/reset continua pendente; nenhuma conta real foi concedida nesta entrega.
3. Publicação e smoke público concluídos; faixa e fluxos em 1280/375/320px, chave própria e prova A05 correlacionada. Auth/Turnstile/perfis/celular físico precisam de aceite da pessoa.
4. Proposta de recuperação e inventário preparados. RPO/RTO/retenção aguardam decisão; os demais gates de sustentação permanecem.
5. Ambiente e [roteiro das notas históricas](RECOVERY-PILOT-PROPOSAL-2026-10-26.md) disponíveis para o usuário. Ensaio I05 e produção I04 continuam sem aceite.

[Recibo da publicação](PILOT-PUBLICATION-2026-10-26.md). A configuração e a publicação do piloto não devem ser repetidas como tarefas pendentes.

## Configuração Auth e piloto — 26/10/2026

Usuário autorizou “Pode configurar”. #77 integrada em `c6ff2b6`; diretórios restritos configurados no HML/Auth e no piloto, duas cópias Neon e seis secrets próprios do novo Worker preparados. Originais preservadas. Testes finais, publicação e aceite real pendentes. [Recibo e próximos passos](PILOT-CONFIGURATION-2026-10-26.md).

## Execução das cinco etapas — 26/10/2026

1. **Integração concluída:** #73 → `233b3a4`, #76 → `4c8e8aa`. CI, laboratórios
   e CodeQL da main aprovados após cada merge. Não repetir os merges ou deploy
   da publicação anterior.
2. **Candidata validada em laboratório:** aprovação inicial de Funcionário por Dono/Gerente,
   consulta confiável, auditoria atômica, replay/concorrência e nova sessão.
   Autoria do reset usa consulta restrita ao provedor. Configuração do novo
   diretório ainda pendente; 12 checks da PR #77 em `e006d35` e três análises
   CodeQL aprovados, zero alertas. Reconferir HEAD final; [escopo e implantação](REGISTRATION-APPROVAL-2026-10-26.md).
3. **Homologação real pendente:** serviços Auth/Turnstile, revogação/perfis,
   celular/rede móvel e CSP. A05 tem captura do marcador sintético nos logs
   correlacionados: sem query/marcador armazenado. Laboratórios não substituem conta real.
4. **Proposta e inventário:** usuário decidiu avaliar RPO/RTO/retenção depois.
   Não mudar a agenda vigente por inferência. Seguem A01/A03/L02–L06.
5. **Roteiro do ensaio preparado:** usuário fará o teste manual com notas de
   compras reais de outros meses. Conferir duplicidade, data original e
   unidades no destino isolado a preparar; não repetir compras na fonte
   original. Demais fatos e I04 continuam pendentes de execução/aceite humano.

[Proposta de recuperação, inventário e roteiro do piloto](RECOVERY-PILOT-PROPOSAL-2026-10-26.md).

## Publicação HML concluída — 26/10/2026

PR #75 integrada em `82eebfc` e publicada por autorização específica. Três
workflows da main aprovados, CodeQL real sem resultados/erros/avisos e zero
alertas. HML `42da8a96`, 100% de tráfego; [recibo](HML-PUBLICATION-2026-10-26.md).

H06: botões separados e abertura de recuperação/primeiro acesso aprovados em
1280/375/320px no site publicado. A05/A10: configuração de redação e headers
publicados/conferidos; prova de logs por marcador e observação real da CSP
continuam. A07/A08: código e bindings publicados; validação de conexões e
Auth/Turnstile/replay reais ainda pendente. S02/A04 mantém implementação local
de aprovação/auditoria e identidade confiável na conclusão de reset.
Aceite físico/por perfil, A01/A03, L02–L06 e piloto permanecem. Não repetir este
deploy nem inferir produção ou integração de dependências dessa autorização.

## Ajuste de interface do login — H06, 26/10/2026

Pedido direto do usuário: ações “Esqueci a senha” e “Primeiro acesso” em
linhas distintas. Implementação local na PR #75, sem mudar serviços de Auth
ou concessões. Textos e seletores dos ensaios atualizados; 40 casos de navegador,
incluindo disposição móvel, e gates de qualidade/build isolado aprovados.
Publicação concluída no recibo acima; aceite funcional ampliado permanece.
Este ajuste não implementa a aprovação de cadastros de S02/A04.

## Próximo incremento S02/A04 — decisão de 26/10/2026

Após a integração da PR #74 em `9426316`, usuário definiu Dono com todas as
permissões e aprovação de cadastros validados por Gerente. Decisão registrada
na [matriz](AUTHORIZATION-MATRIX.md), em [SECURITY.md](SECURITY.md) e
[HUMAN-APPROVALS.md](HUMAN-APPROVALS.md).

Próximo trabalho de código: fluxo próprio de primeira liberação como
Funcionário, com validação confiável do destinatário, permissão específica
para aprovação, proteção contra autoaprovação/elevação e concessão/auditoria
na mesma transação. Não delegar `access:manage` ao Gerente. Implementação e
testes isolados autorizados; cadastro sem aprovação continua sem acesso.

Este incremento é documental: S02 não está entregue e A04 continua parcial,
inclusive na conclusão de reset com identidade confiável. Publicação/homologação
HML e decisões de infraestrutura mantêm seus escopos separados.

## Continuidade após corrigir a CI da PR #73 — 26/10/2026

Correção preparada para Playwright 1.64.1 e revisão da baseline Knip 6.42.1,
sem dispensar execução de testes nem aceitar novos achados. 616 testes locais,
lint, tipos, formato e Knip aprovados; confirmar build isolado e CI/CodeQL do
HEAD publicado antes da revisão das dependências.

Sequência restante:

1. Revisar a [PR #73](https://github.com/naiguelcabral/seus-brownies/pull/73)
   e o recibo da [PR #76](https://github.com/naiguelcabral/seus-brownies/pull/76)
   para integração. HML da PR #75 já publicado; correção da CI não exige deploy.
2. Implementar S02/A04 conforme o escopo acima e completar autoria confiável
   na conclusão do reset, com auditoria e testes negativos/concorrentes.
3. Validar Auth/Turnstile, conexões, replay, revogação/perfis e rede móvel no
   HML; completar prova de redação dos logs e observação da CSP.
4. Fechar A01/A03 e decisões L02–L06: credenciais/acessos, privilégio mínimo,
   separação de ambientes, monitoramento, backups/recuperação e retenção.
5. Concluir aceites funcionais por perfil, revisão de cobertura L07 e piloto
   I05; produção depende do aceite I04.

Integração dessas PRs, nova publicação e operações compartilhadas continuam
com seus gates próprios; esta tarefa autoriza a correção e validação da CI.

## Integração autorizada da PR #74 — 26/10/2026

Após a apresentação da PR #74 validada e da sequência restante, usuário
respondeu **“Pode seguir com a integração”**. Autoriza integrar somente esse
pacote concreto, preservando commits e proteção da main, após reconferir o
HEAD e todos os checks/resultados CodeQL. Não inclui deploy, SQL compartilhado,
secrets, DNS, concessões de acesso ou outras PRs.

O código revisado é b4ae5cb; a candidata documental 76fd7a5 teve todos os
12 checks aprovados e três análises CodeQL sem resultados/erros/avisos,
zero alertas abertos. Este fechamento altera só documentação/evidência.
A árvore de código/testes/configuração permanece a mesma. Resultado do merge,
SHA final e CI da main são conferidos no
[estado da PR #74](https://github.com/naiguelcabral/seus-brownies/pull/74).

A59 done identifica o pacote de código entregue e validado, não publicação
nem encerramento integral de A04/A07/A08. Restam autoria de concessões futuras/
bootstrap e conclusão de reset com identidade confiável, prova HML com serviços
reais/rede móvel, A01/A03 e decisões L02–L06. A configuração versionada não é
recibo de configuração remota aplicada. Registros de preparação abaixo são
históricos; sua restrição de merge antecede esta autorização específica.

## Continuidade A04/A07/A08 — candidata local de 26/10/2026

Após a PR #72 integrada em `f2a7fc7`, usuário autorizou seguir as próximas
fases. Pacote local em `codex/auth-hardening-next-20261025`, código `b4ae5cb`:
contexto/pool por Server Function com fechamento aguardado; correlação HMAC
sem ator presumido; orçamento anterior ao banco por origem/localidade e
Turnstile com hostname/ação exatos. Preserva Drizzle/pg/Neon, RBAC, regras,
custos, idempotência e histórico. Configuração remota não foi aplicada.

614 testes Node, typecheck/lint/formato/Knip, build isolado e 12 cenários
HTTP/UI/PostgreSQL 17 aprovados. Probes confirmam teto de conexões, timeouts
transacionais, rollback e zero conexões da operação após o laboratório.
A fábrica real de conexão também é usada no laboratório. Container encerrado.
CI, CodeQL e resultado da revisão são conferidos por SHA no estado da nova PR.

A04 continua parcial: concessões/bootstrap futuros e identidade confiável na
conclusão do reset. A07/A08 têm implementação e evidência local; prova HML com
Workers/Neon/Turnstile reais e rede móvel continua pendente. Orçamentos do binding
são aproximados por localidade, não um teto mundial estrito. Política de dados,
recuperação, privilégio mínimo e demais gates externos permanecem.

[Desenho, limites e riscos](AUTH-CONNECTION-HARDENING-2026-10-26.md).
[Recibo por escopo e SHA](../../evidence/auth-connection-hardening-2026-10-26.json).
Sem merge desta candidata, deploy, SQL compartilhado, migrations, secrets,
DNS ou concessões de acesso nesta rodada. Registros anteriores são históricos.

## Entrega e integração autorizada — PR #72

Usuário autorizou a continuidade após a apresentação do pacote validado.
Esta entrega reúne A02, parte de A04/A08, A09/A10 e as preparações
L01/L07/L08/L09 na [PR #72](https://github.com/naiguelcabral/seus-brownies/pull/72).
Código operacional revisado: `cc44af7`, com todos os checks concluídos e
três análises CodeQL sem resultados/erros/avisos, zero alertas abertos.
O fechamento desta autorização altera somente documentação/evidência.

A58 refere-se ao pacote de código entregue e validado; não encerra publicação,
recuperação, privilégio mínimo nem aceites reais. A02 tem os limites na entrega;
A04 mantém correlação de tentativas/reset e autoria de concessões/bootstrap;
A07 mantém lifecycle de conexões; A08 mantém origem/agregado e hostname/action.
A05/A10 ainda exigem publicação HML e prova/observação no ambiente real.
L07 conserva revisão das lacunas e baseline justificada.

O resultado final da integração e o CI da main são lidos no estado da PR;
o recibo versionado preserva os SHAs realmente testados e não inventa o SHA
do próprio merge. Nenhum deploy, SQL compartilhado ou secret nesta entrega.
Os registros de preparação abaixo são históricos.

## Pacote local de pré-publicação — candidata de 25/10/2026

Base integrada `53d6379`; #61 → #63 → #62 → #64 → #65 concluídas com
CI/CodeQL aprovados. Usuário autorizou reunir os ajustes pequenos anteriores
à publicação em **uma única PR**. Esta candidata implementa A02 (limites),
parte de A04/A08, A09/A10 e preparações L01/L07/L08/L09. Isso não conclui
publicação, política de dados/recuperação nem aceite operacional.

- Entradas: 1 MiB por corpo, contando bytes inclusive sem Content-Length;
  até 100 itens de compra/venda e saídas/perdas de produção; strings numéricas
  até 32 caracteres antes da aritmética. Orçamentos técnicos reversíveis,
  acima do catálogo atual; nenhum truncamento ou gravação parcial no excesso.
- Auth: ator/alvo de identidade somente do resultado bem-sucedido do provedor;
  logout usa ator da sessão validada, sem chamar o ID do usuário de ID da
  sessão. Histórico permanece intacto. Timeout Turnstile de 10 s.
- Relatórios: origens produção/compra/ajuste/ausência explícita no detalhe
  FIFO e CSV; frações exatas preservadas. Totais arredondam depois da soma;
  parcelas exibidas podem divergir um centavo por arredondamento independente.
- HTTP: no-store, no-referrer, DENY, nosniff, Permissions-Policy e HSTS
  somente HTTPS; CSP **report-only**, incluindo Turnstile, sem coletor remoto
  novo. Imports de servidor ficam nos callbacks de middleware.
- Preparação: binding/flag/secrets obrigatórios/redação no arquivo do Worker
  principal, namespace distinto do HML; nenhuma alteração remota. Callback,
  secrets e publicação reais de produção continuam pendentes de revisão.
- Qualidade: cobertura nativa Node com LCOV e inventário explícito das fontes
  não medidas na CI; contrato de identidade/cookie do SDK instalado; proposta
  da regra de worktree própria em AGENTS.md, sujeita à revisão desta PR.

Validação local: **601 testes Node**, build isolado e dois smokes HTTP
(headers/hidratação/413) no código desta candidata; **12 conectados
PostgreSQL 17 e 40 fixtures** em `4907b24`. Depois desse checkpoint,
apenas o curto-circuito da validação numérica excessiva e a trava localhost
da sonda HTTP mudaram; a CI repete negócio/browser no SHA publicado.
Lint/tipos/formato/Knip aprovados e audit zero.
Cobertura mede 98 de 151 arquivos, com 53 não medidos
explicitamente listados; 85,83% das linhas **medidas**, sem limiar arbitrário
ou equivalência com cobertura de navegador/PostgreSQL. Lacunas e baseline
justificada seguem L07. [Recibo](../../evidence/prepublication-small-fixes-2026-10-25.json).

Continuam A07 (lifecycle exige trabalho próprio), partes restantes de A04/A08,
A01/A03/L02–L06 e os aceites publicados. Nenhum deploy, SQL compartilhado,
migration ou mudança de secrets/RBAC autorizados. A integração deste pacote foi autorizada na continuidade registrada acima.

Atualizado em **25/10/2026**, após a autorização do Dono e a integração
sequencial das correções: **#61 → #63 → #62 → #64**. Código operacional
integrado em `79634e6`; a entrega documental **#65** consolida o fechamento
desta sequência. O SHA final dessa entrega é conferido no
[estado da PR #65](https://github.com/naiguelcabral/seus-brownies/pull/65).
Último checkpoint HML continua `997f47bb`; nenhum deploy nesta integração.
Não há novo recibo de publicação da correção de datas ou deste lote no HML.
Este é o **único arquivo de planejamento e acompanhamento de pendências**.
Relatórios datados, recibos, matrizes e runbooks preservam evidências e
procedimentos; suas listas antigas não são filas adicionais de execução.

A consolidação substitui os checkpoints repetidos deste arquivo. Seu histórico
completo permanece no Git. Não autoriza executar itens pendentes, mudar regras,
conceder acessos, aplicar migrations ou publicar em produção.

Reparo de 22/10: consultas Neon e vínculos dos quatro acessos conferidos;
`DATABASE_URL` restaurado como secret e endpoint Auth reconstruído da branch
de identidades. Sessão inválida passou de500 para200, raiz307/login200 e
25 testes Node aprovados no reparo. Em 23/10, usuário confirmou nova entrada
da Gerente e abertura normal do painel; 32 testes direcionados e smoke público
passaram no seguimento, sem nova alteração de schema, fonte ou configuração.
H01–H03 continuam parciais para os demais casos; detalhes em
[recuperação Neon/Auth](NEON-AUTH-RECOVERY-2026-10-22.md).

## Prioridade de retomada

O núcleo operacional já está integrado à `main`: compra → estoque → produção
→ venda → recebimento/entrega → lucro foi comprovado com interface, HTTP e
PostgreSQL 17 isolados. A identidade desse laboratório é sintética; o aceite
do Neon Auth/Turnstile reais e dos perfis no ambiente publicado continua
separado. Primeiro acesso e ordenação da razão de Relatórios já foram
corrigidos e publicados no HML. Não refazer esses incrementos.

Priorizar a comprovação de revogação A01, os limites restantes de A02 e
a confirmação publicada de A05; seguir recuperação A03/I02/I03, autoria
A04 e conexões A07. A06 e a correção do grafo de dependências estão integrados. Preparação local
independente pode avançar enquanto decisões externas permanecem pendentes.
Seguem homologação real H01–H03, antiabuso A08, FIFO A09, cabeçalhos A10 e
uso diário H06; só então piloto I05 e aceite I04. WhatsApp/OCR e extrações
maiores vêm depois. A PR #55 já está integrada; não reapresentar seu merge.

## Sequência executável — 25/10/2026

| Etapa | Escopo | Responsável e resultado para avançar |
| --- | --- | --- |
| 1. Integração do lote revisado | **#61 → #63 → #62 → #64**, integradas; fechamento documental na **#65**. Guard Drizzle, destinos por hash, higiene/CI, Zod/logs/headers e documentação. | Autorização do Dono recebida e aplicada. Branches atualizadas e checks/CodeQL reconferidos entre os merges; código operacional em 79634e6. Drizzle Kit em devDependencies e lockfile preservado. Os gates de publicação e aceite real continuam separados. |
| 2. Completar segurança e disponibilidade | A02 (corpo/cardinalidade), A04 (ator Auth), A07 (conexões), A08 (antiabuso), A09 (origem FIFO), A10 (headers globais); L01/L08. | Agente pode preparar mudanças pequenas, testes negativos e PRs separados. Preservar regras financeiras, precisão, RBAC, sessão e fail-closed. Limites da aplicação preparados na candidata de pré-publicação; o teste antigo do Zod sozinho não encerrava A02. L01 prepara produção, sem publicar. |
| 3. Fechar sustentação e dados | A01/A03, T02/G02/I01/I02/I03 e L02–L06: evidência de credencial, recuperação/Auth, frequência/fuso, ambientes, privilégio mínimo, observabilidade e dados pessoais. | Agente prepara inventários/planos e ensaios isolados. Dono decide RPO/RTO, retenção, responsáveis, ambientes e política de dados; autoriza cada mudança remota aplicável. Não repetir restore/importação/recibos já consumidos. Preparação independente pode avançar junto da etapa 2. |
| 4. Aceitar operação | H01–H03/H06, L07, I05 → I04: provedor/desafio reais, permissões, celular, medição da cobertura, piloto e aceite de produção. | Operadora/Dono executam os roteiros reais com fatos expressamente autorizados; agente registra evidência e corrige falhas. CI/laboratório sintético não encerram esses aceites. Publicação HML deve ter recibo SHA/build/Worker/configuração e confirmação de redação por marcador sintético. |
| Após estabilidade | A12/S04 e R01/R02; demais evoluções condicionais. | Revisar permissões dos conectores e extrações graduais; WhatsApp/OCR somente após os gates do núcleo. Não ampliar autonomia nem delegar automaticamente. |

**L09 é transversal e imediato:** esta rodada trabalha em worktree própria;
a pasta principal permaneceu na branch anterior. A formalização em AGENTS.md
continua proposta para revisão, sem alteração automática das regras.

**Estado da etapa 1:** código integrado em `79634e6`, semanticamente
idêntico ao ensaio `0bfc9b8` fora de documentação/evidências. Todos os checks
das quatro PRs atualizadas passaram; três análises CodeQL sem resultados,
erros ou avisos e zero alertas abertos em cada referência de merge. Auditoria
nova: zero vulnerabilidades. Lockfile não precisou ser regenerado.
[Recibo da sequência](../../evidence/pr-sequential-integration-2026-10-25.json).
O CI final da main e o estado documental #65 são conferidos antes do
encerramento; o recibo preserva o estado observado durante sua preparação.

## Remediação da revisão de 23/10/2026

Os identificadores A01–A12 abaixo correspondem aos achados do relatório
datado; esta tabela é sua fila canônica. Critérios não comprovados continuam
pendentes. Responsável técnico: agente nas mudanças locais e testes;
Dono/administrador nas decisões e operações externas sujeitas a gate.

| Ordem / achado | Estado | Entrega e critério de aceite | Gate / dependência |
| --- | --- | --- | --- |
| Imediato — A01 | Comprovação técnica parcial em 23/10 | Relato de coleta incorporado por #65/9a4b276: hash da credencial de `48b101d` comparado, sem exibir valores, com a senha atual do `neondb_owner` em cada branch: `production`, `g1-auth-hml` e `Development` divergem; as três branches de backup não têm endpoint e não aceitam conexão; o projeto arquivado `cool-base` foi apagado. Falta revisar acessos do período 17–22/10: `pg_stat_statements` está desligado e a CLI não expõe conexões; no Auth, 21 sessões vieram de dois IPs. Falta recibo sanitizado que permita revisar método, UTC e abrangência dessa coleta; ela não foi repetida nesta rodada. Eventuais cópias locais de credenciais ficam sob responsabilidade privada do operador, sem leitura ou exclusão pelo agente. | Dono pede logs de conexão ao suporte Neon, se necessário. Reescrita do histórico é decisão separada. Não testar nem reproduzir o valor antigo. |
| 1 — A02 / S03 | Dependências integradas; limites entregues na PR #72 | Corpo de até 1 MiB, até 100 itens/saídas/perdas e strings numéricas até 32 caracteres; schemas usados pelos handlers e testes de fronteira, excesso e idempotência. 601 testes Node e laboratório conectado aprovados. | Integração autorizada conforme PR #72; publicação/aceite HML pendentes. Não refazer a atualização Zod/Undici. |
| 1 — A05 | Publicado e comprovado no caminho Auth | Prova HML histórica preservada. No piloto `d4138431`, GET sintético de 26/10 21:47 UTC foi correlacionado por Ray ID/versão: evento sem query ou prefixo do marcador, HTTP200/no-store/no-referrer. [Recibo](PILOT-PUBLICATION-2026-10-26.md). | Não extrapolar a prova para todos os logs ou aceite de Auth/OTP reais; nenhum token real consultado. |
| 1 — A06 / T02 | Concluído na main | #61 integrada em 1536920; db:generate e db:push bloqueados offline, sem conexão ou SQL. Preparação/revisão auditável, cadeia e recibos preservados. | T02 permanece parcial para planos por alvo; não reaplicar migrations ou usar o guard como controle de acesso administrativo. |
| 2 — A03 / I02 / I03 | Divergência documentada; política pendente | Revisão observou histórico Neon de seis horas, branches sem proteção e automação semanal quinta 00:15, divergindo do diário 03h documentado. Reconfirmar fuso/configuração; acordar RPO/RTO, retenção, responsáveis e Auth; comprovar sequência de uploads, restore externo e alerta de falha. | Restore de 21/10 permanece válido historicamente. Mudança de frequência/infraestrutura/proteção exige decisão aplicável; não apagar backups. |
| 2 — A04 / S01 | Integrado e publicado no piloto; aceite real parcial | #77 acrescenta autoria confiável de concessões e da conclusão de reset; diretório configurado, concessão/auditoria atômica e sessão posterior à mudança. #78 e publicação `d4138431` entregam ambiente próprio. | Validar serviços reais/perfis; sem backfill de autoria histórica nem nova concessão real nesta entrega. |
| 2 — A07 | Implementação local em revisão | Candidata b4ae5cb: pool preguiçoso por Server Function, max 2, conexão 5 s, consulta cliente 20 s, limites transacionais SET LOCAL 15 s e fechamento aguardado. Unitários e PostgreSQL 17 comprovam isolamento, rollback e ausência de conexões após HTTP/UI. | Preservar stack; mudança arquitetural requer ADR/decisão. Não atribuir os 429 a pools sem evidência. |
| 3 — A08 / H01 / H02 | PR #72 integrada; candidata amplia proteção | Siteverify aborta após 10 s; regressão do abort e fail-closed preservado. Limites de payload em A02. | Candidata b4ae5cb prepara orçamento antes do banco por origem confiável/localidade e hostname/action exatos. Bindings têm contagem aproximada por localidade, não quota mundial estrita; prova HML/provedor/desafio/rede móvel e configuração aplicada permanecem pendentes. Preservar cinco falhas e não atribuir 429 a pools sem prova. |
| 3 — A09 / F03 | Correção entregue na PR #72 | Novo detalhe por origem FIFO e CSV incluem produção, compra, ajuste e ausência explícita; custos/reversões racionais e totais preservados. 601 testes e laboratório conectado aprovados. | Integração autorizada conforme PR #72; confirmação publicada pendente. Patch antigo não foi mesclado. Sem mudar custos/fatos. |
| 3 — A10 / H06 | Middleware entregue na PR #72; confirmação HML pendente | Headers globais, HSTS somente HTTPS e CSP report-only compatível com Turnstile; cookies/status/body preservados, imports server-only nos callbacks. Smoke HTTP local aprovado. | Publicação HML, observação da CSP/hidratação por perfil e celular físico pendentes. CSP ainda não é política de bloqueio nem há coletor remoto novo. |
| Transversal — A11 / G01 / T01 | Correções integradas; registro documental #65 | #61/#63/#62/#64 integradas sequencialmente; #65 preserva revisão, recibos Neon/Auth e este fechamento. Código operacional 79634e6; evidência da integração e critérios do roadmap reconciliados. | A publicação HML ainda precisa ligar SHA, build, Worker e configuração. Nenhum deploy nesta rodada. |
| Posterior — A12 / S04 / R07 | Pendente / condicional | Revisar escopo mínimo de conectores; avaliar fd62de7; classificar branches antes de arquivar. Extrações graduais e compatibility date somente após segurança/aceite. | Não alterar permissões, excluir branches nem delegar automaticamente. |

### Lacunas complementares de 23/10/2026

Levantamento posterior à revisão, com evidência no código e nos provedores.
Itens já cobertos por A01–A12 foram anotados nas linhas correspondentes acima;
os IDs abaixo cobrem apenas o que não tinha fila própria.

| ID | Prioridade | Lacuna e evidência | Solução e critério de aceite | Gate / dependência |
| --- | --- | --- | --- | --- |
| L01 | Antes de I04 | Configuração do Worker de produção incompleta: o topo de `wrangler.jsonc` não tem binding `AUTH_RATE_LIMITER`, `AUTH_RATE_LIMITER_REQUIRED`, lista de secrets nem redação de logs. Sem a flag, `auth-rate-limit.server.ts:96` usa só o limitador local do isolate, sem aviso. | Paridade preparada no arquivo versionado e no teste estrutural: flag/binding, nomes de secrets e redação; namespace distinto. Revisar callback, bindings/secrets reais e configuração antes de publicar. | Implementação local; secrets/deploy de produção exigem autorização. |
| L02 | Antes do piloto | O levantamento complementar relata uso de neondb_owner; a revisão anterior não comprovou a role efetiva do Worker. Confirmar por identidade da sessão em probe autorizado e sanitizado; o guard npm (A06) só evita acidente. | Papel de aplicação sem DDL nem propriedade, com privilégios mínimos por tabela; plano, ensaio isolado e troca do `DATABASE_URL` registrada. | SQL compartilhado e secret exigem autorização específica. |
| L03 | Antes do piloto | Levantamento relata pg_stat_statements desligado e ausência de allowlist/proteção de branches. Estatísticas agregadas não substituem logs de conexão nem trilha auditável por evento; a revisão de acessos de A01 continua separada. | Decidir observabilidade de consultas, logs de conexão, proteção de branches e allowlist após verificar suporte, custo e recuperação. Se adotar pg_stat_statements, documentar seus limites e não apresentá-lo como auditoria completa. Registrar revisão periódica. | Extensão/plano Neon exigem decisão do Dono. |
| L04 | Separação do piloto entregue; produção pendente | Piloto usa cópias operacionais/Auth próprias, com histórico e identidades do instante de criação; são cópias autorizadas de teste, sem alegação de anonimização. HML anterior conserva a associação com a original. | Separar HML/produção antes de I04 e manter ambiente de desenvolvimento com schema atual e dados sanitizados; revisar destinos e política em ENVIRONMENT-MATRIX. | Nova cópia, sanitização, configuração ou alteração de produção exigem escopo próprio; preservar fatos e identidades existentes. |
| L05 | Antes do piloto | O levantamento relata traces/Issues desligados e monitor restrito a GETs públicos. Uma resposta HTTP 200 pode carregar erro de aplicação; confirmar quais falhas os logs e alertas atuais já capturam antes de ampliar a instrumentação. | Ativar Issues/alertas, endpoint de saúde protegido que teste banco e Auth, registro estruturado de falhas sem dados pessoais e alerta independente do computador local (complementa I03). | Configuração do Worker conforme gate; segredos do endpoint pelo Dono. |
| L06 | Antes do piloto com clientes reais | Dados pessoais sem política: `sales.customer_name`, `sales.customer_phone` e, no futuro WhatsApp, `sender_phone`. RBAC e matriz de autorização já existem; não foi localizada política específica de minimização, retenção e tratamento dos dados nos documentos revisados. Validar requisitos aplicáveis com o responsável, sem declarar uma infração por ausência de documento. | Inventário de dados pessoais, prazo de retenção, anonimização auditada, mínimo necessário em CSV e logs, e registro LGPD aprovado. | Política e prazos são decisão do Dono; anonimização segue lifecycle auditável. |
| L07 | Antes de I04 | Medição preparada nesta candidata: LCOV Node, resumo e 53 fontes não medidas explicitamente listadas; não inclui execução de navegador/banco. | Conferir o artefato Node da CI e revisar lacunas de dinheiro, estoque, FIFO e Auth; definir baseline e limites justificados após a medição, sem confundir percentual com correção nem enfraquecer testes. | Implementação local e CI. |
| L08 | Contínuo | SDK de autenticação em beta: `@neondatabase/neon-js` 0.8.0-beta, que fixa Zod antigo (contido pelo override da #64). | Acompanhar versões, testes de contrato do adapter e plano de contingência documentado. | Atualizações compatíveis do SDK exigem revisão/testes Auth; troca da estratégia de autenticação exige ADR e aprovação. |
| L09 | Imediato | Duas sessões de agente usaram a mesma pasta de trabalho: a pasta principal ficou na branch desta remediação enquanto outra sessão preparava PRs. | Regra em AGENTS.md na PR #72: worktree própria e nenhuma troca de branch da pasta principal. Integração autorizada pelo Dono. | Mudança de `AGENTS.md` exige revisão humana. |

A autorização humana para esta integração foi recebida e aplicada na ordem
acima. **Próximo trabalho após esta integração: completar A04/A07/A08**,
em incrementos pequenos com testes, conforme a etapa 2. Publicação e prova
de redação de logs em HML continuam com gate próprio. Não refazer as quatro
correções integradas, os recibos de recuperação ou importações históricas.
[Handoff](AUTONOMY-HANDOFF.md).

PRs #44–#53 mescladas, incluindo tipagem de Cenários/finanças/lifecycle,
patch launch-editor 2.14.2, ordem do menu do Funcionário e coleta do aceite.
Código `91658ed` aprovado com 570 testes Node, 12 casos conectados isolados,
tipos/lint/formato/Knip/build e CI/CodeQL. Publicação conjunta HML concluída
às 15:17 Brasília, versão `de9a88e6` em 100%; sem SQL compartilhado ou produção.
[Recibo](JOINT-HML-PUBLICATION-2026-10-21.md).

Usuário confirmou no tablet os papéis employee/manager/owner e as rotas/GETs
de Dashboard/Parâmetros conforme a matriz. Após deploy, Cenários e Financeiro
abriram como Dono. A repetição automática de permissões usou identidades
sintéticas em PostgreSQL 17 isolado; não equivale a sessões reais no HML.
A ordem Vendas → Produtos → Compras → Categorias do Funcionário foi publicada.
H03 permanece parcial para cobertura ampliada; H01/H02 conservam a
investigação do 429, inclusive uma ocorrência na nova versão. H06 segue parcial.
[Registro manual](AUTH-HML-PERMISSIONS-MANUAL-2026-10-21.md).

## Estimativa de planejamento — análise do Work de 21/10/2026

Referência: conversa **“Análise do repositório”**, confrontada com a `main`
`b82e044`. Estimativas ponderadas por implementação, integração e validação;
não medem cobertura de testes nem constituem aceite operacional.

| Escopo | Conclusão estimada | Esforço restante a partir deste checkpoint |
| --- | --- | --- |
| Sistema interno da fabriqueta | Cerca de 85% (faixa de 80–90%) | 60–100 horas |
| Sistema interno + WhatsApp/assistente + OCR | Cerca de 65% (faixa de 60–70%) | 180–300 horas no total, incluindo o núcleo |

| Pacote restante | IDs | Estimativa |
| --- | --- | --- |
| Documentação e proteções de integração | G01/G03/S03 | 4–8 h |
| Autenticação real e aceite de permissões | H01–H03 | 12–20 h |
| Ambientes e procedimento de migrations | T02/G02/I01 | 8–16 h |
| Restauração externa, recuperação e monitoramento | I02/I03 | 12–20 h |
| Uso diário, celular e correções encontradas | H06 | 12–20 h |
| Piloto, preparação da versão e aceite operacional | I05/I04 | 12–16 h |
| **Total do sistema interno** | | **60–100 h** |
| WhatsApp e assistente operacional | R01 | +60–100 h |
| OCR com conferência antes de gravar | R02 | +40–70 h |
| Estabilização integrada de conversa/documentos | R01/R02 | +20–30 h |
| **Total com WhatsApp e OCR** | | **180–300 h** |

Premissas: uma pessoa com apoio do agente, escopo estável, acessos disponíveis
e decisões sem grandes atrasos. São horas de trabalho acompanhado, não tempo
do agente ligado. Não incluem esperas externas, SaaS, pagamentos ampliados
ou XLSX. Rever as faixas após os aceites; esta atualização documental não
reduz automaticamente o esforço estimado nem autoriza novas ações externas.

## Estado confirmado

| Área | Situação atual |
| --- | --- |
| HML | Publicação de aplicação anterior `91658ed`; versão atual de configuração `997f47bb-6be0-4a78-b1fe-f46ea1fef512`, 100%. Conexão/Auth reparados em 22/10: raiz307/login200, sessão inválida500→200. Em 23/10, usuário confirmou entrada real da Gerente e abertura normal do painel; demais aceites H01–H03 continuam parciais. [Reparo e aceite](NEON-AUTH-RECOVERY-2026-10-22.md). |
| Trabalho versionado | #61 → #63 → #62 → #64 integradas; código operacional da main 79634e6. Esta entrega documental #65 consolida revisão, recuperação, roadmap e recibo da sequência. Integração não é publicação HML nem aceite de produção. |
| Banco usado no HML | Atualizações específicas até `0033`, 36 recibos. A original conserva classificação `production`; seu uso histórico autorizado não a torna laboratório. Migrador genérico continua bloqueante. |
| Catálogo e produção | 38 produtos; duas versões de receita e 34 perfis contando os históricos; receita 2 ativa com 17 perfis completos e 31 componentes |
| Cenários | Cenário 2/v2/rev2 ativo, 16 produtos orientativos em 100%; cenário 1 e seu histórico preservados |
| Meta | R$ 10.000 de lucro mensal após os custos de **todas as vendas**, inclusive Bordinhas realizadas; sem cotas obrigatórias por produto |
| Operação real | Sem compras ou produção previstas; nenhum fato fictício criado no HML para testar as entregas |
| Última validação histórica de código | Revisão de 23/10: 574 testes no HEAD local 3af1af5 e 16 direcionados em snapshot de origin/main; lint/tipos/formato/Knip/build isolado aprovados no HEAD local. Runs da main bb122d8 aprovados conforme relatório, sem contagem extraída. Não repetir nem atribuir esses resultados ao merge local 7480257 sem execução. |
| Segurança | #55, launch-editor 2.14.2, hashes de destinos e grafo Zod/Undici integrados. Auditoria nova do conjunto em 25/10: zero vulnerabilidades; três análises CodeQL sem resultados/erros/avisos em cada candidata atualizada. A01 e os controles restantes continuam no roadmap; não extrapolar esse resultado para o HML ainda não publicado. |
| Proteção de integração | `main.protected:true`; ruleset ativa `main-production-integration` (ID 25611109), sem bypass. Exige PR atualizado, conversas resolvidas, sete checks e CodeQL com bloqueio de segurança alta/crítica. Ver G03. |
| Recuperação e alertas | Restore externo de 21/10 comprovado: 38 tabelas/36 recibos exatos. Auth excluído. Revisão de 23/10 observou backup semanal quinta 00:15, divergente do diário 03h planejado, e histórico Neon de seis horas. Reconfirmar fuso, rotina, retenção/responsáveis/RPO/RTO/Auth em A03; continuidade não atestada. |
| Preservação | 21 tabelas tiveram contagens/digests idênticos no checkpoint anterior. A publicação de 21/10 não executou SQL/migrations ou salvou operações; não coletou novo digest operacional. |

Legenda: **concluído** significa que o resultado descrito foi comprovado;
**parcial** distingue implementação de homologação; **pendente** exige trabalho;
**condicional** depende de necessidade ou decisão. Nenhum estado implica
liberação definitiva de produção.

## Entregas concluídas

- [x] **Governança e ferramentas:** arquitetura/regras/segurança/DoD, workflow
  Git, TypeScript 7/Oxlint/Oxfmt, Knip e CodeQL integrados à `main`. A
  ruleset G03 está ativa e a configuração CodeQL legada foi reconciliada; o
  hardening versionado do workflow foi integrado pela PR #55.
- [x] **Acesso HML implementado:** Neon Auth, sessão SSR, guards e RBAC no
  servidor, recuperação auditada, Turnstile e limiter distribuído publicados.
  Vínculos Dono/Gerente auditados; recuperação e sessão do Dono confirmadas.
  A matriz completa e os casos antiabuso ainda exigem homologação H01–H03.
- [x] **Recuperação e schema do HML:** destino Worker/banco atestado, restore
  e atualizações específicas ensaiados/aplicados com preservação de dados e
  recibos. Diagnósticos temporários desativados. Não repetir esses reparos.
- [x] **Workbook e cadastros:** leitura das 15 abas, produtos/insumos, ovos,
  receita versionada, perfis, recheios, embalagens, adesivos e cobertura
  reconciliados e aplicados sob referências auditáveis.
- [x] **C01 — custos exatos e compras em kg:** valor total pago preservado,
  conversão kg → g e custos derivados fracionários, com conservação nas
  entradas/consumos/saldos e ensaios em PostgreSQL 17. Não está pendente
  decidir novamente a precisão ou refazer a importação.
- [x] **Produção:** rascunho/conclusão, consumo físico, custos reais por lote,
  rateio exato, camadas FIFO, recuperação variável de Bordinhas, perdas com
  motivo, preservação de versões e proteção contra conclusão duplicada.
- [x] **Custos e premissas confirmados:** oito ovos/850 g frios por receita;
  rendimentos 48 simples/24 recheados no 5×5 ou 24/12 no 7×7; Bordinhas de
  100 g/R$ 6 com saquinho de R$ 0,11 e adesivo; bombom com cerca de 50 g de
  cobertura; kit de quatro sem embalagens internas e com um adesivo externo.
- [x] **Orçamento e taxas:** fixos de R$ 2.288, incluindo MEI de R$ 88,
  energia e R$ 600 de mão de obra (quatro diárias de R$ 150). Débito 1,43%,
  crédito 3,36%, Pix R$ 0,49 por pagamento; sem média presumida por local.
- [x] **Recebimentos e lucro conjunto:** bruto/taxa/líquido preservados,
  despesas classificadas, lucro após CMV/taxas/despesas e progresso da meta
  em Financeiro/Visão geral, sem descontar orçamento ou custos produtivos
  novamente. Ausências relevantes deixam o resultado indisponível.
- [x] **Metas e cenários:** versões auditadas, mix normalizado em 100%,
  ativação do cenário revisado e preservação do anterior; resumo conjunto,
  detalhes expansíveis, editor modal com prévia e confirmações com motivo.
- [x] **Dashboard e usabilidade:** painel estruturado, atalhos, reposição,
  navegação reorganizada e modais de Produtos, Categorias, Locais, Compras,
  Produção, Vendas e Despesas; filtros, paginação e estados explícitos.
- [x] **Revisão de Compras/Produção:** total da compra sem multiplicar a
  quantidade novamente, unidades legíveis, opcionais agrupados, prévia
  invalidada após alterações, custos limpos após salvar, auditoria em modal
  e sucesso de gravação separado de falhas de atualização visual.
- [x] **Relatórios e diagnósticos:** receita/volume/ticket, ranking por
  unidades, margens e CSV seguro; razão/FIFO/reversões, cobertura de entrega e
  conferência integrada de estoque, produção e CMV. Os diagnósticos só leem os
  fatos e preservam ausências como ausências. Indicadores/alertas adicionais
  permanecem em F03.
- [x] **Ensaios locais:** custos, produção/FIFO e recebimentos/lucro em
  PostgreSQL 17 descartável; rollback/replay dos pacotes específicos;
  ensaios de navegador e conferências autenticadas sem fatos fictícios no HML.
  Esses ensaios não substituem o aceite integrado por todos os perfis.

## F02 — conferência de integridade consolidada

**Estado: concluído e validado no HML em 19/10/2026.** A conferência única
cobre estoque, produção e CMV por competência, preservando as três famílias de
diagnóstico existentes e acrescentando a visão integrada.

- [x] Cobertura inventariada entre estoque de insumos, custos produtivos,
  saídas/camadas/reversões FIFO e CMV por competência.
- [x] Resultado unificado com origem e referência rastreáveis, sem correção
  automática.
- [x] Ensaios isolados de coerência, custo ausente, cobertura parcial,
  reversão excessiva, referência de venda ausente e custo racional exato.
- [x] Critérios e evidências registrados; ausência permanece explícita, sem
  custo zero ou saldo fictício no HML.

**Aceite técnico:** divergências identificáveis e explicáveis; nenhuma
alteração financeira, de estoque ou de histórico pela rotina. O commit
`a3ec96b` foi publicado somente no `cacau-v1-hml`, versão
`0f95738a-356b-4662-ad76-f03220c5f066`. A conferência autenticada confirmou a
seção integrada, as contagens zeradas coerentes com a ausência de fatos reais,
a meta conjunta de R$ 10.000 e a ausência de erros no navegador. Nenhum fato
sintético foi gravado no HML.

## Pendências para fechar a validação técnica

| ID | Estado | Resultado que falta |
| --- | --- | --- |
| S01 | Concluído | Inventário cobriu catálogo, locais, parâmetros gerenciais, planos, cenários, operações, produção, finanças e lifecycle de estoque. As seis mutações de catálogo e criação/conclusão de lote, lacunas encontradas, agora gravam ator e evento operacional na mesma transação; falha da auditoria reverte a escrita. Autenticação mantém trilha própria; diagnóstico e prévia de produção são POST somente leitura. Contrato automatizado impede regressão. |
| T02 / #36 | Parcial; issue encerrada no GitHub | Preparação/revisão offline integradas via `db:prepare` e `db:review`, com oito referências de catálogo PostgreSQL 17 e treze ensaios de instalação, upgrades, preservação, replay, drift, rollback e geração futura; 38 tabelas conferidas. Falta classificar independentemente os alvos relevantes e definir plano/autorização específicos para futuras aplicações compartilhadas. A aplicação específica até `0033` já tem 36 recibos; não reaplicar. Detalhes em `MIGRATION-CHAIN-REMEDIATION-ADR.md`. Nenhum comando novo executa SQL; `db:migrate` permanece bloqueante e `db:push` não é atalho. |
| T03 | Concluído no escopo isolado | Workflow aprovado na `main` `b82e044`: dois runners PostgreSQL 17, 39 casos de fixtures UI e dez conectados. A correção de ordenação da razão está publicada no HML. Aceites reais H01–H03/H06 continuam separados; a causa upstream do incidente histórico de sessão permanece inconclusiva. |
| H04 / H05 | Concluído no laboratório isolado; aceite real separado | Dez casos conectados aprovados: compra em kg → consumo em g → produção → venda → recebimento/entrega → lucro; cancelamento, devolução, crédito/resgate parcial, reembolso e fechamento/correção. Backend/banco, transações, rollback e falhas cobertos também pelos runners. Interface/HTTP reais com identidade sintética; não substitui H01–H03 nem o piloto I05. Não gravar fatos sintéticos na base compartilhada. |
| H01 / H02 | Parcial | Completar login/logout, expiração/revogação, OTP/reset, cooldown, limiter e Turnstile válido/inválido/replay. Roteiro/coleta integrados: [AUTH-HML-ACCEPTANCE.md](AUTH-HML-ACCEPTANCE.md). Recuperação de leitura do Dono relatada; dois HTTP 429 anteriores e um na nova versão, sem causa/correlação individual ou solução permanente comprovadas. [Investigação](AUTH-HML-SESSION-LIMIT-2026-10-21.md). |
| H03 | Parcial; roteiro dos perfis ativos aceito | Laboratório aprovou quatro perfis, matriz negativa das 55 políticas, ausência de escrita na negação e revogação na próxima chamada. No tablet, usuário confirmou employee/manager/owner, Dashboard negado ao Funcionário e permitido aos demais, Parâmetros negado a Funcionário/Gerente e permitido ao Dono; interface/controles conforme roteiro, sem salvar. Após publicação, Dono confirmou Cenários/Financeiro. [Aceite manual](AUTH-HML-PERMISSIONS-MANUAL-2026-10-21.md). Repetição automática com identidades sintéticas isoladas, não com sessões reais no HML. Falta cobertura ampliada real e estabilidade; não conceder papéis para contornar testes. |
| H06 | Parcial; smoke público do piloto aprovado | Fixtures e laboratório conectado permanecem como evidência. Piloto `d4138431`: faixa visível, botões separados e dois acessos ao fluxo em 1280/375/320px, sem overflow ou erro de página. Falta aceite autenticado por perfil, celular físico e uso diário; não equivale a auditoria WCAG completa. |
| T04 | Concluído | Oxfmt alinhado; 21 testes do controlador simulado, Oxc1.64.1 conferida e Python3.12 validada. ActionsNode24 revisadas, Ubuntu24.04 fixado; CI sem avisos de runtime. |
| S03 | Patch #89 integrado; publicação e limites restantes separados | Better Auth 1.7.10/renderer 2.2.0 integrados em 4dc504b; audit zero, 640 testes, qualidade e build isolado da candidata. CI/build/laboratórios e três análises CodeQL do merge aprovados, zero alertas abertos na main. Piloto ainda no checkpoint anterior. Magic Link desativado nos dois destinos; versão interna do Auth, peer herdado da UI e Dependabot alerts desativados continuam registrados. [Recibo e limites](SECURITY-ALERT-REVIEW-2026-10-28.md). |

## Preparação e liberação da operação

| ID | Estado | Resultado que falta |
| --- | --- | --- |
| G01 | Concluído no escopo documental desta rodada | README/roadmap/status, arquitetura/controles, workflow, QA, resiliência, ambientes, paridade, checklist e fila/handoff reconciliados. Fila é espelho do roadmap, sem pacotes ready; evidências históricas preservadas. Incremento integrado nas PRs #51–#53. |
| G02 / I01 | Plano formalizado; laboratório conectado entregue | `QA-VALIDATION-PROTOCOL.md` define topologia, dados, responsabilidades e critérios; `CONNECTED-QA-2026-10-20.md` comprova interface/HTTP/PostgreSQL isolados. Resta consolidar identificação/configuração dos destinos e identidades para aceites reais e operação. Não presumir a original `production` como laboratório. |
| G03 | Concluído; ruleset ativa | Após autorização do Dono, a ruleset `main-production-integration` (ID 25611109) foi aplicada e lida de volta: main `protected:true`, sem bypass, PR atualizado, conversas resolvidas, sete checks exigidos, sem force push/exclusão e CodeQL bloqueando alertas de segurança altos/críticos. Política de mantenedor único mantém zero aprovações formais; o Dono continua aprovando merges conforme a governança. [Registro](MAIN-PROTECTION-PROPOSAL.md). |
| T01 | Concluído | PRs #44–#53 mescladas, main de aplicação `91658ed` com CI/negócio/browser/CodeQL aprovados e publicação HML confirmada. Segurança administrativa segue em S03/G03, aplicação genérica em T02 e produção em I04; integração não dispensa esses gates. |
| I02 | Restore externo concluído; política parcial | Baixados dump/manifesto do Drive, conferidos SHA-256/tamanho e restaurados esses bytes em PostgreSQL 17 sem rede: 38 tabelas/36 recibos exatos e catálogo independente de 0033. Recibo evidence/offsite-restore-2026-10-21.json. Restam retenção, responsáveis, periodicidade, RPO/RTO e recuperação de Auth, excluído do dump public/drizzle. Não apagar backups para abrir quota. |
| I03 | Parcial; frequência divergente em A03 | Diário 03h era o planejamento anterior; revisão observou regra semanal quinta 00:15, fuso a reconfirmar. Validar execução/upload/alerta de falha, completar logs/correlação e decidir disponibilidade independente do computador/app. E-mail de teste e restore históricos não comprovam continuidade. |
| I04 | Pendente / gate humano | Liberação definitiva somente após revisão/integridade/QA, integração, plano de recuperação, configuração revisada dos ambientes e aceite humano. Configurações HML existentes não precisam ser refeitas; secrets/DNS/produção exigem autorização específica. |
| I05 | Ambiente e roteiro prontos; ensaio manual pendente | Piloto isolado publicado em `d4138431`, com retrato do histórico existente. Usuário fará o teste com notas reais de outros meses: conferir duplicidade, data original, unidades e saldos antes/depois. Entrada/perfil e demais fatos de produção/venda/recebimento/entrega dependem de fontes e aceite. Não criar demonstrações fictícias ou limpar dados. [Roteiro](RECOVERY-PILOT-PROPOSAL-2026-10-26.md). |

Checkpoint GitHub de 21/10: PRs #44–#53 mescladas e issue #36 encerrada.
Consulta de 25/10 confirma #55/#59/#60 e as correções #61/#63/#62/#64
integradas; a entrega documental #65 fecha este registro. Outras PRs não
pertencem à autorização deste lote.
Atualização documental não habilita o migrador nem altera proteções.

## Ajustes operacionais e evoluções de produto

| ID | Estado | Escopo restante e dependência |
| --- | --- | --- |
| O05 | Quando houver operação real | Registrar compras ou saldo inicial documentado e autorizado; depois iniciar produção real. A ausência atual de operações não é defeito nem motivo para criar demonstrações no HML. |
| O06 / O09 | Configuração a conferir | Pontos de reposição, fornecedores e locais/canais efetivamente usados, com fonte válida. Cadastro vazio não justifica valores inventados; alertas de cobertura dependem de histórico. |
| O10 | Condicional | Importar histórico somente se solicitado, após conferir fonte, aliases, custos, duplicidade, corte e referências inéditas. Os recibos de catálogo não autorizam essa importação. |
| O11 | Condicional | Definir manutenção diária versionada de receitas/perfis/tarifas: procedimento controlado existente ou gestão pela interface, com auditoria. Não alterar versões usadas silenciosamente. |
| F01 / F03 | Parcial | Lucro conjunto e recebimentos já estão entregues. Revisar somente indicadores/alertas adicionais ainda necessários, como contribuição, margem mínima realizada e comparação específica por canal. Ranking por sabor exige taxonomia; distinguir competência de caixa e não prometer conciliação bancária completa. |
| F04 | Depende de histórico | Cobertura em dias e sugestão de reposição exigem consumo confiável, janela e regra aprovadas. Estoque vazio não é recomendação automática de compra. |
| S02 | Integrado e publicado no piloto; aceite real pendente | `/acessos` e `access:approve` para Dono/Gerente, primeira liberação de Funcionário com consulta confiável, auditoria atômica, replay/concorrência e nova sessão. Diretório restrito e secret configurados; fonte `53e410e`, piloto `d4138431`. Validar concessão/sessão/reset reais; promoção/reativação ficam com Dono e dupla aprovação não foi entregue. [Recibo](PILOT-PUBLICATION-2026-10-26.md). |
| R01 | Evolução futura | WhatsApp: ADR, webhook validado, evento persistido, idempotência/retry, interpretação sem bypass das regras, confirmação e auditoria. |
| R02 | Evolução futura | Notas/OCR: armazenamento/upload seguro, extração candidata, validação, deduplicação, vínculo com compra e política de retenção. |
| R03 | Evolução futura | Pagamentos parciais/mistos/parcelados, integrações de operadora, conciliação e logística ampliada conforme necessidade aprovada. Recebimento integral por meio já foi entregue. |
| R04 | Condicional | Multitenancy/SaaS somente após decisão sobre memberships, tenant ativo e mapeamento histórico. Não atribuir tenant fictício aos fatos; não é pré-requisito para uma única operação interna. |
| R05 / R06 | Evolução futura | Planejamento entre lotes, gestão avançada e XLSX conforme necessidade. A UX diária revisada e o CSV existente já estão entregues. |
| R07 | Condicional | Avançar automação/autonomia somente após avaliação do piloto e estabilidade; multiagente requer autorização. A retomada pontual das 02:33 foi concluída e não cria recorrência. |
| S04 | Parcial; incremento tipado integrado e publicado | Finanças, lifecycle e Cenários sem `any` explícito nos módulos tratados; contratos derivados do driver/schema, callback genérico, seleções/snapshots inferidos e falha controlada para resultados obrigatórios ausentes. PRs #52/#53 integradas e publicadas no HML; 570 testes Node e 12 casos conectados isolados aprovados, incluindo lifecycle e rollback dos cinco writers de Cenários. [Transações](TYPED-TRANSACTIONS-2026-10-21.md), [Cenários](TYPED-SCENARIOS-2026-10-21.md), [publicação](JOINT-HML-PUBLICATION-2026-10-21.md). Restam extrações graduais em operações/produção/financeiro. Cálculos, versões, ativação e permissões preservados; nenhuma migration. |

## Pendências antigas encerradas ou substituídas

- Não refazer cadastro de ovos/insumos/receitas/perfis, definir novamente
  recheios/embalagens ou pedir novamente taxas, diária, energia, rendimento e
  meta. Os pacotes e as decisões já foram aplicados.
- Não reabrir restore, bootstrap de acesso, publicação do limiter ou aplicação
  específica de migrations como tarefas inéditas. O que resta está delimitado
  em H01–H03, T02 e I02.
- Não ativar de novo o primeiro rascunho do mix: o cenário revisado já está
  ativo e o original está arquivado com histórico preservado.
- Não repetir publicações antigas de UX ou a conferência de CI de `e890e3d`
  como gate atual: o código que as sucede foi publicado com CI/CodeQL próprios.
- Anotações antigas de 13 vulnerabilidades ou audit zero são históricas.
  A revisão de 23/10 registrou quatro pacotes altos, uma causa raiz Zod;
  correção e nova auditoria acompanham A02. Nenhum audit novo nesta reconciliação.
- As novas identidades de Gerente e Funcionário já foram concedidas e tiveram
  entrada confirmada. Aceite completo permanece H03. Acessos adicionais,
  multitenancy e importação histórica são condicionais; não bloqueiam
  genericamente a validação técnica autorizada.

## Evidências de referência

As fontes abaixo comprovam entregas e limites, sem constituir roadmaps paralelos:

- [Estado canônico e publicações](PROJECT-STATUS.md).
- [Validação automática de segurança/recuperação](AUTOMATIC-READINESS-2026-10-21.md),
  [procedimento T02](MIGRATION-OPERATOR-PROCEDURE.md) e
  [proposta G03](MAIN-PROTECTION-PROPOSAL.md).
- [CI da main b82e044](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349886),
  [negócio/browser conectado](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349936)
  e [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349907).
- [Validação conectada, backup e alertas](CONNECTED-QA-2026-10-20.md).
- [Protocolo de QA](QA-VALIDATION-PROTOCOL.md) e
  [primeiro acesso publicado](AUTH-FIRST-ACCESS-2026-10-20.md).
- [PR #49 integrada](https://github.com/naiguelcabral/seus-brownies/pull/49) e
  [issue #36 encerrada](https://github.com/naiguelcabral/seus-brownies/issues/36).
- [Estado da branch main](https://api.github.com/repos/naiguelcabral/seus-brownies/branches/main)
  e [rulesets consultados](https://api.github.com/repos/naiguelcabral/seus-brownies/rulesets)
  (retrato de 21/10; estado remoto pode mudar).
- [Revisão integral do workbook](ATTACHED-WORKBOOK-COMPLETE-REVIEW-2026-10-18.md).
- [Custos, recuperação e taxas aplicados](COST-RECOVERY-FEES-HML-2026-10-18.md).
- [Recebimentos e lucro publicados](PAYMENT-SETTLEMENT-PROFIT-HML-2026-10-18.md).
- [Cenários publicados](SCENARIO-UX-HML-2026-10-19.md).
- [Compras e Produção publicados](PURCHASE-PRODUCTION-UX-HML-2026-10-19.md).
- [Conferência integrada de integridade e recibo HML](INTEGRITY-RECONCILIATION-2026-10-19.md).
- [Recibo histórico da publicação de Compras e Produção](../../evidence/purchase-production-ux-hml-2026-10-19.json).
- [Runbooks e matriz de ambientes](ENVIRONMENT-MATRIX.md).
- [ADR atual da cadeia genérica de migrations](MIGRATION-CHAIN-REMEDIATION-ADR.md).
- [Gates humanos](HUMAN-APPROVALS.md) e [Definition of Done](DEFINITION-OF-DONE.md).

Ordem recomendada: **A01 e correções A02/A05/A06 → recuperação/autoria/conexões
→ autenticação real e aceite por perfil → antiabuso/FIFO/cabeçalhos/celular
→ piloto autorizado → aceite de produção → WhatsApp/assistente → OCR**.
Frentes independentes podem avançar dentro da autorização vigente. Integração
à `main` e ensaios isolados já estão concluídos; não há compra/produção real
a executar antes de existirem fatos e previsão reais.
