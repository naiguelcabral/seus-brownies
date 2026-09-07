# G1 — Diagnóstico do gatilho do Turnstile

Atualizado em 7 de setembro de 2026. O diagnóstico foi estático, sobre código
versionado, testes e documentação; após aprovação humana, houve apenas a
correção local descrita abaixo. Não houve navegador, requisição HML,
Cloudflare, Neon, banco, token ou credencial.

## Conclusão e correção aprovada

O comportamento observado — repetidas senhas incorretas em HML sem widget — é
compatível com uma divergência confirmada entre dois controles independentes:

1. na **quinta falha de credencial**, o contador durável grava o cooldown, mas
   a resposta de login não inclui `requiresChallenge`;
2. o widget só é solicitado ao cliente quando o **limitador local em memória**
   bloqueia uma requisição posterior, o que ocorre na sexta chamada no mesmo
   isolate;
3. se a chamada seguinte cair em outro isolate, esse contador local volta a
   zero, enquanto o cooldown durável ainda bloqueia o login sem informar ao
   cliente que o desafio é obrigatório.

Assim, o código anterior não comprovava que o widget deveria aparecer na
própria quinta tentativa. O documento histórico que afirma isso resumia a
intenção do controle, mas não correspondia ao contrato HTTP/UI implementado.

Após aprovação humana, a correção local preserva a decisão durável até o
handler: tanto a quinta falha recém-gravada quanto uma negação durante cooldown
retornam `requiresChallenge: true`. A UI passa a solicitar o widget sem
depender de a sexta chamada chegar ao mesmo isolate. A integração HML, token
válido e replay continuam não homologados.

## Fluxo comprovado por código

### Limite local e desafio

`src/features/auth/auth-rate-limit.ts` define para `login` `limit: 5` e janela
de 15 minutos. `createInMemoryAuthRateLimiter()` cria buckets por
`scope:opaqueIdentity`, onde `opaqueIdentity` é HMAC de escopo e e-mail em
`auth-rate-limit.server.ts`.

- Chamadas 1 a 5 do mesmo bucket são permitidas pelo limitador local.
- A chamada 6, ainda dentro da janela e no mesmo isolate, encontra `count >=
5`, retorna `allowed: false` e `requiresChallenge: true`.
- Um token só é verificado nesse último ramo. Sem secret ou token, a operação
  falha fechada e mantém `requiresChallenge: true`.
- Ao fim da janela, a próxima chamada cria bucket com contagem 1. Sucesso de
  login não zera esse bucket; scopes diferentes também não o compartilham.

Portanto, para o limitador local, o desafio começa **na sexta requisição**, não
na quinta. A contagem é de chamadas públicas protegidas, não de falhas de
senha: ela é consumida antes de o provedor de autenticação ser chamado.

### Contador durável e cooldown

`src/features/auth/login-security.ts` define
`maxConsecutiveLoginFailures = 5`. Após uma falha do provedor,
`login-attempts.server.ts` incrementa `auth_login_attempts` e, ao atingir 5,
grava `cooldown_until` por 15 minutos. Um login bem-sucedido zera contador e
cooldown; indisponibilidade do provedor não é gravada. Durante cooldown,
`isLoginAttemptAllowed()` impede a chamada ao provedor e preserva o estado.

Após o fim do cooldown, uma nova tentativa pode chegar ao provedor; se falhar,
o contador durável é incrementado novamente e o cooldown é reiniciado. Não há
reset automático da contagem pelo decurso do cooldown.

Anteriormente, embora `decideLoginAttempt()` calculasse
`requiresChallenge: true` na quinta falha e durante cooldown,
`isLoginAttemptAllowed()` retornava apenas `allowed`. A correção introduziu
`evaluateLoginAttempt()`, que preserva a decisão para o handler. O handler
agora devolve esse sinal em cooldown e calcula o sinal após gravar uma falha;
assim, a quinta falha também ativa o desafio na resposta ao cliente.

### Servidor para cliente

1. `loginWithEmailPassword` chama `protectPublicAuthAction()` antes do Neon
   Auth e do store durável.
2. Se a proteção local ou a avaliação durável negar a tentativa, o handler
   responde com seu respectivo `requiresChallenge`.
3. Uma falha comum antes da quinta ainda retorna somente `ok: false` e
   `invalidLoginMessage`; a quinta falha e o cooldown retornam também
   `requiresChallenge: true`.
4. Em `src/routes/login.tsx`, `captureChallenge()` só marca o estado quando o
   campo da resposta é exatamente `true`. Uma falha comum de senha, portanto,
   não mostra widget.
5. `TurnstileChallenge` só renderiza conteúdo quando esse estado está ativo.
   Com site key ausente, vazia ou só com espaços, ele mostra a mensagem de
   indisponibilidade e mantém o botão bloqueado; não há bypass. Com site key
   presente, carrega o script Turnstile e só libera o envio depois do callback
   fornecer token. Falha/expiração do widget limpa o token.

## Explicação da divergência em HML

O `limiter` de `auth-rate-limit.server.ts` é singleton de módulo, mas apenas
por isolate. Cloudflare pode encaminhar requisições consecutivas a isolates
diferentes ou descartar o isolate entre elas. Antes da correção, isso permitia
que a sexta chamada em isolate novo fosse negada pelo store durável sem
`requiresChallenge`. A correção local elimina essa omissão no contrato de
resposta; somente uma homologação HML pode confirmar o comportamento publicado.

Também é possível que tentativas tenham cruzado a janela local de 15 minutos,
ou não pertencido ao mesmo bucket HMAC de `login`; ambos reiniciam/separam a
contagem local. O diagnóstico não verifica isso em HML e não atribui a causa a
uma tentativa específica.

`AUTH_RATE_LIMITER` distribuído não está configurado em HML segundo a
documentação canônica. Sua ausência não muda diretamente o contrato atual do
widget, mas remove o único controle volumétrico compartilhado entre isolates;
o banco continua sendo fonte durável apenas para cooldown de login.

## Estado das evidências

| Afirmação                                                                 | Estado                | Base                                                                                         |
| ------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| A sexta chamada no mesmo isolate exige desafio pelo limitador local.      | Comprovado localmente | `auth-rate-limit.ts` e `auth-rate-limit.test.ts`.                                            |
| A quinta falha de credencial grava cooldown durável de 15 minutos.        | Comprovado localmente | `login-security.ts`, `login-attempts.server.ts` e `auth-login-security.test.ts`.             |
| A versão anterior omitiria `requiresChallenge` no cooldown durável.       | Comprovado localmente | Diagnóstico do diff anterior em `functions.ts`; corrigido localmente neste pacote.           |
| A correção devolve o sinal no cooldown e na quinta falha.                 | Comprovado localmente | Caminho do handler revisado; `auth-login-security.test.ts` cobre a decisão preservada.       |
| Essa omissão explica as tentativas HML observadas.                        | Hipótese forte        | É compatível com o fluxo; esta investigação não fez rede nem leu estado HML.                 |
| A site key publicada estava ausente, vazia ou indisponível no bundle HML. | Depende de HML        | O código trata esse caso; nenhuma inspeção de bundle/navegador foi feita.                    |
| Um limitador distribuído corrigirá o sinal cliente do cooldown.           | Hipótese              | Ele melhora consistência entre isolates, mas não propaga `requiresChallenge` do store atual. |
| Token válido e replay são rejeitados corretamente em HML.                 | Depende de HML        | Não há homologação integrada executada.                                                      |

## Estratégia de teste e lacuna A05

`e2e/auth-hml-non-destructive.spec.ts` (A05) cobre navegação, login e negações
por papel com identidades humanas fornecidas em runtime. Ela não tem caso de
Turnstile, token válido, token inválido ou replay; tampouco captura token ou
controla uma conta exclusiva para produzir o limiar. Seus casos sensíveis são
deliberadamente `fixme` e a configuração só permite execução mediante opt-in
humano.

Para validar token válido e replay sem expor token nem depender de várias
tentativas na conta operacional, ainda faltam: uma identidade HML exclusiva e
pré-aprovada, um mecanismo humano aprovado para submeter uma única vez o token
em memória e tentar sua reutilização sem registrá-lo, e uma forma de observar
somente resultado sanitizado. Este pacote não cria workaround, automação de
navegador ou captura de token.

## Recomendação mínima e critérios para nova A07

Antes de uma nova tentativa A07, exigir decisão humana para:

1. revisar esta correção local antes de publicação; a nova A07 deve verificar
   que quinta falha e cooldown devolvem o sinal para a UI, sem depender de
   afinidade de isolate;
2. aprovar uma identidade HML exclusiva, sem papel operacional, e uma janela
   que permita o cooldown sem afetar conta de operação;
3. habilitar navegador e operador humano para resolver o CAPTCHA, sem gravar
   token, credencial, cookie, trace, vídeo ou screenshot;
4. definir o mecanismo de replay em memória e a evidência sanitizada aceitável
   antes de gerar o token; e
5. decidir o namespace e a política de `AUTH_RATE_LIMITER` distribuído, ou
   registrar que a tentativa não afirma consistência entre isolates.

Sem esses critérios, A07 permanece bloqueada. A recomendação de próximo pacote
é revisar e publicar esta pequena correção separadamente; só depois a
homologação integrada poderá comprovar o comportamento determinístico.
