# Investigação do login do piloto — 26/10/2026

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

## Diagnóstico mínimo preparado

O logger anterior observava somente `/get-session`; descartava o status do
login por senha. A alteração estende a lista de operações permitidas para
`/sign-in/email`, registrando apenas evento, etapa, status HTTP 400–599 e código
de transporte conhecido. HTTP 401 de sessão anônima continua silencioso.

Testes exercitam a integração do SDK com HTTP 401/403/429/503 e falha de rede,
incluindo a exclusão de mensagem, identidade, senha, token, cookie, host e
metadados arbitrários. Nenhuma resposta bruta do provedor é registrada.

A mudança preserva autenticação, perfis, mensagens públicas e limites. Não há
migration, reset de senha, liberação de conta ou alteração de dados de negócio.
Após revisão/CI e publicação somente no piloto, uma tentativa do usuário será
necessária para correlacionar o status real e orientar a correção.

Validação local: 629 testes Node aprovados, incluindo os sete casos do adaptador
de sessão/provedor; lint, tipos e formato aprovados. Knip mantém quatro achados
conhecidos, sem novo achado. Build isolado e CI/CodeQL ainda pendentes.

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
