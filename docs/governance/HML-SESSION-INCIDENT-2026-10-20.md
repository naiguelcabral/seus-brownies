# Investigação do HTTP 500 no HML — 20/10/2026

## Fatos observados

A versão anterior `f0c2e0e2-8798-4132-9abc-50c87bf7a973` já registrava seis
respostas 500 entre 00:01:11 e 00:02:56 UTC de 20/10, antes da publicação
`cf14fc9a-ffdb-4b6f-8b89-1da6635dfa46` às 14:01:57 UTC. Dois desses eventos
eram na raiz. Portanto, o problema não nasceu com a alteração de consultas
transacionais. Isso não comprova que todos os 500 tiveram a mesma causa.

Entre 14:00 e 14:10 UTC, a consulta retornou 12 eventos: sete da versão nova
(quatro 500 e três respostas normais) e cinco da anterior (dois 500 e três
normais), incluindo os dois 500 logo após o rollback. Todos tinham outcome
`ok`, sem eventos adicionais de console/exception nessa janela. Outcome `ok`
neste caso significa execução concluída, não sucesso HTTP ou financeiro.

O rollback para a versão anterior ficou ativo a 100% no deployment
`0698a29c-6021-4f98-a627-2a68025a7185`. Na retomada, `/` e `/login` responderam
307/200; captura temporária de `wrangler tail` durante oito GETs anônimos
confirmou oito respostas normais, sem exceções ou logs de aplicação. Somente
metadados permitidos foram emitidos; headers, cookies e logs brutos excluídos.

## Reprodução isolada

Foi compilado o HEAD `7952dfa` em arquivo temporário, sem arquivos locais de
ambiente, com chave pública de teste. O bundle foi executado em workerd local,
com bindings sintéticos e provedor HTTP somente em 127.0.0.1. Nenhum banco foi
configurado; nenhum serviço de autenticação real recebeu chamadas.

Oito GETs do bundle original, sem cookie, demonstraram:

| Resposta sintética do provedor | Raiz | Login | Consultas ao provedor por GET |
| --- | --- | --- | --- |
| 200 com sessão nula | 307 | 200 | 1 |
| 429 | 500 | 500 | 1 |
| 503 | 500 | 500 | 1 |
| 200 após recuperação | 307 | 200 | 1 |

Mecanismo comprovado: o SDK instalado faz uma consulta remota de sessão mesmo
sem token. O resolver converte a falha em `AuthSessionUnavailableError`; o
erro lançado durante `beforeLoad` produz 500 no HTML, apesar de `statusCode: 503`
no erro de domínio. A indisponibilidade não vira sessão anônima nem acesso.

**Limite do diagnóstico:** não há status/erro upstream nos registros históricos.
429, indisponibilidade e transporte são hipóteses reproduzíveis, não causas
históricas confirmadas. Não afirmar incidente do Neon, throttling específico,
falha do banco ou regressão do último deploy sem evidência adicional.

## Correção limitada e instrumentação

`readTanStackNeonSession` usa o nome e o parser públicos do SDK para detectar
token de sessão não vazio. Sem token, retorna sessão nula localmente; com
token, mantém o SDK, sua validação e a consulta de acesso Cacau. Não cria
sessão, cache global, retry de escrita ou interpretação de token como permissão.
Cookie de dados em cache isolado, nomes parecidos e token vazio não autorizam.

Logger explícito para a consulta de sessão emite somente:

```json
{"event":"auth.session.provider","stage":"http_error","status":503,"code":null}
```

Stages: `http_error`, `transport_error` ou `unexpected`. Status permitido:
inteiro 400–599, exceto 401 normal; código limitado aos sete `NETWORK_*` do SDK.
Não serializa mensagem recebida, URL, host, path, identidade, cookie, objeto de
erro ou body. Os logs ficam correlacionados à invocação pelo Cloudflare.
Outras operações de autenticação não entram neste logger. Isso não implementa
notificação automática ao Dono.

As falhas com token continuam fechadas; o tratamento UX/HTTP 503 para sessões
presentes exige revisão separada. A correção torna a entrada anônima independente
da disponibilidade do provedor, sem prometer autenticação durante uma queda.

## Verificação e publicação

Cinco novos testes exercitam o SDK instalado: visitante sem token, nomes
semelhantes/cache sem token, validação e revogação, falha HTTP/transporte,
recuperação por 401 e sanitização. Passaram 556 testes Node, lint, tipos, formato
e Knip (quatro referências contextuais existentes, zero novas). No bundle
corrigido, 16 casos runtime passaram: zero chamadas remotas sem token mesmo
com 429/503; validação obrigatória com token e quatro eventos sanitizados
429/503 conferidos. O provedor voltou a 200 e as páginas recuperaram normalmente.
O build HML isolado do SHA `3f0ba59` passou; o smoke público de navegador
também passou (redirecionamento, login e recuperação). CI 39458289653,
negócio/browser 39458289627, migrations 39458297440 e evidência 39458297385
passaram. CodeQL 39458289645: três análises sem resultados e zero alertas.

Publicado somente no HML às 16:34:55 UTC: versão
`e2aba61f-ca72-4459-a0d7-95867cdb2e67`, deployment
`846b959a-1c69-4508-83bd-c823a6d8ce3a`, 100% de tráfego. Primeiro GET público
conferiu raiz 307/login 200; captura curta posterior registrada no recibo. Não
houve alteração de banco, secrets, configuração do Worker principal ou fatos
fictícios compartilhados. Servidores do laboratório encerrados. Aceite de
sessão autenticada permanece separado; GET anônimo não o comprova.

Recibo: [investigação sanitizada](../../evidence/hml-session-incident-2026-10-20.json).
Estado atual e pendências somente no [roadmap](ROADMAP-CODEX.md).
