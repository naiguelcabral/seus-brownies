# Investigação do HTTP 500 no HML — 20/10/2026

## Fatos observados

A versão anterior `f0c2e0e2-8798-4132-9abc-50c87bf7a973` já registrava seis
respostas 500 entre 00:01:11 e 00:02:56 UTC de20/10, antes da publicação
`cf14fc9a-ffdb-4b6f-8b89-1da6635dfa46` às14:01:57 UTC. Dois desses eventos
eram na raiz. Portanto, o problema não nasceu com a alteração de consultas
transacionais. Isso não comprova que todos os 500 tiveram a mesma causa.

Entre14:00 e14:10 UTC, a consulta retornou12 eventos: sete da versão nova
(quatro500 e três respostas normais) e cinco da anterior (dois500 e três
normais), incluindo os dois500 logo após o rollback. Todos tinham outcome
`ok`, sem eventos adicionais de console/exception nessa janela. Outcome `ok`+neste caso significa execução concluída, não sucesso HTTP ou financeiro.

O rollback para a versão anterior ficou ativo a100% no deployment
`0698a29c-6021-4f98-a627-2a68025a7185`. Na retomada, `/` e `/login` responderam
307/200; captura temporária de `wrangler tail` durante oito GETs anônimos
confirmou oito respostas normais, sem exceções ou logs de aplicação. Somente
metadados permitidos foram emitidos; headers, cookies e logs brutos excluídos.

## Reprodução isolada

Foi compilado o HEAD `7952dfa` em arquivo temporário, sem arquivos locais de
ambiente, com chave pública de teste. O bundle foi executado em workerd local,
com bindings sintéticos e provedor HTTP somente em127.0.0.1. Nenhum banco foi
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
erro lançado durante `beforeLoad` produz500 no HTML, apesar de `statusCode503`
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
inteiro400–599, exceto401 normal; código limitado aos sete `NETWORK_*` do SDK.
Não serializa mensagem recebida, URL, host, path, identidade, cookie, objeto de
erro ou body. Os logs ficam correlacionados à invocação pelo Cloudflare.
Outras operações de autenticação não entram neste logger. Isso não implementa
notificação automática ao Dono.

As falhas com token continuam fechadas; o tratamento UX/HTTP503 para sessões
presentes exige revisão separada. A correção torna a entrada anônima independente
da disponibilidade do provedor, sem prometer autenticação durante uma queda.

## Verificação e publicação

Cinco novos testes exercitam o SDK instalado: visitante sem token, nomes
semelhantes/cache sem token, validação e revogação, falha HTTP/transporte,
recuperação por401 e sanitização. Passaram556 testes Node, lint, tipos, formato
e Knip (quatro referências contextuais existentes, zero novas). No bundle
corrigido,16 casos runtime passaram: zero chamadas remotas sem token mesmo
com429/503; validação obrigatória com token e quatro eventos sanitizados
429/503 conferidos. O provedor voltou a200 e as páginas recuperaram normalmente.
O build isolado passou. A CI e a publicação serão conferidas no SHA versionado
antes de declarar o incremento estável.

Recibo: [investigação sanitizada](../../evidence/hml-session-incident-2026-10-20.json).
Estado atual e pendências somente no [roadmap](ROADMAP-CODEX.md).
