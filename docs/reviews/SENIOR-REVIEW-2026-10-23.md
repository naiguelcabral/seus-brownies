# Revisão técnica e de segurança — Cacau v1

Data: 23/10/2026. Revisão de leitura, com testes locais e consultas remotas não destrutivas.

## Parecer

O núcleo operacional possui controles relevantes e validação automatizada consistente, mas **não recomendo liberar produção ainda**. Há dívida concreta de segurança, recuperação e rastreabilidade que deve anteceder novas funcionalidades. CI verde e CodeQL sem alertas não equivalem a ausência de vulnerabilidades ou a aceite operacional.

A análise cobriu governança, arquitetura, autenticação/RBAC/CSRF, validação de entradas, estoque/FIFO/produção/financeiro, banco/migrations, configuração Workers, recuperação, CI/dependências, Git e integrações MCP. É uma revisão abrangente por camadas e dos caminhos críticos; não é certificação, pentest exaustivo nem inspeção linha a linha de cada commit histórico.

Este relatório registra achados e recomendações. O [roadmap canônico](../governance/ROADMAP-CODEX.md) continua sendo a única fila de execução; a priorização abaixo deve ser reconciliada nele quando os pacotes de correção forem assumidos. Não reabre entregas comprovadas nem autoriza alterações externas.

## Bases e verificações

| Base | Estado observado |
| --- | --- |
| Checkout | `fix/neon-auth-recovery-20261022`, HEAD `3af1af5`; inicialmente limpo |
| Main remota | `bb122d82a75de7b1105c5aa8ecc78743f6ea0213`, após PR #60 |
| Main local | `fda8471`, anterior à main remota |
| Divergência HEAD/main remota | Dois commits locais exclusivos; três commits exclusivos da main remota |
| Worker disponível na conta consultada | `cacau-v1-hml`; versão `997f47bb-6be0-4a78-b1fe-f46ea1fef512`, 100%, desde 23/10 00:36 UTC |
| Neon operacional | PostgreSQL 17; 38 tabelas public, 36 recibos de migration, 38 produtos e quatro vínculos ativos |
| Fatos operacionais consultados | Zero compras, vendas, lotes e movimentos de estoque; não foram criados fatos para teste |
| Git | 71 branches locais e 55 branches remotas existentes, verificadas com fetch e ls-remote |

Resultados novos desta revisão:

- **574/574 testes Node aprovados** no HEAD local, com ambiente limpo e Node 22.23.2.
- **16/16 testes direcionados aprovados** em snapshot de `origin/main`, cobrindo datas de negócio, vendas e paridade de estoque afetadas pela PR #60.
- Lint, typecheck, formatação e build isolado de CI aprovados no HEAD local.
- Knip aprovado: quatro entradas previamente reconhecidas na baseline, zero novas e zero resolvidas. Isso não significa zero apontamentos.
- `npm audit`: **quatro pacotes sinalizados com severidade alta, uma causa raiz identificada no Zod**, zero críticas.
- Code scanning consultado: lista de alertas vazia. Ruleset da main ativa, sete checks, PR atualizado, conversas resolvidas, CodeQL para alta/crítica e sem bypass; zero aprovações formais conforme política de mantenedor único.
- CI, CodeQL e validação de negócio/browser da main remota concluídos com sucesso: [CI](https://github.com/naiguelcabral/seus-brownies/actions/runs/39958149331), [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/39958149421), [negócio/browser](https://github.com/naiguelcabral/seus-brownies/actions/runs/39958149349). Não atribuo a esses runs uma contagem de testes que não consegui extrair de seus logs nesta sessão.
- As primeiras execuções de testes/Knip no sandbox falharam por comportamento de subprocessos/streams. A repetição fora da restrição passou. Não foi alterado ou enfraquecido teste.
- Reproduções locais, sem conexão real: pools independentes por chamada de `getDb`; 25 identidades distintas aceitas pelo limiter local; custo FIFO sem lote presente no total e ausente em `byBatch`.

## Achados ordenados

### A01 — P0 de verificação: comprovar revogação da credencial histórica

**Evidência:** repositório público; o snapshot `48b101d` contém formato reconhecível de credencial Neon no template `.env.example`. A verificação retornou somente booleanos, sem imprimir o conteúdo. O mesmo teste na main atual retorna falso. A PR #59 corrigiu o template e adicionou bloqueios, mas a remoção na ponta não elimina o histórico Git. A busca nos registros consultados não encontrou comprovação de rotação/revogação associada ao incidente.

**Risco:** se a credencial histórica ainda for válida, o acesso indevido independe do RBAC da aplicação. Não testei a credencial antiga e não afirmo que continua ativa ou que houve invasão.

**Ação:** confirmar imediatamente a revogação/rotação no provedor, registrar evidência sanitizada e revisar acessos do período. Caso ainda válida, tratar como incidente e rotacionar com autorização do responsável. A PR #63 oculta endpoints atuais, mas não substitui revogar uma credencial. Decisão sobre reescrita do histórico é separada.

**Critério de encerramento:** evidência de credencial antiga invalidada e destinos atuais funcionando, sem publicar valores. Prioridade emergencial pela incerteza de exposição; não é afirmação de exploração ativa.

### A02 — P1: dependência vulnerável alcança validação do servidor

**Evidência:** lockfile contém Zod 4.5.4 e uma cópia 4.1.12 dentro de `@neondatabase/neon-js`; Knip usa 4.6.7. O audit sinaliza `zod`, `@neondatabase/neon-js`, `@neondatabase/auth` e `@neondatabase/auth-ui`, propagando a mesma causa raiz. O aviso [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), atualizado em 23/10, informa versões afetadas anteriores a 4.6.6 e consumo excessivo de memória na validação de coleções. Há arrays de entrada sem limite máximo em `src/features/production/functions.ts:106` e contratos de compras/vendas.

**Ação:** preparar atualização compatível de todas as cópias afetadas, incluindo a dependência fixada pelo SDK Neon; testar Auth e contratos de negócio. Adicionar limites de tamanho do corpo e cardinalidade antes do processamento caro. Não executar `npm audit fix --force`: o próprio audit sugere mudanças potencialmente incompatíveis.

**Critério:** audit sem a vulnerabilidade, versões transitivas verificadas e testes de payload excessivo/fluxos reais aprovados. Não foi executado teste de esgotamento de memória contra o HML.

### A03 — P1: política de recuperação não corresponde à configuração atual

**Evidência:** o Neon informa janela de histórico de **21.600 segundos (seis horas)**. As seis branches, inclusive `production`, estão com `protected:false`. A automação local chamada “Cacau — backup diário privado” está ACTIVE, mas sua regra atual é **semanal, às quintas, 00:15**; o fuso efetivo precisa ser reconfirmado. Isso diverge do roadmap que descreve backup diário às 03h. A cópia externa restaurada em 21/10 é evidência histórica válida, não prova da rotina atual. A data mais recente entre os arquivos locais de backup é 22/10 22:12 UTC, mas mtime não prova sucesso do dump, upload ou restore.

**Ação:** acordar RPO/RTO, retenção e responsáveis; reconciliar frequência; verificar execução efetiva e upload; cobrir Auth, excluído do dump public/drizzle; testar alerta de falha e restauração periódica. Avaliar proteção das branches relevantes e execução independente do computador.

**Critério:** uma sequência comprovada de backups no intervalo aprovado, restauração a partir dos bytes externos, procedimento de Auth e simulação de falha com responsável acionável. Não apagar backups ou recriar branches nesta etapa.

### A04 — P1: auditoria de autenticação não permite identificar o usuário

**Evidência de código:** `src/features/auth/login-actions.ts:79` registra action/outcome/requestId, mas não transmite actorAuthUserId ou targetId. O tipo suporta esses campos em `src/features/auth/audit.ts:22`.

**Evidência no banco, somente agregados:** 45 logins, 18 logouts, três verificações de e-mail, 12 conclusões de reset e 16 solicitações de reset, todos sem ator e sem alvo. Os quatro eventos de mudança de papel têm alvo, mas nenhum ator. Os registros têm requestId.

**Consequência:** a trilha responde “qual evento e quando”, mas não “qual identidade” nos fluxos de autenticação. O resumo arquitetural de auditoria por identidade está mais forte que a evidência entregue.

**Ação:** após autenticação bem-sucedida, usar a identidade retornada/validada pelo servidor; para tentativas e recuperação, usar correlação opaca aprovada, nunca e-mail/senha/token em claro. Capturar ator em concessões futuras e tratar bootstrap separadamente. Preservar o histórico existente; não inventar autoria retroativa.

### A05 — P1 preventivo: configuração permite query strings sensíveis em logs

**Evidência:** `wrangler.jsonc:14` define `redact_query_string:false`, com logs persistidos e invocation logs habilitados. O readback do Worker confirma os mesmos campos. `src/routes/login/redefinir-senha.tsx:13` recebe `token` pela query; a remoção acontece no navegador depois da requisição inicial. A página tem meta `no-referrer`, o que é positivo, mas não remove a URL já recebida no servidor.

**Limite da comprovação:** fiz uma requisição HEAD com marcador sintético sem segredo. As consultas de logs não localizaram esse marcador; portanto **não foi comprovada persistência de token real**. O dataset retornou 277 registros agregados nas últimas 24 horas; não considero a observabilidade simplesmente desligada pelo campo superior `enabled:false` quando `logs.enabled:true` também está presente.

**Ação:** habilitar redação de query strings de forma explícita e testar captura com marcador sintético, além de `Cache-Control: no-store` no fluxo de recuperação. Conferir comportamento com a documentação [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) e [configuração de observabilidade](https://developers.cloudflare.com/workers/wrangler/configuration/#observability). Não ler tokens reais para provar o risco.

### A06 — P1: comandos de banco ainda contornam o procedimento auditável

**Evidência:** na main e no HEAD local, `package.json:33` chama diretamente `drizzle-kit generate` e a linha 38 chama `drizzle-kit push`. A cadeia ativa e o schema já são reconhecidamente divergentes no procedimento de preparação; `db:migrate` bloqueado não protege esses outros caminhos.

**Correção existente:** [PR #61](https://github.com/naiguelcabral/seus-brownies/pull/61), HEAD `eb62e51`, bloqueia ambos e aponta para o procedimento offline. Diff revisado; checks atuais aprovados.

**Ação:** integrar #61 após a revisão humana exigida; manter plano por alvo para futuras migrations. Não aplicar novamente os 36 recibos existentes. O guard do npm é prevenção de acidente, não um controle de acesso contra alguém com credenciais administrativas.

### A07 — P1 de disponibilidade: pools novos por chamada e sem timeout explícito

**Evidência:** `src/db/index.ts:10` retorna `drizzle(connectionString)` a cada chamada. O driver instalado cria um `pg.Pool` novo. Reprodução sem conexão: dois `getDb()` retornaram dois pools diferentes, cada um com máximo padrão dez e timeout de conexão zero. Não há finalização geral desses pools no código de aplicação. Uma chamada autenticada pode passar pelo resolver de principal e por múltiplas leituras/escritas.

**Risco:** multiplicação de conexões/handshakes e esperas sem limite controlado pela aplicação, especialmente sob falha ou concorrência. Não houve teste de carga e não atribuo os 429 históricos a esse achado.

**Ação:** definir ownership/lifecycle por request ou outra estratégia compatível com Workers, limites e timeout; avaliar Hyperdrive/pooling conforme a arquitetura e testar transações. Não introduzir socket global compartilhado inadvertidamente. Referência: [boas práticas oficiais de Workers](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

### A08 — P2: antiabuso permite renovar o orçamento trocando identidade

**Evidência:** `src/features/auth/auth-rate-limit.server.ts:107` limita por scope + hash do identificador fornecido. Não há chave por origem confiável nem orçamento agregado nessa camada. Reprodução local aceitou 25 identidades diferentes sem desafio. O caminho de login lê a tabela de tentativas antes de passar pelo limiter distribuído. A proteção de cinco falhas consecutivas e o fail-closed do binding existem e devem ser preservados.

**Ação:** adicionar controles complementares por origem confiável e orçamento global, limites de payload e teste de abuso com múltiplas identidades. Conferir hostname/action retornados pelo Turnstile e definir timeout da verificação. Validar o provedor diretamente em H01/H02; não prometer resistência a ataque distribuído apenas por esse limiter.

### A09 — P2 funcional: detalhamento FIFO omite origens sem lote

**Evidência:** `src/features/reports/calculations.ts` inclui linhas com productionBatchId nulo no total, mas `group()` descarta chave nula e `byBatch` fica vazio. Reprodução: CMV total R$ 2,00, um produto e zero linhas por lote. A consulta usa left join, portanto a linha não some do total. O problema é explicar a origem e reconciliar o detalhamento, não perda comprovada de dinheiro.

**Trabalho recuperável:** branch local `fix/fifo-report-origin`, commit `2ce3566`, contém proposta antiga para distinguir produção/compra/ajuste. Está 445 commits atrás da main; **não mesclar nem cherry-pick às cegas**, pois a main já preserva custos exatos que o patch antigo não conhece.

**Ação:** portar a intenção para a main atual, preservar aritmética racional e adicionar casos de compra/ajuste no relatório.

### A10 — P2: cabeçalhos de defesa em profundidade ausentes no reset

O HEAD público da página de reset retornou 200 sem CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy ou Cache-Control. Existe meta de referrer no HTML; não confundir isso com header HTTP. Definir política contra enquadramento, MIME sniffing e cache, e CSP compatível com hidratação/Turnstile, começando por validação em HML. Não foi demonstrada exploração XSS ou clickjacking.

### A11 — P2: governança, main e publicação não estão reconciliadas

O roadmap ainda descreve #55 aguardando merge, mas #55 e #56–#60 estão mescladas. Os commits locais de recuperação `7eb15f2`/`3af1af5` não estão na main. A main local está atrasada. A correção de datas #60 já está integrada, mas não encontrei recibo de publicação dela no HML; a versão ativa antecede o merge.

Reconciliar a documentação sem apagar checkpoints; produzir recibo que ligue SHA, build, versão Worker e configuração. O histórico de deploy mostra publicações pelo dashboard durante a recuperação, tornando essa ligação especialmente importante.

### A12 — P2/P3: integrações e manutenção precisam de escopo mais estreito

GitHub está com permissão de plugin “Allow all actions” e acesso administrativo ao repositório; Neon expõe escrita/destruição e a conexão possui ADMIN. Isso não é vulnerabilidade comprovada, mas amplia o impacto de erro de agente. Separar rotina de leitura de operações privilegiadas e manter gates de produção. Não alterei permissões.

Workers Builds e Observability respondem, porém se declaram depreciados em favor do MCP Cloudflare API. Há redundância de ferramentas e `cloudflare-bindings` configurado sem ferramentas expostas nesta sessão. O preflight GitHub na main valida configuração/keyring, mas não uma chamada MCP autenticada; a proposta local `fd62de7` trata essa lacuna.

Os módulos operations/production/finance/scenarios somam 4.851 linhas. Extração gradual de serviços/writers melhora revisão e testes, mas fica depois da segurança e do aceite real. Compatibility date do Worker continua 2025-09-02; atualização deve ser ensaiada, não feita por calendário apenas.

## Controles positivos preservados

- Stack segue a arquitetura; segredos de banco/Auth/Turnstile são bindings `secret_text` no Worker consultado.
- Há 55 políticas de Server Functions, autorização no servidor, vínculo ativo/identidade verificada e revogação consultada no banco.
- Middleware CSRF cobre POST/PUT/PATCH/DELETE; sessão usa adapter com SameSite strict; recuperação tem resposta genérica e token retirado da URL no cliente.
- Escritas críticas usam transações, auditoria operacional no mesmo fluxo, chaves idempotentes, locks de lote/produto/FIFO e locks de período financeiro. A produção impede conclusão repetida.
- Custos racionais e BigInt preservam precisão; receita por competência, caixa, taxas e custos produtivos são tratados separadamente. Não encontrei nova quebra aritmética nos caminhos inspecionados.
- Suíte inclui rollback, insuficiência de estoque, lifecycle, fechamento/correção, crédito e testes conectados. Parte dos testes é estrutural/mock; número de testes não mede cobertura nem substitui operação real.
- Regras da main estão efetivamente ativas; CodeQL está sem alertas retornados; backup externo já teve restore documentado.

## Git: integração recomendada e trabalho a preservar

| Ordem | Branch/commit/PR | Decisão recomendada |
| --- | --- | --- |
| 1 | Nova correção de A02 e configuração A05 | Preparar correções pequenas com regressão e revisão; o risco descoberto agora não é resolvido pelas PRs antigas |
| 2 | #61 `eb62e51` | Integrar guard Drizzle; sem SQL compartilhado |
| 3 | #63 `4eec2c8` | Revisar e integrar hashes de endpoints e gates compatíveis; não representa rotação de credencial |
| 4 | #62 `1b04194` | Integrar higiene, pins de Actions e Dependabot npm; atualizar sobre a main após #63, pois há arquivos comuns de backup/testes |
| 5 | `7eb15f2`, `3af1af5` | Preservar e levar os recibos de recuperação à main por PR documental, reconciliando o status atual |
| 6 | `fd62de7` em `codex/mcp-preflight-validation` | Revisar e publicar a verificação real do GitHub MCP; ainda sem upstream/PR |
| 7 | `2ce3566` em `fix/fifo-report-origin` | Reimplementar a intenção sobre custos exatos atuais; não integrar o diff antigo inteiro |
| 8 | Demais branches antigas | Classificar cobertura/supersessão antes de arquivar; não são automaticamente trabalho pendente de merge |

As PRs #61–#63 estavam MERGEABLE, atualizadas com a main e com os checks retornados em SUCCESS. A recomendação não substitui review completo dos diffs e novo check do SHA imediatamente antes de cada merge. #62/#63 foram inspecionadas quanto ao escopo, trechos sensíveis e gates, não homologadas juntas nesta sessão.

Entre as 55 remotas, 47 têm ponta ancestral da main; oito ainda divergem. As divergentes são #61/#62/#63, `codex/ci-main-isolated-build`, `codex/governanca-agente`, `codex/m43-migration-readonly-audit`, `codex/typed-scenarios-20261021` e `revert-31-codex/integration-reports-finance`. O revert antigo não é candidato automático: pode desfazer funcionalidades válidas. A branch de build já tem funcionalidade equivalente na main; M43 é registro histórico. A branch de Cenários contém handoff e restauração do template já tratada por #59, exigindo comparação, não novo merge genérico.

O [inventário completo](SENIOR-REVIEW-2026-10-23-branches.json) lista as 71 locais e 55 remotas, SHA, upstream, ancestralidade e divergência. “Não ancestral” não significa necessariamente alteração funcional ainda ausente: squash, cherry-pick e supersessão exigem análise semântica.

## MCPs: o que foi efetivamente conferido

| Integração | Evidência e limite |
| --- | --- |
| Cloudflare API | Leitura autenticada de conta, Worker, bindings por nome/tipo, deploys e agregados de telemetria aprovada |
| Cloudflare Docs | Pesquisa oficial respondeu |
| Cloudflare Builds | Listagem autenticada respondeu; servidor declara depreciação |
| Cloudflare Observability | Listagem autenticada respondeu; servidor declara depreciação; consultas principais usaram API atual |
| Cloudflare Bindings | Configurado/enabled no CLI, mas sem ferramentas próprias expostas nesta sessão; saúde não comprovada |
| Neon | Listagem de projeto/branches, diagnóstico e SQL somente leitura aprovados; permissões amplas |
| GitHub plugin | Consulta autenticada do repositório aprovada; plugin permite todas as ações; ruleset lida via gh |
| GitHub MCP do CLI | Configuração e keyring aprovados no host. Isso não atesta handshake da sessão do CLI; proposta local de preflight ainda não integrada |
| Notion | Consulta de identidade/workspace respondeu; nenhuma página alterada |
| Canva | Busca de leitura respondeu; nenhum design alterado |
| OpenAI Developer Docs | Pesquisa e leitura de documentação responderam |
| Node REPL | Probe local sem efeitos respondeu |
| CUA/browser | Ferramenta exposta/enabled; não exercitada, para não abrir ou inspecionar abas pessoais sem necessidade técnica |
| Code review | CLI indica disabled, apesar de ferramenta disponível no runtime; nenhuma revisão delegada executada |
| Codex app | Consultas de uso e visualização de automação responderam; CLI lista configuração disabled, refletindo superfície diferente do app |

`auth_status:unknown` do CLI não foi tratado como falha: vários desses MCPs responderam autenticados. Também não confundi GitHub plugin, `gh` e GitHub MCP do CLI como uma única credencial. Não foram realizados testes de escrita para “validar” conectores.

## Ordem de execução após esta revisão

1. **Imediato — A01:** resolver a incerteza de credencial histórica e preservar evidência de revogação. Responsável: Dono/administrador dos provedores.
2. **Antes do piloto — A02/A05/A06:** corrigir dependência, privacidade dos logs e guard de banco; integrar as PRs revisadas sem misturar mudanças de negócio.
3. **Antes do piloto — A03/A04/A07:** recuperação verificável, autoria de autenticação e lifecycle de conexões. Reconciliar ambientes e privilégios (T02/G02/I01/I02/I03).
4. **Homologação real — H01/H02/H03:** login/logout, expiração/revogação, OTP/reset, limite/cooldown, Turnstile válido/inválido/replay e matriz negativa por perfil. Resolver os 429 por correlação, sem supor causa.
5. **Qualidade operacional — A08/A09/A10/H06:** antiabuso complementar, origem FIFO, cabeçalhos e uso em celular físico/acessibilidade/rotina.
6. **Piloto I05 → aceite I04:** fatos reais autorizados com operadora; reconciliar estoque, receita, recebimento, custo e lucro; registrar decisão de liberação.
7. **Depois:** extrações S04, indicadores adicionais conforme necessidade, WhatsApp/assistente e OCR. Multitenancy/SaaS e automação ampliada permanecem condicionais.

Commits sugeridos para pacotes novos, depois de implementados e testados: `fix(security): update vulnerable zod dependency graph`, `fix(security): redact auth query strings and harden headers`, `fix(auth): correlate audit events with verified identities`, `fix(db): bound request connection lifecycle`, `fix(auth): bound aggregate public authentication traffic`, `fix(reports): explain fifo costs without production batches`, `docs(governance): reconcile recovery schedules and release evidence`.

Não atribuo percentual novo de conclusão: a ausência de operação real e de aceite completo torna uma porcentagem pouco útil. O critério de avanço deve ser o encerramento demonstrável dos gates acima.

## Limites e ações realizadas

Nenhum deploy, merge, push, alteração de permissão, rotação, escrita operacional, migration, importação ou exclusão foi realizado. Não foram lidos arquivos `.env`, credenciais de runtime ou valores de secrets. O teste no template histórico revelou apenas a presença de formato sensível, não seu conteúdo.

Não foram executados novos E2E autenticados no HML, testes de carga, exploração de vulnerabilidades, rotação de credenciais, restore adicional ou validação de entregabilidade de e-mail. Os resultados conectados do GitHub foram conferidos pelo estado dos runs; a evidência histórica de restore foi tratada como histórica. A role exata usada pelo Worker no banco não foi inspecionada por meio da connection string: a consulta de roles não mostrou uma role dedicada ao aplicativo, mas isso não prova qual role o secret utiliza.

Entregas desta rodada: este relatório e o inventário Git, sem commit automático. Uso Codex no último checkpoint antes da redação: 26% da janela de cinco horas restante; reserva do projeto 5%.
