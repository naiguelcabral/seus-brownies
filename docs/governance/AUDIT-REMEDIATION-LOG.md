# Missão de correção da auditoria

## Base e autorização — 2026-09-07

Branch dedicada `codex/audit-remediation`, criada de `40bb2af` com árvore e
índice limpos. Fetch de origin concluído. Autonomy está 67 commits à frente
de origin/main (`daa318c`); `dc7c35e` e `3a4e5d5` continuam exclusivos de
g1-auth-adr. A07-R2 já incorporado em `c28c267`; `40bb2af` acrescentou seis
testes de composição A07-R3, ainda sem observar cookies reais do adaptador.
Nenhuma instrução adicional AGENTS encontrada. Relatório anexo não encontrado.
Uso/reset: não disponíveis. Autorização exclusiva desta missão, sem promover G8.

## AR-A1 — checkpoint Git (G0/G8)

Achado confirmado em DESLIGARTUDO: lista fechada de arquivos rastreados antes
de `git add --all`, sem validação genérica posterior. Objetivo: impedir entrada
de caminhos sensíveis novos, aninhados, renomeados ou rastreados, sem ler seu
conteúdo. Arquivos: DESLIGARTUDO, ignore, guard Python e testes sintéticos.
Aceite: testes de índice real em repositórios descartáveis, revisão de ordem
do script e diff. Exceção deliberada somente `.env.example` na raiz.
Estado: implementado; validação local em andamento. Não executar desligamento
no repositório durante a missão.

Validação AR-A1/A2/A3: seis testes direcionados passaram fora do sandbox após
`spawnSync git EPERM` no sandbox; fixtures descartáveis, dados fictícios. Bash
syntax e diff sem erros. Build sintético prova archive sem arquivos de ambiente
locais, inputs explícitos, diretórios de perfil vazios e rejeição de HEAD
sensível. Build real ainda pendente do checkpoint limpo. Alterações não
homologadas.

Checkpoint `b5471fa`: build real isolado de cliente/SSR passou com chave pública
de teste e sem secrets. Aviso esperado de secrets ausentes; nenhum deploy.
AR-A1/A2/A3 validados localmente; publicação/homologação continuam pendentes.

## AR-A4/A5 — conversas e reconciliação (G0/G8)

Confirmados vazamentos sintéticos de Bearer e postgresql. Corrigida ordem para
remover estruturas completas antes das atribuições; adicionados cookies,
Basic, URLs credenciadas e valores entre aspas. Quinze formatos e sanitização
repetida passaram. Um teste inicialmente falhou por perda de conteúdo adjacente
na segunda passagem e foi corrigido. Captura bruta agora usa umask 077.
Contrato e revisão preparada do PR2 em LOCAL-CONVERSATION-PRIVACY.md.
Nenhuma conversa/log existente lido ou reprocessado. Lint direcionado verde.
Estado: implementado e validado localmente; aguardando revisão/publicação.

Consulta remota em 8 de setembro: PR #2 aberto e não draft, destino
`g1-auth-adr`, origem `feat/codex-conversation-memory`, mergeável e sem checks.
A API do repositório não listou workflows nem webhooks; Actions está habilitado,
mas sem workflow versionado. Não há automação conhecida de deploy acionada pelo
push desta branch. Revisão e publicação continuam pendentes.

## AR-A2/A3 — build Turnstile e isolamento (G1/G7, A11)

Achado confirmado: chave pública não repassada em run_isolated. Objetivo:
reconciliar apenas a linha de dc7c35e, validar chave não vazia, rejeitar fontes
sensíveis antes de archive e provar com inputs sintéticos. Arquivos previstos:
script, testes, documentação. Build real somente após prova sintética e HEAD
limpo. Sem deploy; segredo Siteverify nunca é input de build.

## Fila da missão

A1 → A2/A3 → A4 sanitização → A5 reconciliação documental/PR2 → B1 composição
login → B2 concorrência → B3 antiabuso → B4 Funcionário → B5 autoria → B6
contratos → B7 callback → C1–C9 integridade → D roadmap independente → E CI e
operação. Achados ainda não inspecionados permanecem dependentes de validação,
não confirmados por repetição do relatório. Gates parciais não bloqueiam
pacotes independentes. Registros históricos da fila e do handoff preservados.

## AR-B1/B2 — composição e concorrência do login (G1)

O handler real foi exercitado com provedor, proteção pública, contador durável
e auditoria. Falha de leitura bloqueia antes do provedor; a quinta falha grava o
contador e sinaliza desafio; indisponibilidade do provedor não é convertida em
credencial inválida. Falha da auditoria mantém o resultado do provedor e impede
a gravação posterior do contador, conforme o contrato atual.

O adaptador Neon real foi testado com transporte sintético: o `Set-Cookie` do
provedor é anexado à resposta durante `signIn`, antes de o handler tentar gravar
o contador. Assim, rejeição posterior da Promise por falha de persistência não
prova ausência de sessão emitida. Estado: A07-R3 implementado e validado
localmente; cookie e sessão reais aguardam HML. A política para falha do contador
após autenticação aguarda decisão humana.

A concorrência foi reproduzida: duas leituras simultâneas a partir de quatro
falhas observam o mesmo estado e ambas liberam o provedor sem desafio. O
incremento SQL posterior é atômico, mas não torna a decisão anterior atômica.
Escolher reserva prévia, serialização ou tolerância explícita ao excesso altera
a semântica de sucesso e falha do provedor; nenhuma opção foi imposta. Estado:
reprodução e teste de caracterização preparados; aguardando decisão.

## AR-B3/B7 — antiabuso e callback de reset (G1/G7)

Confirmados o `Map` por isolate, a ausência de limpeza global de buckets
expirados, o binding `AUTH_RATE_LIMITER` não consumido e a conclusão do reset
sem o mesmo gate. A implementação local agora:

- limpa buckets abandonados sem reter identificadores HMAC;
- aceita o binding Cloudflare quando presente, com chave `scope:HMAC`, antes do
  limitador local, e falha fechada quando o binding nega ou falha;
- preserva separação entre limite volumétrico, CAPTCHA e cooldown durável;
- protege login, cadastro, OTP, solicitação e conclusão de reset;
- reinicializa o widget após consumo do token para impedir replay acidental.

O binding permanece opcional porque o namespace, o limite e a janela de HML
dependem do gate A08. O contador da Cloudflare é tratado como mitigação
distribuída aproximada, não como contador global estritamente consistente.
Estado: implementação e testes sintéticos concluídos; configuração externa e
homologação real aguardam aprovação/publicação.

O callback de reset deixou de inferir HML para todo build fora de DEV.
`PASSWORD_RESET_REDIRECT_ORIGIN` é obrigatório nesses builds e aceita somente
origem HTTPS limpa; a rota é anexada pelo servidor. O localhost permanece como
fallback exclusivamente em desenvolvimento. Estado: validado localmente;
configuração HML aguarda publicação autorizada.

## AR-B4 — experiência do Funcionário (G1/G3)

Achado confirmado: Compras e Vendas chamavam loaders de histórico que exigem
permissões negadas ao Funcionário, e `/` exigia dashboard. Rotas, navegação e
loaders agora derivam da matriz aprovada: o Funcionário inicia em `/compras`,
registra compras/vendas sem consultar os respectivos históricos, lê o catálogo
sem receber controles de edição e não vê cancelamento FIFO. Chamadas diretas
continuam protegidas pelo middleware existente; nenhuma permissão foi ampliada.
Estado: implementado e validado localmente; aguarda revisão e homologação por
papel.

## AR-C1/C2/C3/C4 — idempotência e integridade das criações (G2/G6)

Os quatro achados foram confirmados no código atual. Compra, venda e despesa
não recebiam chave idempotente; compras repetidas do mesmo produto associavam
itens distintos ao primeiro movimento por `find(productId)`; a escrita aceitava
produto desativado e a venda não revalidava o tipo; tipo/unidade do produto
podiam mudar depois de uso operacional.

A migration `0017_orange_the_hand.sql`, preparada para revisão e não aplicada,
adiciona chave/hash idempotentes e autor da criação em compras, vendas e
despesas. As colunas são anuláveis para preservar fatos legados; novas Server
Functions exigem UUID, calculam SHA-256 canônico no servidor, reservam a chave
com unicidade transacional e retornam o mesmo ID no reenvio igual. A mesma chave
com payload diferente falha explicitamente. O cliente mantém a chave após erro
ou timeout e só a renova depois do sucesso. A restrição única serializa chamadas
simultâneas antes das escritas filhas.

Cada item de compra agora cria sequencialmente seu próprio item, movimento com
referência `purchase_item` e, quando acabado, camada ligada àquele movimento.
O mesmo alinhamento explícito por índice foi aplicado a itens e movimentos de
venda, removendo dependência da ordem de `RETURNING`. A escrita revalida produto
ativo e exige produto final na venda.

Mudanças estruturais de produto têm defesa em duas camadas: consulta de uso na
aplicação e trigger `BEFORE UPDATE` na migration, cobrindo estoque, compra,
venda, aliases, receitas, perfis, componentes e saídas de produção. O trigger
fecha a corrida entre consulta e escrita sem modificar fatos históricos.

Impacto da migration: adição de nove colunas anuláveis, três constraints únicas
e um trigger; a criação dos índices únicos pode segurar locks breves nas três
tabelas. Não há backfill, exclusão ou transformação de dados. Recuperação, se a
aplicação também for revertida: remover primeiro o trigger e a função; depois,
em janela aprovada, remover constraints e colunas. A remoção das colunas perde
as novas referências/autor e por isso não deve ser automática.

Estado: implementado e validado por testes de domínio, contrato SQL, lint e
schema gerado. A execução concorrente e o trigger em PostgreSQL real estão como
`validation-blocked`: não há binário PostgreSQL nem imagem Docker local, e
nenhum banco compartilhado foi tocado. Migration aguarda revisão humana antes
de aplicação em branch descartável.

## AR-B5 — autoria e auditoria operacional (G1/G2)

O achado foi confirmado: os fatos criados pela interface não guardavam a
identidade resolvida pelo servidor e não existia uma trilha transversal das
mutações operacionais. As colunas de autoria da migration `0017` recebem o ID
da identidade autenticada em compra, venda e despesa. A migration aditiva
`0018_bouncy_odin.sql`, preparada e não aplicada, cria
`operational_audit_events` com ator, ação, tipo/ID da entidade, instante,
referência da operação e motivo quando fornecido.

Compra, venda, despesa, cancelamento, devolução, perda e ajustes agora gravam o
evento na mesma transação do fato. A falha da auditoria é propagada e força
rollback; reenvio idempotente não duplica o evento porque não cria novo fato.
Eventos antigos não recebem ator inventado e não há backfill. Impacto: uma nova
tabela e três índices, sem reescrita das tabelas existentes. Recuperação exige
reverter primeiro o código; a eventual remoção da tabela perde evidência e só
pode ocorrer com decisão humana expressa.

Estado: implementado e validado com fakes transacionais, inclusive falha de
persistência da auditoria. PostgreSQL real e homologação por identidade estão
`validation-blocked` junto das migrations 0017/0018.

## AR-C5/C8/C9 — relatório FIFO, reconciliação e exceções (G2/G3)

Confirmado que o `INNER JOIN` obrigatório com saída de produção eliminava do
CMV as alocações de camadas originadas por compra e ajuste positivo. O join é
agora opcional; uma venda combinando produção, compra e ajuste preserva toda a
receita e todo o CMV, enquanto a visão por lote inclui apenas a parcela que
possui lote real.

A tela de relatórios recebeu reconciliação somente leitura. Ela confronta, com
IDs rastreáveis, quantidade e custo original/remanescente de cada camada,
alocações, movimentos de saída, reversões, movimentos de entrada, produto e
CMV alocado. O resultado apenas emite divergências; não contém comando de
correção ou escrita.

Os blocos opcionais de produção/FIFO deixam de transformar qualquer exceção em
“recurso ausente”. Somente os códigos PostgreSQL `42P01` e `42703`, que indicam
migration aditiva ausente, degradam para `null`; erros reais de consulta são
propagados à página de erro.

Estado: implementado e validado localmente por testes puros e contratos de
consulta; resultado sobre dados reais aguarda migrations e homologação.

## AR-C6 — semântica temporal dos relatórios (G3)

Achado confirmado e não alterado por falta de regra aprovada. Hoje a receita e
as vendas são selecionadas pelo período, todas as reversões ligadas a essas
alocações são consideradas mesmo quando ocorreram depois do fim do período, e
o quadro FIFO mostra o saldo atual das camadas.

Opção A, “posição no encerramento”: reconstruir movimentos, alocações e
reversões até o fim do dia selecionado. Uma devolução no mês seguinte não muda
o CMV já fechado; exige corte temporal consistente e é adequada a fechamento
contábil. Opção B, “visão atual das vendas do período”: manter todas as
reversões conhecidas e rotular explicitamente o resultado como visão atual; o
CMV de um período passado pode mudar depois. Recomenda-se A para relatórios de
fechamento e B somente como consulta operacional separada. A escolha e o
tratamento financeiro da receita em cancelamentos/devoluções aguardam decisão
humana.

## AR-C7 — devoluções e cancelamentos (G2)

Confirmado que o writer planejava uma reversão a partir da alocação original e
não descontava reversões anteriores. Devoluções sucessivas agora usam apenas a
quantidade e o custo ainda reversíveis; cancelamento após devolução parcial
restaura somente o residual. O lock do item/venda, seguido dos locks ordenados
de produto, camadas e alocações, mantém a leitura e a gravação no mesmo limite
transacional. Excesso falha antes de novo movimento.

Estado: implementado e validado localmente em cenários sucessivos, parcial mais
cancelamento, excesso, repetição, custo residual e rollback em cada estágio.
Concorrência real em PostgreSQL permanece `validation-blocked` pela ausência de
banco descartável local.

## AR-E1 — typecheck, runtime e CI (G0/G7)

O repositório não possuía script explícito de typecheck e não tinha workflow
versionado. Foi adicionado `npm run typecheck` (`tsc --noEmit`), após corrigir
as dívidas de tipos em guards HML intencionalmente pendentes, bridge de
auditoria FIFO, formulários lifecycle, produção e script de diagnóstico local.
Node 22, mínimo `22.12.0` e menor que 23, está declarado no `package.json` e
fixado em `.nvmrc`; o intervalo atende o Vite 8 do lockfile e a instalação
local comprovada nesta missão.

O workflow de CI executa `npm ci`, suíte, lint, typecheck e build HML isolado
com site key pública sintética. Não executa deploy, migration, e2e ou
`npm run check` global: este último continua vermelho pela dívida de
formatação histórica catalogada em `FORMATTING-DEBT.md`. O build isolado não
recebe secrets de aplicação.

Validação local: `npm test` aprovou 248 casos, `npm run lint` e
`npm run typecheck` passaram, e o build HML isolado passou em HEAD limpo com
somente `VITE_TURNSTILE_SITE_KEY` sintética. O SSR avisou que os cinco secrets
operacionais não estavam disponíveis, como esperado para esta prova; nenhum
arquivo de ambiente foi carregado. A CI `34268997522` no checkpoint `8c80bbf`
passou integralmente depois de AR-E2.

## AR-D1 — exportação CSV de relatórios (G3)

O relatório operacional agora oferece CSV local dos mesmos agregados já
autorizados no loader protegido por `reports:financial:read`: período,
faturamento, despesas, estoque, vendas, FIFO e, quando disponíveis, produção.
O arquivo usa UTF-8 com BOM e delimitador `;`; os valores monetários e de
quantidade permanecem como decimais textuais, sem conversão para `Number`.

Todo campo recebe aspas CSV e prefixos de fórmula (`=`, `+`, `-`, `@`, mesmo
precedidos por espaço ou controle) recebem apóstrofo antes do download. Assim,
texto fornecido por canal, categoria, produto ou motivo não é executado ao
abrir o arquivo em planilha. Não há endpoint público novo, escrita de dados,
integração de Excel ou serviço externo.

Validação: testes específicos, lint, typecheck, Prettier e `git diff --check`
passaram. As 48 specs foram executadas em grupos sem falha; a execução única
de `npm test` excede o limite local de 30 segundos depois de reportar 21
arquivos verdes. O build HML isolado passou no checkpoint `c44b954` com chave
pública sintética; o aviso de secrets operacionais ausentes é esperado e não
carregou arquivo de ambiente.

Estado: implementado e validado localmente e na CI `34268997522`; homologação
de abertura do CSV no aplicativo de planilha escolhido continua pendente.

## AR-E2 — preflight reproduzível de CI (G7/G8)

A primeira CI remota (`34264913745`, commit `dddff49`) falhou em três testes
de `--dry-run`: o controlador exigia o binário Codex antes de selecionar o
pacote, embora esse modo não invoque Codex. O preflight agora exige o binário
somente em modos que podem iniciar um ciclo. O teste reproduz a ausência do
CLI com `PATH` restrito a `/usr/bin:/bin`.

Na mesma revisão, o lint identificou que a expressão de proteção CSV continha
controles literais proibidos pela regra de qualidade. Ela passou a construir os
escapes equivalentes em runtime, mantendo a proteção de NUL, whitespace e os
prefixos de fórmula. Isso não muda o conteúdo exportado.

Estado: implementado e validado localmente com teste do controlador, teste CSV,
lint, typecheck, Prettier, `bash -n` e `git diff --check`. O build isolado
passou em HEAD limpo com chave pública sintética; o aviso de secrets
operacionais ausentes continua esperado. A CI `34268997522` no checkpoint
`8c80bbf` passou com suíte, lint, typecheck e build isolado. As duas falhas
anteriores permanecem como evidência histórica: `34264913745` descobriu o
preflight e `34268367786` confirmou o lint CSV antes da correção.

## AR-D2 — busca, filtros e paginação de despesas (G3)

O histórico protegido por `expenses:read` deixa de carregar 60 itens fixos. O
servidor valida página, texto e período, conta com os mesmos filtros e retorna
20 itens em ordem estável por data e ID. A interface mantém os filtros na URL,
reseta a página quando eles mudam, informa total/página e tem estados explícitos
de carregamento, erro com nova tentativa e lista vazia.

Não há mudança na criação de despesas, no cálculo monetário, na permissão ou em
dados existentes. Testes cobrem o limite/ajuste de página e o contrato da
Server Function protegida e da rota. Build isolado e CI desse novo checkpoint
foram separados: o build passou em HEAD limpo com chave pública sintética e o
aviso de secrets operacionais ausentes esperado. A CI `34270184144` no
checkpoint `7e10f0d` passou integralmente.

## AR-E3 — runbook de resiliência operacional (G7)

Foi criado `OPERATIONS-RESILIENCE-RUNBOOK.md` com recuperação primária por
branch restaurada do Neon, cópia independente proposta, ensaio em branch
descartável, resposta a incidente, rollback de código, sinais operacionais e
proteção de artefatos. O documento não configura storage, retenção, alertas,
backup ou restauração; registra responsáveis, RPO/RTO e corte como decisões
humanas obrigatórias.

Estado: implementado documentalmente e pendente de ensaio autorizado em branch
descartável, decisão de RPO/RTO, cópia independente e configuração externa.
