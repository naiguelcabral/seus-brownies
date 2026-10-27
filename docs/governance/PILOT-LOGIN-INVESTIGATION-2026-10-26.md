# Investigação do login do piloto — 26/10/2026

## Retomada e publicação do código da recusa — 27/10/2026

Franquia oficial renovada a 100%, árvore limpa e HEAD final da PR #82
`eed552c5d8efe677779bb0df521026fea63cf4fe` reconferido. Os 12 checks passaram;
três análises CodeQL da candidata `2b9e9a896a5ada75d423951a15e3eff833c9f46e`
sem resultados/erros/avisos, zero alertas e nenhuma thread de revisão.

Integração em `1d0218e11b1b2e23d534b30eb83e70eaf96c11f0`. Os três workflows
da main passaram: CI `40446153616`, CodeQL `40446153596`, negócio/navegador
`40446153547`; três análises reais da main também sem resultados/erros/avisos,
zero alertas. Qualidade/build isolado e 632 testes locais já aprovados.

Publicação somente em `cacau-v1-piloto`, às
`2026-10-27T03:50:51.494365Z` (00:50 Brasília), versão
`0814fb16-3da0-4f71-bcee-9ab746cb1eb0`, deployment
`cac81a0b-cf7e-4c4a-8ba0-67ed4b08fe87`, 100%. Os seis nomes de secrets,
três limitadores e redação de query foram conferidos. Raiz307/login200/reset200,
`no-store`, `no-referrer` e CSP report-only presentes; faixa do piloto nas
páginas Auth. Nenhum novo reset ou alteração de perfil/banco.

Não havia cooldown ativo na leitura anterior à publicação. Solicitada uma
tentativa em janela privada com a última senha redefinida, seguida da
correlação de `auth.login.rejection`. Login ainda sem aceite; o diagnóstico
publicado não comprova a causa nem resolve por si a recusa.
[Recibo estruturado](../../evidence/pilot-login-code-publication-2026-10-27.json).

## Persistência após recuperação e fim do primeiro cooldown

Às `2026-10-27T00:47:18.612Z` (21:47 Brasília), nova tentativa alcançou
o Auth e recebeu HTTP 401. A auditoria registrou `provider_rejected` às
00:47:18.626Z; outra tentativa às 00:47:32.405Z encontrou novo cooldown,
até `2026-10-27T01:02:18.683Z` (22:02:18 Brasília).

O usuário confirmou digitação manual da nova senha. Comparações somente de
leitura confirmaram que a solicitação de recuperação e o login correspondem
à mesma identidade, assim como o destinatário da conclusão e a conta informada.
Há um único vínculo de credencial, vinculado corretamente, atualizado às
00:25:03.404Z; senha definida, e-mail verificado e conta sem banimento.
Foram consultados apenas indicadores de presença e correspondência, sem
retornar senha ou hash de credencial. O Auth anterior mantém sua atualização
de credencial em 22/10. A tentativa atingiu o provedor após o guard que exige
Turnstile; replay real continua sem comprovação.

Preparado complemento mínimo de telemetria para registrar somente o código
normalizado do SDK dentro de uma lista fixa (`invalid_credentials`, `bad_jwt`
e demais categorias previstas). Código desconhecido vira `unclassified`.
Não registrar mensagem, resposta, identidade ou credencial. Falha desse
diagnóstico não altera o resultado público nem a auditoria. Confirmar
CI/CodeQL e publicação somente no piloto antes de solicitar nova tentativa.
O incidente continua aberto; repetir reset ou conceder papel não é correção
comprovada para a recusa persistente.

## Nova tentativa correlacionada — 21:21 Brasília

O usuário relatou que o verificador apareceu, mas a entrada não foi concluída.
Na versão publicada `62efd08b`, a telemetria capturou `auth.login.provider`,
etapa `http_error`, HTTP **401**, às `2026-10-27T00:21:14.862Z`.
A auditoria registrou `login/failure/provider_rejected` às 00:21:14.943Z
e `login/blocked/login_cooldown` às 00:21:21.916Z.

Leitura agregada confirmou um cooldown ativo, com término às
`2026-10-27T00:36:15.010Z` (21:36:15 de 26/10 em Brasília). A política
vigente bloqueia novas tentativas por 15 minutos após cinco falhas consecutivas.
Esse bloqueio é avaliado antes do Siteverify: a presença do widget não comprova
validação bem-sucedida nem replay do Turnstile nesta tentativa.

Está comprovada a recusa HTTP do provedor seguida da proteção temporária.
Não há base para atribuir a recusa a DNS, indisponibilidade ou ao widget, nem
para afirmar qual diferença nas credenciais a causou. Nenhuma senha foi lida.

Orientado o uso de **Esqueci a senha** pelo próprio usuário no piloto e uma
tentativa após 21:37 Brasília, com a senha redefinida. As cópias Auth são
independentes, conforme o [contrato de branching do Neon Auth](https://neon.com/docs/auth/branching-authentication);
a recuperação do piloto não altera a senha no endereço anterior.
O usuário confirmou recebimento e redefinição, com auditoria de solicitação
bem-sucedida às `2026-10-27T00:24:29.544Z` e conclusão bem-sucedida às
`2026-10-27T00:25:03.425Z`. Quatro tentativas seguintes, entre 00:25:20 e
00:25:50Z, foram bloqueadas por `login_cooldown`, sem nova recusa do Auth:
a nova senha ainda não chegou ao provedor para validação. Orientado aguardar
21:37 Brasília antes de tentar uma vez. Login autenticado continua pendente.
Nenhum reset foi disparado pelo agente, contador removido ou proteção afrouxada.

## Ocorrência e evidências

Após a publicação, o usuário relatou a mensagem genérica de credenciais e
confirmou que a mesma conta entrava no endereço anterior. O aceite autenticado
do piloto continua pendente; o smoke público não validou senha nem sessão real.

- Auditoria operacional registrou `login/failure/provider_rejected` às
  22:59:19.725Z e 23:00:20.652Z. A persistência desses eventos funciona.
- Consulta somente de leitura confirmou a identidade nas duas cópias Auth:
  cadastro verificado, sem bloqueio, com credencial de senha. O vínculo
  operacional do piloto está ativo. Nenhuma credencial ou hash foi consultado.
- A configuração inclui a origem pública do piloto. Diagnóstico booleano no
  próprio Worker confirmou que o destino Auth efetivo é o esperado.
- Sonda negativa com identidade sintética inexistente recebeu HTTP 401;
  comprova resposta do endpoint, sem validar a credencial real do usuário.
- Os erros ociosos de pool observados não explicam por si sós a recusa do
  provedor; a causa do login ainda não foi determinada.

## Diagnóstico mínimo publicado

O logger anterior observava somente `/get-session`; descartava o status do
login por senha. A alteração estende a lista de operações permitidas para
`/sign-in/email`, registrando apenas evento, etapa, status HTTP 400–599 e código
de transporte conhecido. HTTP 401 de sessão anônima continua silencioso.

Testes exercitam a integração do SDK com HTTP 401/403/429/503 e falha de rede,
incluindo a exclusão de mensagem, identidade, senha, token, cookie, host e
metadados arbitrários. Nenhuma resposta bruta do provedor é registrada.

A mudança preserva autenticação, perfis, mensagens públicas e limites. Não há
migration, reset de senha, liberação de conta ou alteração de dados de negócio.
Uma tentativa do usuário foi solicitada para correlacionar o status real e
orientar a correção. A publicação do diagnóstico não encerra o incidente.

Validação local: 629 testes Node aprovados, incluindo os sete casos do adaptador
de sessão/provedor; lint, tipos e formato aprovados. Knip mantém quatro achados
conhecidos, sem novo achado. Build isolado do piloto aprovado.

PR [#80](https://github.com/naiguelcabral/seus-brownies/pull/80), HEAD
`057bc9f24f5fd351b2718c9c5cf6371d672361ce`, integrada em
`8261f5e01170c6f5ea3b8a94bdfccefd5776f040` após 12 checks aprovados. As três
análises CodeQL da PR e da main têm zero resultados/erros/avisos e nenhum
alerta aberto. Os três workflows da main também passaram:

- [CI](https://github.com/naiguelcabral/seus-brownies/actions/runs/40420128028).
- [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/40420128020).
- [Negócio e navegador isolados](https://github.com/naiguelcabral/seus-brownies/actions/runs/40420127998).

Publicação somente em `cacau-v1-piloto`, às `2026-10-26T23:32:35.32084Z`
(20:32 Brasília), versão `62efd08b-496b-4868-abe1-9ec10513cfdb`, deployment
`411c73d8-7f8b-49e9-b549-fd55e3c256dd`, 100%. Os seis nomes de secrets foram
relidos e não há binding temporário de diagnóstico do destino. GETs públicos:
raiz307, login200, redefinição200, `no-store` e `no-referrer`; páginas com faixa
do piloto. CSP em report-only e demais headers de proteção presentes.
Essas leituras não validam login autenticado.

Fonte e resultados resumidos no [recibo](../../evidence/pilot-login-diagnostic-2026-10-26.json).

## Limpeza da configuração temporária

Os três bindings de diagnóstico booleano foram removidos após a confirmação;
os seis nomes de secrets originais foram conferidos. O uso combinado de nome
e ambiente pelo CLI criou um Worker temporário com sufixo adicional, contendo
somente os três bindings de diagnóstico. O alvo foi corrigido e esse recurso
temporário removido, sem dados de negócio.

Após a limpeza, a versão de configuração do piloto é
`cc4e0d5a-4da2-417a-b01c-e3a574576637`, deployment
`bad003a3-cf75-45f1-b69d-d13f0750c028`, 100%, ainda com o código de aplicação
`53e410e`. A publicação original permanece registrada no
[recibo](PILOT-PUBLICATION-2026-10-26.md).

Não registrar neste documento e-mail, identificador pessoal, endpoint privado,
segredo, senha, hash de credencial ou conteúdo de sessão.
