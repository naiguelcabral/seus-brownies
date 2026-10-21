# Falha de verificação da sessão no aceite do Dono — 21/10/2026

## Resultado observado

Após Funcionário e Gerente confirmarem os respectivos papéis e os resultados
GET diretos de Dashboard/Parâmetros, o usuário iniciou o roteiro do Dono.
Primeiro relatou erro RPC de autenticação obrigatória. Depois, ao colar o
endereço na mesma aba do HML autenticado, relatou “Não foi possível verificar
a sessão”. A primeira rodada não confirmou o papel canônico. Posteriormente, após
intervalo, o usuário relatou `owner` no mesmo endpoint de sessão. Essa leitura
se recuperou; não converter a falha anterior em negação de RBAC do Dono.

Consulta administrativa somente de leitura na observabilidade do Worker
`cacau-v1-hml`, janela 16:30–16:44 UTC (13:30–13:44 Brasília), confirmou dois
eventos sanitizados `auth.session.provider`, stage `http_error`, status 429,
versão `22733c04-7996-43b1-88e3-3f775db223fc`. Consulta ampliada desde 15:40 UTC
retornou o mesmo total. Foram consultados nomes de campos/valores não sensíveis
e agregações, sem recuperar eventos brutos, cookies, cabeçalhos ou identidades.

A agregação é compatível com a falha relatada, mas não identifica a conta nem
comprova correlação individual. O motivo do limite, seu escopo (sessão, conta,
origem ou serviço), horário de liberação e recuperação permanecem desconhecidos.
Não atribuir a causa à quantidade de cliques do usuário ou à tipagem candidata.
O código S04 não foi publicado no HML.

## Tratamento e verificação

O resolver atual lança `AuthSessionUnavailableError` em falha do provedor
(exceto rejeição explícita 401). Sua mensagem é a relatada pelo usuário.
Ausência de token retorna anonimamente sem consulta remota; um token presente
continua sujeito à verificação do SDK e ao vínculo Cacau. Não há fallback de
permissão, nova sessão inventada, cache global ou revalidação dispensada.
Os testes existentes de `auth-session-provider` e `auth-neon-adapter` cobrem
429/5xx/transporte, falha fechada e recuperação na próxima leitura; não foram
repetidos para este registro documental.

Orientado intervalo sem tentativas repetidas e uma única consulta de Sessão
na aba autenticada, para distinguir recuperação de persistência da falha.
Nenhuma janela exata de reset foi observada. O usuário confirmou depois
“Agora apareceu owner”. A recuperação dessa leitura foi relatada; não é
prova de solução permanente ou de sucesso das demais consultas.
Não encerrar/revogar sessão, redefinir senha, conceder papel, mudar rate limit,
secrets ou configuração para concluir o teste. Uma leitura posterior com
`owner` ainda deve ser seguida dos GETs de Dashboard/Parâmetros e da interface.

## Gate atual

Papel `owner` confirmado por relato do endpoint de sessão. Restam as duas
consultas GET e a interface do Dono para encerrar esta rodada H03. Revisão/integração e
publicação conjunta seguem a ordem solicitada, após resolução e repetição do
caso. Nenhuma alteração de código, banco, RBAC, secrets ou deploy nesta análise.
Os aceites já relatados de Funcionário/Gerente ficam preservados com seus limites.

Recibo: [agregação sanitizada](../../evidence/auth-hml-session-limit-2026-10-21.json).
Referências: [aceite manual](AUTH-HML-PERMISSIONS-MANUAL-2026-10-21.md),
[incidente anterior](HML-SESSION-INCIDENT-2026-10-20.md),
[tratamento 429 anterior](AUTH-SESSION-THROTTLING-2026-10-17.md),
[roadmap](ROADMAP-CODEX.md).
