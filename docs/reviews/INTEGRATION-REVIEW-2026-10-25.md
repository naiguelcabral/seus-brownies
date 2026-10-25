# Revisão conjunta das candidatas — 25/10/2026

Escopo: PRs #61–#65 sobre main bb122d8. Não é aceite de produção nem nova
auditoria dos provedores. A fila de execução continua exclusivamente no
[roadmap](../governance/ROADMAP-CODEX.md).

| PR / HEAD revisto | Resultado da revisão |
| --- | --- |
| #61 / eb62e51 | Guard offline bloqueia geração na cadeia congelada e push direto; casos desconhecidos falham fechados. Nenhuma conexão ou SQL novo. |
| #63 / 4eec2c8 | Mapa/sanitizador/verificador/backup passam a comparar hashes. Recusa de produção, endpoint divergente/pooler, vínculo e fingerprint continuam cobertos. Migrations publicadas permanecem com hashes preservados. Não é prova de rotação. |
| #62 / 1b04194 | Pins de Actions, Dependabot, diagnóstico da CLI de backup e Drizzle Kit em desenvolvimento. Remoção de artefatos rastreados analisada por caminhos/diffstat; conteúdo privado dos artefatos não inspecionado. Nenhum dado HML removido. |
| #64 / 83b3fb3 → 601f138 | Uma cópia Zod 4.6.7, Undici 7.30.1; redação HML e headers de login/reset. Acrescentadas regressões de versões, resolução do SDK e rejeição antecipada de array excessivo; headers conferidos por HTTP. Limites das entradas da aplicação ainda pendentes. |
| #65 / 9a4b276 + seguimento documental | Preserva os recibos e a revisão; organiza A01–A12/L01–L09 com critérios e responsáveis. Relatos remotos distinguem-se da evidência coletada nesta rodada. |

Os checks iniciais das cinco PRs, incluindo CodeQL, foram consultados nos
SHAs acima e retornaram sucesso. A revisão #64/601f138 passou novamente todos
os checks. A API confirmou três análises CodeQL sem resultados/erros/avisos
no merge de teste eb037429 (com 601f138 entre os pais) e zero alertas abertos
em refs/pull/64/merge. Checks da revisão documental final de #65 devem ser
conferidos após o push e antes do merge. Nenhuma aprovação formal ou comentário externo foi
enviado pelo agente.

## Composição local e validação

Worktree isolada iniciada de #65/9a4b276 e composta com #61 → #63 → #62 →
#64, sem conflitos. HEAD final do ensaio 0bfc9b8, salvo em
codex/review-audit-integration-20261025. Ordem proposta para main:
**#61 → #63 → #62 → #64 → #65**, com atualização/checks entre cada merge.
Essa composição é ensaio e não integra a main.

| Verificação | Resultado e referência |
| --- | --- |
| Instalação e dependências | npm ci com ambiente limpo; zero vulnerabilidades. Zod 4.6.7 único, Neon resolve o mesmo runtime; Undici 7.30.1; Drizzle Kit em devDependencies. Advertências de peers Better Auth e pacotes transitivos depreciados permanecem visíveis; não foi migrado o provedor para suprimi-las. |
| Node | 586/586, zero skips, em 7c8af45; quatro casos focados finais aprovados em 0bfc9b8. |
| Qualidade | Lint, tipos e formato finais aprovados em 0bfc9b8; Knip mantém quatro achados contextuais, zero novos/resolvidos. |
| Build | Archive isolado de 984de61, chave pública de teste e sem deploy. Fontes operacionais/scripts/manifestos/configuração são idênticos em 0bfc9b8; apenas testes mudaram depois. |
| Navegador | 40 fixtures aprovadas; 12 casos conectados com interface/HTTP/PostgreSQL 17 e identidade sintética aprovados. |
| Negócio PostgreSQL | Custos exatos, preservação/rollback e compra→produção→venda→recebimento/entrega→lucro aprovados. Três containers exclusivos encerrados ao fim. |
| Login/reset público | Headers no-store/no-referrer comprovados nas duas rotas e navegação preservada. Smoke final serial 1/1 aprovado. Houve falha de clique em execução concorrente; cópia instrumentada passou sem erro do navegador, seguida de repetição serial aprovada. Causa não comprovada; não há dispensa de H06. |

Os dois arquivos de regressão em #64/601f138 têm blobs idênticos aos do
ensaio. O [recibo JSON](../../evidence/pr-integration-review-2026-10-25.json)
fixa SHAs e limites; não atribuir contagens ao ambiente publicado ou a um
futuro merge da main.

## Limites

Nenhum .env, credencial histórica, token real ou valor de secret foi lido.
Sem SQL compartilhado, alteração remota de permissões/configuração, merge
na main, deploy, limpeza HML ou repetição de importações. Conectores foram
usados para leitura e atualização das branches/metadados das PRs autorizadas.

A01 é relato parcial incorporado por #65, sem recibo independente conferido
nesta sessão; nenhuma comparação de senhas foi repetida. A role efetiva do
Worker também não foi comprovada aqui. pg_stat_statements é estatística,
não substitui logs de conexão nem uma trilha por evento. Frequência/fuso do
backup, recuperação de Auth, RPO/RTO, ambientes, retenção/dados pessoais,
publicação HML e aceites reais continuam com seus critérios no roadmap.

Fontes técnicas consultadas: [advisory Zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
e schema do Wrangler instalado para redact_query_string. A implementação
existente do runtime foi consultada para diagnosticar o smoke, sem modificá-la.

## Seguimento autorizado

O Dono autorizou a integração após esta revisão. #61 → #63 → #62 → #64
foram integradas sequencialmente com atualização das candidatas e gates
aprovados; a #65 entrega o fechamento documental. Código na main 79634e6,
idêntico ao ensaio fora de documentação/evidências. Auditoria nova zerada e
lockfile preservado. Merges e triagens de segurança fixados no
[recibo sequencial](../../evidence/pr-sequential-integration-2026-10-25.json).
O SHA final da própria #65 e o CI pós-merge são confirmados no GitHub ao
encerrar. Nenhum deploy, SQL compartilhado ou secret alterado.
