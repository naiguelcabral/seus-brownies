# Segurança e qualidade — follow-up local

Atualizado em 5 de outubro de 2026 na branch
`codex/security-quality-followup`, a partir de `origin/main`
`0c0dce2143215102ed07285c45c161deab96d01c`. Nenhuma configuração externa,
segredo, migration ou dado compartilhado foi alterado.

## Dependências

Em 5 de outubro, o comando `npm audit --package-lock-only --ignore-scripts`
reportou 16 vulnerabilidades: sete altas e nove moderadas. A execução com
`--omit=dev` reportou 10 (uma alta e nove moderadas), portanto não se deve
classificá-las todas como ferramenta local. Em 6 de outubro, o resumo do
registry exibido por `npm ci --ignore-scripts` passou a reportar 24 (cinco
críticas, oito altas e onze moderadas), sem modificar o lockfile. A diferença
é nova evidência para revisão dedicada; não autoriza uma atualização automática.

| Cadeia                                             | Classe de uso                                                  | Correção indicada pelo audit                         | Decisão desta revisão                                                           |
| -------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `js-yaml` e `fast-uri`                             | transitivas presentes na árvore de runtime/build               | disponível                                           | não atualizar isoladamente sem produzir lockfile mínimo reprodutível            |
| Neon Auth, `better-auth` e `@neondatabase/neon-js` | autenticação, potencialmente runtime                           | incompatível/major para parte da cadeia              | gate humano: validar sessão, OTP, reset e cookies antes de qualquer atualização |
| `drizzle-kit` → `@esbuild-kit/*` → `esbuild`       | ferramenta de migration, mas ligada por pares à árvore de auth | `drizzle-kit@0.18.1`, incompatível                   | não fazer downgrade/major automático; revisar migrations e compatibilidade      |
| Wrangler, Vite plugin, Miniflare, Sharp e Undici   | desenvolvimento/CI Cloudflare                                  | disponível, porém atualização conjunta de ferramenta | PR separada somente após matriz Worker/Vite/HML aprovada                        |
| `brace-expansion`                                  | lint/ferramentas transitivas                                   | disponível                                           | manter na mesma revisão de ferramentas, não fazer override cego                 |

`npm audit fix --dry-run --package-lock-only --ignore-scripts` não produziu
uma atualização revisável: parou em conflito de peer dependencies de
`better-auth`/`better-call`. Não foi usado `--force`, não houve mudança de
lockfile e não existe correção compatível comprovada para abrir nesta rodada.

## Login e auditoria

A reprodução local em `test/auth-login-composition.test.ts` confirma a ordem:
leitura do contador, proteção, provedor, auditoria e só então gravação do
contador. Se a gravação falha depois do sucesso do provedor, um `Set-Cookie`
já pode ter sido emitido. A política de compensação é humana: escolher entre
revogar sessão, manter sessão e registrar retry durável, ou tornar a emissão
atômica com uma fronteira suportada pelo provedor. Não foi alterada a política
de sessão nesta revisão.

Os eventos de login, logout e OTP usam o contrato sanitizado, porém os
adapters locais expõem apenas `{ error }`; não fornecem uma identidade
autenticada estável para preencher `actorAuthUserId` ou `targetId`. O próximo
patch só deve ampliar o contrato do adapter depois de confirmar a resposta
tipada do Neon Auth: eventos de sucesso devem receber `targetId` somente de um
ID de identidade retornado pelo provedor, e logout só deve receber ator/alvo
de uma principal resolvida no servidor. Nunca derivar esse campo de e-mail,
cookie ou token.

## Contrato pendente do Turnstile

O adaptador valida `success === true` e falha fechado para HTTP não-2xx e JSON
inválido. A resposta atual não é validada contra `hostname` nem `action`.
Ainda não existe configuração versionada que declare os hostnames aprovados ou
o mapeamento ação → fluxo; por isso nenhum valor HML foi assumido.

Antes de ativar essa validação, a configuração versionada deve exigir:

1. hostnames esperados por ambiente, sem `localhost` ou `127.0.0.1` em
   produção;
2. ações estáveis para `login`, `sign-up`, `verification-otp`,
   `password-reset` e `password-reset-completion`;
3. resposta Siteverify com `success`, `hostname` e `action` presentes e iguais
   ao contrato do fluxo; campos ausentes ou divergentes devem negar o pedido;
4. testes locais para sucesso, hostname divergente/ausente, ação
   divergente/ausente, HTTP/JSON inválido e replay externo como gate HML.

Recomendação: aprovar esses valores junto com a matriz de ambientes G1 e só
então implementar o contrato fail-closed e a homologação real de replay.

## Repositório

O guard `scripts/git-sensitive-paths.py` continua cobrindo caminhos sensíveis
rastreáveis, staging forçado, nomes NUL-safe e symlinks; os testes de
sanitização de memória, symlink, lock/escrita atômica e staging imutável
permanecem no escopo de regressão. A política específica de artefatos está em
`BROWSER-ARTIFACT-RETENTION.md`.
