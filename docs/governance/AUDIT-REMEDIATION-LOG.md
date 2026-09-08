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
