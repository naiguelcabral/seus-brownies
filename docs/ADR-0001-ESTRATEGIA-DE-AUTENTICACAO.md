# ADR-0001 — Estratégia de autenticação e acesso da Fase G1

- **Status:** aceito — implementação reversível da G1 autorizada
- **Data:** 2026-09-03
- **Escopo:** identidade, sessão, RBAC, recuperação de senha, proteção contra
  abuso e auditoria. A estrutura local e a migration HML autorizada foram
  concluídas; não autoriza gravar secrets, configurar serviços externos, criar
  usuário/Admin, deploy ou produção.

## Contexto

O Cacau v1 é um painel operacional em TanStack Start, hospedado em Cloudflare
Workers e conectado a PostgreSQL/Neon por Server Functions. Não há autenticação
ou dependência de identidade instalada. As Server Functions atuais executam
leitura e mutações de catálogo, estoque, produção, vendas, despesas e FIFO sem
um principal autenticado.

`docs/ACESSO-E-ITENS-FUTUROS.md` registra a direção histórica de sessão no
contexto do TanStack Start e autorização no servidor. A governança canônica
agora prevalece: `SECURITY.md` define os controles mínimos, e
`ROADMAP-CODEX.md` estabelece os cinco perfis iniciais **Admin**, **Gestor**,
**Produção**, **Venda** e **Consulta**, sujeitos a validação humana. Esta ADR
detalha a proposta técnica sem substituir essas fontes.

## Requisitos de G1

- Sessão por cookie `HttpOnly`, `Secure` em HTTPS e `SameSite=Lax` ou política
  mais restritiva compatível com os fluxos aprovados.
- Identidade verificada por e-mail; criação pública de conta desabilitada no
  primeiro lançamento. Convites ou bootstrap de administrador exigem fluxo
  separado e auditável.
- Perfis canônicos de RBAC: **Admin**, **Gestor**, **Produção**, **Venda** e
  **Consulta**. O papel nunca vem do navegador; cada Server Function de
  mutação exige permissão no servidor.
- Recuperação de senha por token de uso único, expiração curta, resposta que
  não enumera e-mails e revogação das demais sessões após redefinição.
- Máximo de cinco falhas consecutivas de autenticação por identidade no período
  definido; desafio adicional antes do bloqueio definitivo e registro de cada
  resultado relevante.
- Rate limiting por camada, CAPTCHA/desafio validado no servidor e trilha de
  auditoria sem senha, token de sessão ou segredo.

## Alternativas avaliadas

| Alternativa                                      | Vantagens                                                                                                                                                                | Limitações                                                                                                                        | Decisão                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Neon Auth gerenciado, baseado em Better Auth** | Estado de identidade, sessões, organizações e JWKS no Neon; dados ramificam junto com o banco; integra os recursos de e-mail/senha, redefinição e extensões Better Auth. | Exige provisionamento e validação da integração Worker/TanStack; depende da configuração gerenciada e de e-mail transacional.     | **Recomendada**                                                |
| Better Auth diretamente no banco da aplicação    | Controle total de schema, rotas e armazenamento; compatibilidade documentada com TanStack Start e Cloudflare Workers.                                                    | Introduz dependência, schema/migration, secret e operação própria de autenticação; duplica o que Neon Auth gerenciado já oferece. | Contingência se Neon Auth não atender aos controles aprovados. |
| Cloudflare Access                                | Perímetro forte para equipe interna e integração com IdP corporativo.                                                                                                    | Não resolve por si só contas do Cacau, recuperação de senha, auditoria de negócio ou RBAC dentro das Server Functions.            | Complemento administrativo, não solução principal.             |
| Identidade própria com hash/sessões manuais      | Máxima liberdade.                                                                                                                                                        | Maior superfície de segurança, criptografia, recuperação, revogação e manutenção.                                                 | Rejeitada.                                                     |
| IdP externo genérico                             | Pode oferecer recursos maduros de identidade.                                                                                                                            | Cria outro sistema de usuários, custos e sincronização sem benefício claro para o painel atual.                                   | Não priorizada.                                                |

## Decisão proposta

Adotar **Neon Auth gerenciado, baseado em Better Auth, como provedor de
identidade e sessão**, e manter **RBAC e auditoria como dados e regras da
aplicação Cacau**.

O schema gerenciado `neon_auth` pertence ao provedor e não será criado,
alterado ou migrado pelo Cacau. A migration local `0014_puzzling_masque.sql`
cria somente o vínculo de acesso, o estado durável de abuso e a auditoria do
Cacau; ela foi aplicada somente no branch Neon HML autorizado. O SDK escolhido
para a estrutura é `@neondatabase/neon-js/auth`, cuja camada server exige um
contexto request-scoped compatível com AsyncLocalStorage no Cloudflare Workers.
Nenhum endpoint, secret ou flag de Worker foi configurado por esta ADR.

Em 2026-09-03, os pacotes oficiais avaliados para essa integração
(`@neondatabase/neon-js` e `@neondatabase/auth`) estavam em versão beta. Sob a
aprovação parcial de G1, `@neondatabase/neon-js@0.7.0-beta` foi adicionado
somente para preparação local; o adapter permanece orientado a interface e não
instancia o SDK sem endpoint e secret provisionados. A versão deve ser
reavaliada antes da integração real ou de qualquer atualização de dependência.

O papel da aplicação não deve ser confundido com permissões da conta Neon nem
com papéis de organizações do provedor. Cada identidade autenticada terá um
vínculo próprio de acesso ao Cacau, usando os perfis canônicos **Admin**,
**Gestor**, **Produção**, **Venda** e **Consulta**, com permissões
explicitamente mapeadas por ação.

### Restrição de cadastro no Neon Auth Beta

O painel Neon Auth Beta informa que qualquer pessoa na web pode criar uma
identidade e que cadastros restritos ainda não são suportados. Logo, Neon Auth
não é a allowlist do Cacau. O modelo “somente por convite” é aplicado pelo
vínculo ativo em `app_user_access`: uma identidade autenticada sem esse vínculo,
com vínculo inativo ou com papel inválido falha fechada. Nenhuma Server Function
protegida poderá aceitar apenas `session != null` como autorização.

A proposta detalhada de menor privilégio está em
[`AUTHORIZATION-MATRIX.md`](governance/AUTHORIZATION-MATRIX.md). Ela não
concede permissões automaticamente nem substitui a revisão humana das mutações
operacionais já existentes.

O TanStack Start deve carregar a sessão a partir do cookie em middleware de
requisição e injetar um principal confiável no contexto. Um middleware de
Server Function deve exigir o papel apropriado antes do handler. Rotas SSR e
GETs que exponham dados operacionais também exigirão sessão. Validação Zod não
substitui autorização.

Ao introduzir `src/start.ts`, a implementação deve manter explicitamente o
middleware CSRF do TanStack Start para Server Functions. A sessão e o papel não
podem vir de `sendContext`, cabeçalho definido pelo cliente ou armazenamento do
navegador.

## Proteção contra abuso proposta

1. **Cinco tentativas:** contador durável por identidade normalizada, em janela
   definida pelo gate humano (proposta: 15 minutos). Após cinco falhas, aplicar
   o controle adicional aprovado — por exemplo, desafio e bloqueio temporário
   — e criar evento de auditoria. Não informar se a conta existe.
2. **Rate limiting em camadas:** usar o limite nativo de Cloudflare para
   proteção volumétrica por rota e chave estável; não usá-lo como registro
   contábil da política de cinco tentativas, pois é local por PoP e
   eventualmente consistente. O contador de bloqueio deve ser persistente.
3. **Desafio adicional:** exigir Cloudflare Turnstile no cadastro, redefinição
   e após risco/falhas de login. Validar o token exclusivamente no servidor;
   token de cliente não é prova suficiente.
4. **Recuperação de senha:** token de uso único, expiração proposta de uma hora,
   resposta genérica, revogação de sessões e evento de auditoria em solicitação,
   conclusão e falha. O provedor de e-mail e os domínios de retorno são decisões
   operacionais do gate.
5. **Auditoria:** registrar `actor_id` quando existir, ação, resultado, alvo,
   timestamp, ID de requisição e motivo. Para defesa contra abuso, armazenar
   identificador de rede apenas em forma minimizada/hash com política de
   retenção aprovada. Nunca registrar senha, token de reset, cookie, JWT ou
   segredo.

## Modelo mínimo de permissões

| Área                                          | Admin    | Gestor                                              | Produção                                  | Venda                                   | Consulta                   |
| --------------------------------------------- | -------- | --------------------------------------------------- | ----------------------------------------- | --------------------------------------- | -------------------------- |
| Usuários, papéis e configurações estruturais  | permitir | negar                                               | negar                                     | negar                                   | negar                      |
| Catálogo, preços e relatórios                 | permitir | proposta: gerir e consultar                         | leitura necessária                        | leitura necessária                      | somente leitura autorizada |
| Compras, produção, vendas, despesas e ajustes | permitir | proposta: gerir conforme matriz final               | proposta: produção e leituras necessárias | proposta: vendas e leituras necessárias | negar                      |
| Estoque, FIFO e auditoria                     | permitir | proposta: consultar e aprovar conforme matriz final | leitura necessária                        | leitura necessária                      | somente leitura autorizada |

Os itens marcados como proposta não são autorização de operação. O mapa
definitivo por Server Function deve ser revisado no próximo gate. Em particular,
operações FIFO e toda ação contábil exigem permissão explícita e não podem
depender apenas da ocultação de controles na UI.

## Consequências

- Será necessária uma etapa posterior, autorizada, para gravar os bindings do
  cliente compatível, configurar o endpoint por branch e secrets fora do
  repositório.
- A configuração de compatibilidade do runtime Worker e do SDK só será alterada
  após revisão humana, junto com os secrets e o ambiente de desenvolvimento.
- A migration `0014_puzzling_masque.sql` foi aplicada somente em `g1-auth-hml`
  e não toca o schema gerenciado `neon_auth`.
- A Fase G1 deve criar testes de acesso negativo para cada Server Function de
  mutação e para escopo de leitura operacional.
- A entrega não altera regras de quantidade, custo, origem, motivo, FIFO ou
  fatos HML.
- Até o gate humano, o painel permanece sem autenticação e não deve ser aberto
  a terceiros.

## Decisões aceitas e gates restantes

Estão aceitos para G1: Neon Auth baseado em Better Auth para identidade e
sessão; RBAC próprio do Cacau no servidor; contas inicialmente por convite;
e-mail verificado; cinco falhas consecutivas com auditoria, Turnstile e
cooldown temporário; rate limiting da Cloudflare apenas como camada
volumétrica; recuperação sem enumeração; e rotação ou revogação de sessão
quando aplicável.

Continuam sendo gates humanos antes da integração operacional irreversível:

1. gravação dos secrets HML, origem confiável e callbacks do Neon Auth;
2. contratação/configuração de provedor de e-mail, remetente e domínios de
   retorno;
3. configuração de Turnstile e rate limiting de HML;
4. bootstrap auditado do primeiro Admin de homologação;
5. retenção, minimização e acesso aos eventos de auditoria de autenticação.

Os nomes, locais e ordem segura dessas configurações estão em
[`G1-EXTERNAL-CONFIGURATION.md`](governance/G1-EXTERNAL-CONFIGURATION.md).

## Referências técnicas

- [Middleware e CSRF do TanStack Start](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [Neon Auth branchable, baseado em Better Auth](https://neon.com/docs/changelog/2025-12-12)
- [Neon Auth e dados de identidade por branch](https://neon.com/blog/neon-auth-branchable-identity-in-your-database)
- [Better Auth: e-mail, verificação e redefinição de senha](https://better-auth.com/docs/concepts/email)
- [Better Auth: limite de taxa](https://better-auth.com/docs/concepts/rate-limit)
- [Better Auth: CAPTCHA/Turnstile](https://better-auth.com/docs/plugins/captcha)
- [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Validação de token Turnstile no servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
