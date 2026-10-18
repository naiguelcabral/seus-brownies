# Indisponibilidade de sessão ao navegar — 17 de outubro de 2026

## Evidência

Usuário relatou entrada bem-sucedida em HML seguida de retorno ao login ao
abrir Estoque e novas tentativas sem sucesso. A página pública `/login`
respondeu HTTP 200 e renderizou o formulário em navegador anônimo.

Auditoria SQL da original registrou três logins `success` às
`2026-10-18T00:39:37.178Z`, `00:39:45.574Z` e `00:39:59.731Z`.
No mesmo intervalo, o Worker `cacau-v1-hml`, versão
`1ea59a90-c289-4c99-bf8f-a0bbd82d6b37`, registrou três falhas
`[mintSessionDataCookie] Failed to mint session_data cookie` com
`Failed to fetch session data: 429 Too Many Requests`.
Sucesso de credenciais não comprova emissão/restauração completa da sessão.

Leitura realizada pela API oficial de observabilidade após incompatibilidade
de schema do conector de logs. Nenhum token, cookie ou credencial foi lido.
Consultas SQL limitaram-se a ação, resultado, metadata nula e horário.

## Correção delimitada

`getSessionStatus` consultava a identidade duas vezes: diretamente e novamente
no resolver de principal. Agora identidade, verificação de e-mail e papel usam
uma única resposta do provedor e uma consulta ao vínculo ativo do Cacau.

Erros 429/5xx/rede na verificação viravam ausência de identidade e podiam
acionar redirecionamento ao login. Agora produzem erro sanitizado 503, sem
autorizar acesso ou converter indisponibilidade em anonimato. Rejeição explícita
401 continua anônima. Não há retry automático, cache global, uso de sessão
inválida ou mudança em cookies, duração, RBAC ou limitadores de segurança.
O vínculo Cacau é revalidado em cada resolução.

Esta correção reduz consultas duplicadas e trata o efeito de indisponibilidade;
não comprova a origem integral do limite 429 nem a resolução do fluxo real
login → Estoque no ambiente publicado. A falha de minting interna do SDK ainda
pode ocorrer quando o provedor estiver limitado.

## Validação e publicação

Testes determinísticos cobrem consulta única, 429/500/503, falha de rede e
recuperação, troca de identidade, acesso revogado, erro com dados e rejeição
401. Sem operações sintéticas em HML. Suíte completa: 489 testes aprovados;
tipos, lint e formatação aprovados. Build HML isolado de `899f7ec` aprovado
com chave pública de teste, sem secrets. Primeira execução da suíte no sandbox
falhou por `spawnSync git EPERM`; execução completa autorizada fora do sandbox
passou. Nenhum teste foi removido ou enfraquecido.

Publicação HML requer autorização específica, conforme comentário operacional
em `scripts/build-hml-isolated.sh`: “Publicação continua sendo operação
separada e explicitamente autorizada.” Autorizações anteriores eram delimitadas
aos diagnósticos/reset e não abrangem esta correção nova. Após publicação,
confirmar com a sessão humana entrada, navegação para Estoque e recarga,
correlacionando os logs sem coletar credenciais.
