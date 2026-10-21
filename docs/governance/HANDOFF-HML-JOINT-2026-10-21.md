# Verificação repetida de perfis e handoff HML — 21/10/2026

Main integrada: `91658ed73a27c61ef3e4f779381584adf8b0834c`.
PRs #51/#52/#53 integradas; #50 incorporada na #53 e marcada integrada.
CI main 39639558961, negócio/browser 39639559227 e CodeQL 39639559207
aprovados. Candidata conjunta: 570 testes Node e tipos/lint/formato/Knip
aprovados; três análises CodeQL sem resultados, erros ou avisos.

Usuário concluiu no tablet os roteiros de Funcionário/Gerente/Dono: papéis
employee/manager/owner, GETs diretos de Dashboard/Parâmetros e interface.
São relatos humanos do HML, preservados no registro manual. O episódio 429
teve recuperação relatada; causa e estabilidade permanente não comprovadas.

Pedido posterior de repetição automática: navegador do agente sem sessão;
usuário informou que só pode testar manualmente no tablet. Repetição realizada
no laboratório HTTP/PostgreSQL 17 com identidades sintéticas, sem credenciais
reais: 12 testes passaram em 1,2 minuto. Gerente: getDashboard permitido e
getManagementSettings negado; Funcionário: ambos negados. Matriz negativa das
55 políticas e revogação também passaram. Primeira tentativa parou antes do
schema por inicialização do PostgreSQL; nova execução após pg_isready passou.
Banco descartável encerrado. Log local /tmp/cacau-profile-repeat.log.
Não afirmar que a repetição automática ocorreu com contas reais no HML.

## Próximo passo exato

Publicação conjunta HML continua autorizada e NÃO executada. Após confirmar
capacidade disponível, conferir branch/árvore limpa, estado remoto e checks
main; executar build/deploy isolado apenas cacau-v1-hml, com site key pública
real já publicada (obter do bundle público do login, nunca de .env). Usar
npm run deploy:hml com VITE_TURNSTILE_SITE_KEY explícita, conforme workflow.
Publicar o código integrado, sem migrations, SQL compartilhado ou secrets.
Conferir deployment/versão, smoke público e solicitar ao usuário conferência
autenticada no tablet, sem salvar. Registrar recibo e atualizar status/roadmap.
Produção permanece fora do escopo. Não repetir grants/importações/cenários.

Uso consultado antes do fechamento: 6% restantes na janela de cinco horas,
21% na semanal; reserva 5%. Reset da janela: 21/10/2026 15:00:01 Brasília
(18:00:01 UTC), conforme timestamp 1792605601 da ferramenta de uso.

Checkpoint final: ferramenta confirmou 5% restantes na janela de cinco horas
e 21% na semanal. Estado: encerrando por reserva; executar DESLIGARTUDO
na branch codex/typed-scenarios-20261021, nunca na main. Publicação pendente.
