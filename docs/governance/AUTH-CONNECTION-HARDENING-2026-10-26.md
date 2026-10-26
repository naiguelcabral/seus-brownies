# Continuidade local de Auth e conexões — 25–26/10/2026

Após a integração da PR #72 em `f2a7fc7`, o Dono respondeu “Pode seguir” à
sequência A04/A07/A08, evidências e homologação. Esta rodada prepara a próxima
PR de código local. Não executa publicação, SQL compartilhado, concessão de
papel, alteração de secrets nem decisão externa. O checkpoint de código é
`b4ae5cb`; merge desta nova PR conserva sua revisão concreta.

## A07 — ownership e fechamento

- Um middleware global de Server Functions abre um contexto assíncrono por
  operação. O pool só nasce no primeiro acesso; chamadas aninhadas reaproveitam
  o contexto. Operações concorrentes recebem contextos independentes.
- `getDb()` fora do contexto ou após seu fechamento falha explicitamente.
  O handler deve aguardar todo trabalho de banco antes de retornar; não entregar
  consultas pendentes em streams, timers ou tarefas de fundo.
- O pool tem até duas conexões por operação, espera de conexão de 5 s,
  inatividade de 1 s e prazo de consulta no cliente de 20 s. Transações
  configuram `statement_timeout` e `idle_in_transaction_session_timeout` de
  15 s com `SET LOCAL`, na mesma conexão transacional. Os parâmetros de sessão
  não são enviados no startup, para preservar compatibilidade com PgBouncer.
- O fechamento é aguardado em `finally`, também quando o handler falha.
  Falhas ao fechar rejeitam a operação. Erros de clientes ociosos geram apenas
  um evento fixo, sem mensagem do driver, SQL ou endereço de conexão.
- Drizzle, `pg`, Neon, transações e regras de negócio permanecem. Não há retry
  automático de escrita nem mudança de transporte ou de provedor. O wrapper do
  backfill histórico apenas explicita o contexto; o backfill não foi executado.
- O laboratório conectado usa a mesma fábrica de conexão da aplicação, em vez
  de substituir seu lifecycle por um pool global. Confere limite de conexões,
  timeouts locais, rollback e ausência de conexões da operação após HTTP/UI.

Referências: [pg.Pool](https://node-postgres.com/apis/pool),
[erros de startup Neon](https://neon.com/docs/connect/connection-errors) e
[AsyncLocalStorage em Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/).
Timeout do cliente não equivale a comprovante de cancelamento de uma escrita
remota; idempotência e reconciliação de resultado incerto continuam obrigatórias.

## A04 — correlação sem autoria presumida

Login, verificação de e-mail e pedido de recuperação podem gravar
`metadata.subjectHash`: HMAC-SHA256 do e-mail normalizado, com domínio
`audit-subject`, separado das chaves do limitador. Usa o pepper já existente;
rotacioná-lo muda a correlação. Só aceita 64 caracteres hexadecimais minúsculos.
Esse pseudônimo não é identidade verificada nem declaração de anonimização.
Não é enviado à telemetria pública. Histórico permanece intacto.

Login em cooldown ou negado pela proteção registra `blocked`, motivo fixo,
request ID e pseudônimo, sem chamar o provedor. O ator/alvo em sucesso continua
restrito ao ID retornado pelo provedor. Pedido de recuperação conserva os
eventos anterior e posterior ao provedor com o mesmo request ID e pseudônimo,
sem e-mail bruto, senha, OTP ou token.

Continuam pendentes autoria de concessões futuras/bootstrap e correlação da
conclusão do reset com identidade confiável do provedor. O token de reset não
é convertido em identidade nem em pseudônimo de auditoria.

## A08 — orçamento anterior ao banco e desafio contextual

As seis Server Functions públicas de credenciais, OTP e recuperação aplicam
orçamento antes do handler. Com `AUTH_RATE_LIMITER_REQUIRED=true`, ausência de
pepper, origem confiável, bindings ou falha da plataforma nega a chamada com
429. A origem vem de `CF-Connecting-IP` somente quando a Request tem metadados
`cf` do runtime; `X-Forwarded-For` e headers isolados não estabelecem confiança.
O endereço só participa de uma chave HMAC temporária, sem persistência em SQL.

Configuração candidata: 60 chamadas/minuto por origem e 600/minuto agregadas,
compartilhadas entre as seis superfícies **por localidade Cloudflare**. Contadores
são aproximados e eventualmente consistentes, não uma quota mundial estrita.
Namespaces são distintos entre os três bindings e entre HML/principal.
O desafio não ultrapassa esses orçamentos. O limite por identidade e as cinco
falhas consecutivas continuam. NAT/rede móvel pode reunir usuários na mesma
origem; avaliar o comportamento e os limites na homologação.

Siteverify exige sucesso, hostname exato da origem de recuperação configurada
e ação exata do fluxo. O hostname não vem do Host enviado pelo cliente.
O widget emite as ações login, sign-up, verification-otp, password-reset e
password-reset-completion. Timeout de 10 s, expiração/replay do provedor e
negação em resposta inválida permanecem. Nenhum widget ou secret foi alterado.

Referências: [validação Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
e [limites/localidade/precisão](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
Os contratos dos bindings foram conferidos nos tipos Workers `5.20261025.1`,
sem mudar as dependências do projeto.

## Validação e gates

614 testes Node passaram. Typecheck, lint e formato passaram; Knip conserva
quatro achados contextuais e nenhum novo. Build CI isolado e os 12 cenários
HTTP/UI/PostgreSQL 17 passaram em `b4ae5cb`, incluindo os novos probes de
timeout, rollback e ausência de conexões após o laboratório. O container foi
encerrado. CI, CodeQL e revisão da candidata são conferidos por SHA no estado
da PR; este registro não presume integração nem publicação.

Publicação HML deve conferir bindings, origem configurada, conexão/fechamento,
desafio real, replay e fluxos em rede móvel. A revisão deste código não encerra
aceites H01–H03, sustentação A01/A03, concessões A04 ou política de dados L06.
