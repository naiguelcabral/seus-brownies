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

Validação AR-A1/A2/A3: sete testes passaram fora do sandbox após `spawnSync
git EPERM` no sandbox; fixtures descartáveis, dados fictícios. Bash syntax e
diff sem erros. Build sintético prova archive sem arquivos de ambiente locais,
inputs explícitos, diretórios de perfil vazios e rejeição de HEAD sensível.
Build real ainda pendente do checkpoint limpo. Alterações não homologadas.

Consulta remota: PR #2 aberto, destino `g1-auth-adr`, origem
`feat/codex-conversation-memory`. API não listou workflows nem webhooks.
Integrações de Git por aplicativo externo ainda não foram comprovadas ausentes;
por prudência, publicação aguarda essa verificação, preservando commits locais.

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
