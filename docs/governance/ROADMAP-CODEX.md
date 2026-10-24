# Roadmap único — Cacau v1

Atualizado em **23/10/2026**, reconciliando a
[revisão técnica e de segurança](../reviews/SENIOR-REVIEW-2026-10-23.md).
GitHub reconferido nesta rodada: #55 e #59–#60 integradas, `main` em
`bb122d8`; #61–#64 abertas. Último checkpoint HML: versão `997f47bb`,
em 100% após restaurar os bindings de conexão/autenticação. Não há recibo
que comprove publicação da correção de datas #60 nessa versão.
Este é o **único arquivo de planejamento e acompanhamento de pendências**.
Relatórios datados, recibos, matrizes e runbooks preservam evidências e
procedimentos; suas listas antigas não são filas adicionais de execução.

A consolidação substitui os checkpoints repetidos deste arquivo. Seu histórico
completo permanece no Git. Não autoriza executar itens pendentes, mudar regras,
conceder acessos, aplicar migrations ou publicar em produção.

Reparo de 22/10: consultas Neon e vínculos dos quatro acessos conferidos;
`DATABASE_URL` restaurado como secret e endpoint Auth reconstruído da branch
de identidades. Sessão inválida passou de500 para200, raiz307/login200 e
25 testes Node aprovados no reparo. Em 23/10, usuário confirmou nova entrada
da Gerente e abertura normal do painel; 32 testes direcionados e smoke público
passaram no seguimento, sem nova alteração de schema, fonte ou configuração.
H01–H03 continuam parciais para os demais casos; detalhes em
[recuperação Neon/Auth](NEON-AUTH-RECOVERY-2026-10-22.md).

## Prioridade de retomada

O núcleo operacional já está integrado à `main`: compra → estoque → produção
→ venda → recebimento/entrega → lucro foi comprovado com interface, HTTP e
PostgreSQL 17 isolados. A identidade desse laboratório é sintética; o aceite
do Neon Auth/Turnstile reais e dos perfis no ambiente publicado continua
separado. Primeiro acesso e ordenação da razão de Relatórios já foram
corrigidos e publicados no HML. Não refazer esses incrementos.

Priorizar a comprovação de revogação A01 e as correções A02/A05/A06;
depois recuperação A03/I02/I03, autoria A04 e conexões A07. Preparação local
independente pode avançar enquanto decisões externas permanecem pendentes.
Seguem homologação real H01–H03, antiabuso A08, FIFO A09, cabeçalhos A10 e
uso diário H06; só então piloto I05 e aceite I04. WhatsApp/OCR e extrações
maiores vêm depois. A PR #55 já está integrada; não reapresentar seu merge.

## Remediação da revisão de 23/10/2026

Os identificadores A01–A12 abaixo correspondem aos achados do relatório
datado; esta tabela é sua fila canônica. Critérios não comprovados continuam
pendentes. Responsável técnico: agente nas mudanças locais e testes;
Dono/administrador nas decisões e operações externas sujeitas a gate.

| Ordem / achado | Estado | Entrega e critério de aceite | Gate / dependência |
| --- | --- | --- | --- |
| Imediato — A01 | Comprovação técnica parcial em 23/10 | Hash da credencial de `48b101d` comparado, sem exibir valores, com a senha atual do `neondb_owner` em cada branch: `production`, `g1-auth-hml` e `Development` divergem; as três branches de backup não têm endpoint e não aceitam conexão; o projeto arquivado `cool-base` foi apagado. Falta revisar acessos do período 17–22/10: `pg_stat_statements` está desligado e a CLI não expõe conexões; no Auth, 21 sessões vieram de dois IPs. Registrar evidência sanitizada e apagar `.env.local.bak` local. | Dono pede logs de conexão ao suporte Neon, se necessário. Reescrita do histórico é decisão separada. Não testar nem reproduzir o valor antigo. |
| 1 — A02 / S03 | Dependência corrigida na PR #64; limites pendentes | PR #64: `zod ^4.6.7` com override `$zod`, uma única cópia 4.6.7 na árvore; `undici` do `miniflare` em 7.30.1; `npm audit` zerado; 578 testes. Pendente: limites de corpo/cardinalidade (`production/functions.ts:106`, compras e vendas) e casos de excesso, em PR próprio. | Integração depende de revisão e CI; integrar #64 por último entre #61–#64, regenerando o lockfile. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |
| 1 — A05 | Candidata na PR #64 | `env.hml.observability.redact_query_string: true`; `/login` e `/login/redefinir-senha` com `Cache-Control: no-store` e `Referrer-Policy: no-referrer` pela opção `headers` da rota, conferidos em requisição local. Falta deploy HML e captura com marcador sintético. | Publicação e leitura remota conforme autorização concreta; não consultar tokens reais. |
| 1 — A06 / T02 | Candidata na PR #61 | Revisar eb62e51 e checks do SHA atual; bloquear db:generate/db:push, preservando preparo/revisão offline e recibos. | Merge humano; nenhum SQL compartilhado. Não duplicar a implementação da PR. |
| 2 — A03 / I02 / I03 | Divergência documentada; política pendente | Revisão observou histórico Neon de seis horas, branches sem proteção e automação semanal quinta 00:15, divergindo do diário 03h documentado. Reconfirmar fuso/configuração; acordar RPO/RTO, retenção, responsáveis e Auth; comprovar sequência de uploads, restore externo e alerta de falha. | Restore de 21/10 permanece válido historicamente. Mudança de frequência/infraestrutura/proteção exige decisão aplicável; não apagar backups. |
| 2 — A04 / S01 | Pendente no fluxo Auth | Associar eventos futuros à identidade retornada/validada no servidor; ator nas concessões futuras e bootstrap explícito. Para tentativas/reset, aprovar correlação opaca; testes sem e-mail/senha/token nos eventos. | Preservar autoria histórica desconhecida; não fazer backfill inventado. Auditoria operacional S01 continua entregue. |
| 2 — A07 | Pendente | Definir ownership/lifecycle de conexão compatível com Workers, limites e timeout; provar fechamento, falhas e transações em isolamento. | Preservar stack; mudança arquitetural requer ADR/decisão. Não atribuir os 429 a pools sem evidência. |
| 3 — A08 / H01 / H02 | Pendente | Orçamentos complementares por origem confiável/agregado, limites de payload, hostname/action e timeout de Turnstile; testes com múltiplas identidades. Completar provedor/desafio reais e correlação dos 429. | Preservar limite de cinco falhas e fail-closed. Ensaios de abuso isolados; homologação publicada assistida. |
| 3 — A09 / F03 | Pendente | Explicar origens FIFO sem lote (compra/ajuste), reconciliando detalhe e total com custos racionais exatos e regressões. | Reimplementar a intenção de 2ce3566 sobre a base atual; não mesclar o patch antigo. Sem mudar custo/fatos. |
| 3 — A10 / H06 | Parcial via #64; global pendente | Nenhum cabeçalho de segurança global em `src/` (CSP, `frame-ancestors`/`X-Frame-Options`, `nosniff`, HSTS, `Permissions-Policy`): telas autenticadas podem ser enquadradas. Middleware global, CSP inicialmente report-only compatível com hidratação/Turnstile; validar login/reset e celular físico por perfil. | Preparação local e ensaio HML conforme gate; meta HTML não equivale a header. |
| Transversal — A11 / G01 / T01 | Reconciliação local preparada | Branch codex/audit-remediation-20261023 alinhada a origin/main bb122d8, preservando 7eb15f2/3af1af5 e a revisão. Roadmap/status/espelho atualizados; futuro recibo deve ligar SHA, build, Worker e configuração. | Integração e publicação separadas. Nenhum deploy novo nesta rodada. |
| Posterior — A12 / S04 / R07 | Pendente / condicional | Revisar escopo mínimo de conectores; avaliar fd62de7; classificar branches antes de arquivar. Extrações graduais e compatibility date somente após segurança/aceite. | Não alterar permissões, excluir branches nem delegar automaticamente. |

### Lacunas complementares de 23/10/2026

Levantamento posterior à revisão, com evidência no código e nos provedores.
Itens já cobertos por A01–A12 foram anotados nas linhas correspondentes acima;
os IDs abaixo cobrem apenas o que não tinha fila própria.

| ID | Prioridade | Lacuna e evidência | Solução e critério de aceite | Gate / dependência |
| --- | --- | --- | --- | --- |
| L01 | Antes de I04 | Configuração do Worker de produção incompleta: o topo de `wrangler.jsonc` não tem binding `AUTH_RATE_LIMITER`, `AUTH_RATE_LIMITER_REQUIRED`, lista de secrets nem redação de logs. Sem a flag, `auth-rate-limit.server.ts:96` usa só o limitador local do isolate, sem aviso. | Espelhar em produção as garantias do HML; teste estrutural que falhe se a flag, o binding, os secrets obrigatórios ou a redação faltarem. | Implementação local; secrets/deploy de produção exigem autorização. |
| L02 | Antes do piloto | Worker conecta como `neondb_owner`, dono do banco; o guard do npm (A06) só evita acidente. | Papel de aplicação sem DDL nem propriedade, com privilégios mínimos por tabela; plano, ensaio isolado e troca do `DATABASE_URL` registrada. | SQL compartilhado e secret exigem autorização específica. |
| L03 | Antes do piloto | Sem trilha de consultas: `pg_stat_statements` desligado em todas as branches, o que impediu auditar A01. Neon sem IP allowlist e sem branch protegida. | Ativar `pg_stat_statements` na `production`; decidir custo de branch protegida e allowlist; registrar política de revisão periódica. | Extensão/plano Neon exigem decisão do Dono. |
| L04 | Antes do piloto | Ambientes embaralhados: HML usa os dados da `production`; Auth e `.env.local` usam `g1-auth-hml` (schema 0016); `Development` está em 0014. O `.env.local` local ainda tem senhas inválidas. | Branch de desenvolvimento derivada da `production`, com schema atual e dados sanitizados; separar HML de produção antes de I04; atualizar `ENVIRONMENT-MATRIX` e o `.env.local`. | Criação de branch e secrets exigem autorização; não copiar dados pessoais sem sanitização. |
| L05 | Antes do piloto | Falhas invisíveis: traces/Issues do Worker desligados, nenhuma ferramenta de erros, monitor só com GETs públicos e Server Functions devolvendo erro com status 200. | Ativar Issues/alertas, endpoint de saúde protegido que teste banco e Auth, registro estruturado de falhas sem dados pessoais e alerta independente do computador local (complementa I03). | Configuração do Worker conforme gate; segredos do endpoint pelo Dono. |
| L06 | Antes do piloto com clientes reais | Dados pessoais sem política: `sales.customer_name`, `sales.customer_phone` e, no futuro WhatsApp, `sender_phone`. Não há base legal, retenção, exclusão nem controle de acesso documentados. | Inventário de dados pessoais, prazo de retenção, anonimização auditada, mínimo necessário em CSV e logs, e registro LGPD aprovado. | Política e prazos são decisão do Dono; anonimização segue lifecycle auditável. |
| L07 | Antes de I04 | Sem medição de cobertura: os testes não indicam o que fica descoberto. | Cobertura nativa do Node na CI, com limite mínimo em dinheiro, estoque, FIFO e Auth; sem enfraquecer testes existentes. | Implementação local e CI. |
| L08 | Contínuo | SDK de autenticação em beta: `@neondatabase/neon-js` 0.8.0-beta, que fixa Zod antigo (contido pelo override da #64). | Acompanhar versões, testes de contrato do adapter e plano de contingência documentado. | Troca de SDK de autenticação exige ADR. |
| L09 | Imediato | Duas sessões de agente usaram a mesma pasta de trabalho: a pasta principal ficou na branch desta remediação enquanto outra sessão preparava PRs. | Cada agente trabalha em worktree própria e não troca a branch da pasta principal; registrar a regra no `AGENTS.md`. | Mudança de `AGENTS.md` exige revisão humana. |

Ordem de integração proposta: revisar #61; revisar #63; atualizar e revisar
#62 após #63, pelos arquivos comuns; integrar #64 por último, regenerando o
lockfile para preservar `drizzle-kit` como dependência de desenvolvimento;
preservar os recibos locais de recuperação em PR documental; revisar fd62de7
separadamente. A simulação dos quatro merges sobre `bb122d8` não teve
conflito e passou com 585 testes e audit zerado. Reconferir diff, SHA e checks
antes de cada decisão humana. Nenhuma PR foi mesclada nesta rodada.

Próximo passo exato: **não refazer A02/A05**, já preparados na PR #64.
Depois das decisões humanas sobre #61–#64, preparar A04, A07 e L01 em
worktrees próprias, um PR por item. Handoff em
[AUTONOMY-HANDOFF.md](AUTONOMY-HANDOFF.md). A01 depende apenas do registro
da evidência sanitizada e da decisão sobre logs do provedor.

PRs #44–#53 mescladas, incluindo tipagem de Cenários/finanças/lifecycle,
patch launch-editor 2.14.2, ordem do menu do Funcionário e coleta do aceite.
Código `91658ed` aprovado com 570 testes Node, 12 casos conectados isolados,
tipos/lint/formato/Knip/build e CI/CodeQL. Publicação conjunta HML concluída
às 15:17 Brasília, versão `de9a88e6` em 100%; sem SQL compartilhado ou produção.
[Recibo](JOINT-HML-PUBLICATION-2026-10-21.md).

Usuário confirmou no tablet os papéis employee/manager/owner e as rotas/GETs
de Dashboard/Parâmetros conforme a matriz. Após deploy, Cenários e Financeiro
abriram como Dono. A repetição automática de permissões usou identidades
sintéticas em PostgreSQL 17 isolado; não equivale a sessões reais no HML.
A ordem Vendas → Produtos → Compras → Categorias do Funcionário foi publicada.
H03 permanece parcial para cobertura ampliada; H01/H02 conservam a
investigação do 429, inclusive uma ocorrência na nova versão. H06 segue parcial.
[Registro manual](AUTH-HML-PERMISSIONS-MANUAL-2026-10-21.md).

## Estimativa de planejamento — análise do Work de 21/10/2026

Referência: conversa **“Análise do repositório”**, confrontada com a `main`
`b82e044`. Estimativas ponderadas por implementação, integração e validação;
não medem cobertura de testes nem constituem aceite operacional.

| Escopo | Conclusão estimada | Esforço restante a partir deste checkpoint |
| --- | --- | --- |
| Sistema interno da fabriqueta | Cerca de 85% (faixa de 80–90%) | 60–100 horas |
| Sistema interno + WhatsApp/assistente + OCR | Cerca de 65% (faixa de 60–70%) | 180–300 horas no total, incluindo o núcleo |

| Pacote restante | IDs | Estimativa |
| --- | --- | --- |
| Documentação e proteções de integração | G01/G03/S03 | 4–8 h |
| Autenticação real e aceite de permissões | H01–H03 | 12–20 h |
| Ambientes e procedimento de migrations | T02/G02/I01 | 8–16 h |
| Restauração externa, recuperação e monitoramento | I02/I03 | 12–20 h |
| Uso diário, celular e correções encontradas | H06 | 12–20 h |
| Piloto, preparação da versão e aceite operacional | I05/I04 | 12–16 h |
| **Total do sistema interno** | | **60–100 h** |
| WhatsApp e assistente operacional | R01 | +60–100 h |
| OCR com conferência antes de gravar | R02 | +40–70 h |
| Estabilização integrada de conversa/documentos | R01/R02 | +20–30 h |
| **Total com WhatsApp e OCR** | | **180–300 h** |

Premissas: uma pessoa com apoio do agente, escopo estável, acessos disponíveis
e decisões sem grandes atrasos. São horas de trabalho acompanhado, não tempo
do agente ligado. Não incluem esperas externas, SaaS, pagamentos ampliados
ou XLSX. Rever as faixas após os aceites; esta atualização documental não
reduz automaticamente o esforço estimado nem autoriza novas ações externas.

## Estado confirmado

| Área | Situação atual |
| --- | --- |
| HML | Publicação de aplicação anterior `91658ed`; versão atual de configuração `997f47bb-6be0-4a78-b1fe-f46ea1fef512`, 100%. Conexão/Auth reparados em 22/10: raiz307/login200, sessão inválida500→200. Em 23/10, usuário confirmou entrada real da Gerente e abertura normal do painel; demais aceites H01–H03 continuam parciais. [Reparo e aceite](NEON-AUTH-RECOVERY-2026-10-22.md). |
| Trabalho versionado | PRs #44–#53 e #55–#60 integradas conforme os registros; GitHub reconferiu #55 e #59–#60, main `bb122d8`. #61–#63 abertas. Recibos locais de recuperação preservados na branch de remediação. Integração não comprova publicação HML ou aceite de produção. |
| Banco usado no HML | Atualizações específicas até `0033`, 36 recibos. A original conserva classificação `production`; seu uso histórico autorizado não a torna laboratório. Migrador genérico continua bloqueante. |
| Catálogo e produção | 38 produtos; duas versões de receita e 34 perfis contando os históricos; receita 2 ativa com 17 perfis completos e 31 componentes |
| Cenários | Cenário 2/v2/rev2 ativo, 16 produtos orientativos em 100%; cenário 1 e seu histórico preservados |
| Meta | R$ 10.000 de lucro mensal após os custos de **todas as vendas**, inclusive Bordinhas realizadas; sem cotas obrigatórias por produto |
| Operação real | Sem compras ou produção previstas; nenhum fato fictício criado no HML para testar as entregas |
| Última validação de código | Revisão de 23/10: 574 testes no HEAD local 3af1af5 e 16 direcionados em snapshot de origin/main; lint/tipos/formato/Knip/build isolado aprovados no HEAD local. Runs da main bb122d8 aprovados conforme relatório, sem contagem extraída. Não repetir nem atribuir esses resultados ao merge local 7480257 sem execução. |
| Segurança | #55 integrada; revisão de 23/10 retornou zero alertas CodeQL e quatro pacotes altos com causa raiz Zod. Resultado histórico npm audit zero foi superado; A01/A02/A04/A05/A07/A08/A10 permanecem abertos. |
| Proteção de integração | `main.protected:true`; ruleset ativa `main-production-integration` (ID 25611109), sem bypass. Exige PR atualizado, conversas resolvidas, sete checks e CodeQL com bloqueio de segurança alta/crítica. Ver G03. |
| Recuperação e alertas | Restore externo de 21/10 comprovado: 38 tabelas/36 recibos exatos. Auth excluído. Revisão de 23/10 observou backup semanal quinta 00:15, divergente do diário 03h planejado, e histórico Neon de seis horas. Reconfirmar fuso, rotina, retenção/responsáveis/RPO/RTO/Auth em A03; continuidade não atestada. |
| Preservação | 21 tabelas tiveram contagens/digests idênticos no checkpoint anterior. A publicação de 21/10 não executou SQL/migrations ou salvou operações; não coletou novo digest operacional. |

Legenda: **concluído** significa que o resultado descrito foi comprovado;
**parcial** distingue implementação de homologação; **pendente** exige trabalho;
**condicional** depende de necessidade ou decisão. Nenhum estado implica
liberação definitiva de produção.

## Entregas concluídas

- [x] **Governança e ferramentas:** arquitetura/regras/segurança/DoD, workflow
  Git, TypeScript 7/Oxlint/Oxfmt, Knip e CodeQL integrados à `main`. A
  ruleset G03 está ativa e a configuração CodeQL legada foi reconciliada; o
  hardening versionado do workflow foi integrado pela PR #55.
- [x] **Acesso HML implementado:** Neon Auth, sessão SSR, guards e RBAC no
  servidor, recuperação auditada, Turnstile e limiter distribuído publicados.
  Vínculos Dono/Gerente auditados; recuperação e sessão do Dono confirmadas.
  A matriz completa e os casos antiabuso ainda exigem homologação H01–H03.
- [x] **Recuperação e schema do HML:** destino Worker/banco atestado, restore
  e atualizações específicas ensaiados/aplicados com preservação de dados e
  recibos. Diagnósticos temporários desativados. Não repetir esses reparos.
- [x] **Workbook e cadastros:** leitura das 15 abas, produtos/insumos, ovos,
  receita versionada, perfis, recheios, embalagens, adesivos e cobertura
  reconciliados e aplicados sob referências auditáveis.
- [x] **C01 — custos exatos e compras em kg:** valor total pago preservado,
  conversão kg → g e custos derivados fracionários, com conservação nas
  entradas/consumos/saldos e ensaios em PostgreSQL 17. Não está pendente
  decidir novamente a precisão ou refazer a importação.
- [x] **Produção:** rascunho/conclusão, consumo físico, custos reais por lote,
  rateio exato, camadas FIFO, recuperação variável de Bordinhas, perdas com
  motivo, preservação de versões e proteção contra conclusão duplicada.
- [x] **Custos e premissas confirmados:** oito ovos/850 g frios por receita;
  rendimentos 48 simples/24 recheados no 5×5 ou 24/12 no 7×7; Bordinhas de
  100 g/R$ 6 com saquinho de R$ 0,11 e adesivo; bombom com cerca de 50 g de
  cobertura; kit de quatro sem embalagens internas e com um adesivo externo.
- [x] **Orçamento e taxas:** fixos de R$ 2.288, incluindo MEI de R$ 88,
  energia e R$ 600 de mão de obra (quatro diárias de R$ 150). Débito 1,43%,
  crédito 3,36%, Pix R$ 0,49 por pagamento; sem média presumida por local.
- [x] **Recebimentos e lucro conjunto:** bruto/taxa/líquido preservados,
  despesas classificadas, lucro após CMV/taxas/despesas e progresso da meta
  em Financeiro/Visão geral, sem descontar orçamento ou custos produtivos
  novamente. Ausências relevantes deixam o resultado indisponível.
- [x] **Metas e cenários:** versões auditadas, mix normalizado em 100%,
  ativação do cenário revisado e preservação do anterior; resumo conjunto,
  detalhes expansíveis, editor modal com prévia e confirmações com motivo.
- [x] **Dashboard e usabilidade:** painel estruturado, atalhos, reposição,
  navegação reorganizada e modais de Produtos, Categorias, Locais, Compras,
  Produção, Vendas e Despesas; filtros, paginação e estados explícitos.
- [x] **Revisão de Compras/Produção:** total da compra sem multiplicar a
  quantidade novamente, unidades legíveis, opcionais agrupados, prévia
  invalidada após alterações, custos limpos após salvar, auditoria em modal
  e sucesso de gravação separado de falhas de atualização visual.
- [x] **Relatórios e diagnósticos:** receita/volume/ticket, ranking por
  unidades, margens e CSV seguro; razão/FIFO/reversões, cobertura de entrega e
  conferência integrada de estoque, produção e CMV. Os diagnósticos só leem os
  fatos e preservam ausências como ausências. Indicadores/alertas adicionais
  permanecem em F03.
- [x] **Ensaios locais:** custos, produção/FIFO e recebimentos/lucro em
  PostgreSQL 17 descartável; rollback/replay dos pacotes específicos;
  ensaios de navegador e conferências autenticadas sem fatos fictícios no HML.
  Esses ensaios não substituem o aceite integrado por todos os perfis.

## F02 — conferência de integridade consolidada

**Estado: concluído e validado no HML em 19/10/2026.** A conferência única
cobre estoque, produção e CMV por competência, preservando as três famílias de
diagnóstico existentes e acrescentando a visão integrada.

- [x] Cobertura inventariada entre estoque de insumos, custos produtivos,
  saídas/camadas/reversões FIFO e CMV por competência.
- [x] Resultado unificado com origem e referência rastreáveis, sem correção
  automática.
- [x] Ensaios isolados de coerência, custo ausente, cobertura parcial,
  reversão excessiva, referência de venda ausente e custo racional exato.
- [x] Critérios e evidências registrados; ausência permanece explícita, sem
  custo zero ou saldo fictício no HML.

**Aceite técnico:** divergências identificáveis e explicáveis; nenhuma
alteração financeira, de estoque ou de histórico pela rotina. O commit
`a3ec96b` foi publicado somente no `cacau-v1-hml`, versão
`0f95738a-356b-4662-ad76-f03220c5f066`. A conferência autenticada confirmou a
seção integrada, as contagens zeradas coerentes com a ausência de fatos reais,
a meta conjunta de R$ 10.000 e a ausência de erros no navegador. Nenhum fato
sintético foi gravado no HML.

## Pendências para fechar a validação técnica

| ID | Estado | Resultado que falta |
| --- | --- | --- |
| S01 | Concluído | Inventário cobriu catálogo, locais, parâmetros gerenciais, planos, cenários, operações, produção, finanças e lifecycle de estoque. As seis mutações de catálogo e criação/conclusão de lote, lacunas encontradas, agora gravam ator e evento operacional na mesma transação; falha da auditoria reverte a escrita. Autenticação mantém trilha própria; diagnóstico e prévia de produção são POST somente leitura. Contrato automatizado impede regressão. |
| T02 / #36 | Parcial; issue encerrada no GitHub | Preparação/revisão offline integradas via `db:prepare` e `db:review`, com oito referências de catálogo PostgreSQL 17 e treze ensaios de instalação, upgrades, preservação, replay, drift, rollback e geração futura; 38 tabelas conferidas. Falta classificar independentemente os alvos relevantes e definir plano/autorização específicos para futuras aplicações compartilhadas. A aplicação específica até `0033` já tem 36 recibos; não reaplicar. Detalhes em `MIGRATION-CHAIN-REMEDIATION-ADR.md`. Nenhum comando novo executa SQL; `db:migrate` permanece bloqueante e `db:push` não é atalho. |
| T03 | Concluído no escopo isolado | Workflow aprovado na `main` `b82e044`: dois runners PostgreSQL 17, 39 casos de fixtures UI e dez conectados. A correção de ordenação da razão está publicada no HML. Aceites reais H01–H03/H06 continuam separados; a causa upstream do incidente histórico de sessão permanece inconclusiva. |
| H04 / H05 | Concluído no laboratório isolado; aceite real separado | Dez casos conectados aprovados: compra em kg → consumo em g → produção → venda → recebimento/entrega → lucro; cancelamento, devolução, crédito/resgate parcial, reembolso e fechamento/correção. Backend/banco, transações, rollback e falhas cobertos também pelos runners. Interface/HTTP reais com identidade sintética; não substitui H01–H03 nem o piloto I05. Não gravar fatos sintéticos na base compartilhada. |
| H01 / H02 | Parcial | Completar login/logout, expiração/revogação, OTP/reset, cooldown, limiter e Turnstile válido/inválido/replay. Roteiro/coleta integrados: [AUTH-HML-ACCEPTANCE.md](AUTH-HML-ACCEPTANCE.md). Recuperação de leitura do Dono relatada; dois HTTP 429 anteriores e um na nova versão, sem causa/correlação individual ou solução permanente comprovadas. [Investigação](AUTH-HML-SESSION-LIMIT-2026-10-21.md). |
| H03 | Parcial; roteiro dos perfis ativos aceito | Laboratório aprovou quatro perfis, matriz negativa das 55 políticas, ausência de escrita na negação e revogação na próxima chamada. No tablet, usuário confirmou employee/manager/owner, Dashboard negado ao Funcionário e permitido aos demais, Parâmetros negado a Funcionário/Gerente e permitido ao Dono; interface/controles conforme roteiro, sem salvar. Após publicação, Dono confirmou Cenários/Financeiro. [Aceite manual](AUTH-HML-PERMISSIONS-MANUAL-2026-10-21.md). Repetição automática com identidades sintéticas isoladas, não com sessões reais no HML. Falta cobertura ampliada real e estabilidade; não conceder papéis para contornar testes. |
| H06 | Parcial; QA automático ampliado | 40 casos de fixtures aprovados, incluindo Enter/Shift+Tab/Escape, foco e ausência de overflow em 320px com redução de movimento. Relatório/CSV e 390px já comprovados no laboratório conectado. Falta aceite no ambiente publicado por perfil, celular físico, acessibilidade/uso diário pela operadora; não equivale a auditoria WCAG completa. |
| T04 | Concluído | Oxfmt alinhado; 21 testes do controlador simulado, Oxc1.64.1 conferida e Python3.12 validada. ActionsNode24 revisadas, Ubuntu24.04 fixado; CI sem avisos de runtime. |
| S03 | Hardening integrado; nova vulnerabilidade em A02 | launch-editor 2.14.2 e #55 entregues; configuração CodeQL legada reconciliada. Audit zero é histórico: revisão de 23/10 encontrou Zod vulnerável no grafo, a corrigir em A02 com regressão/audit/compatibilidade. |

## Preparação e liberação da operação

| ID | Estado | Resultado que falta |
| --- | --- | --- |
| G01 | Concluído no escopo documental desta rodada | README/roadmap/status, arquitetura/controles, workflow, QA, resiliência, ambientes, paridade, checklist e fila/handoff reconciliados. Fila é espelho do roadmap, sem pacotes ready; evidências históricas preservadas. Incremento integrado nas PRs #51–#53. |
| G02 / I01 | Plano formalizado; laboratório conectado entregue | `QA-VALIDATION-PROTOCOL.md` define topologia, dados, responsabilidades e critérios; `CONNECTED-QA-2026-10-20.md` comprova interface/HTTP/PostgreSQL isolados. Resta consolidar identificação/configuração dos destinos e identidades para aceites reais e operação. Não presumir a original `production` como laboratório. |
| G03 | Concluído; ruleset ativa | Após autorização do Dono, a ruleset `main-production-integration` (ID 25611109) foi aplicada e lida de volta: main `protected:true`, sem bypass, PR atualizado, conversas resolvidas, sete checks exigidos, sem force push/exclusão e CodeQL bloqueando alertas de segurança altos/críticos. Política de mantenedor único mantém zero aprovações formais; o Dono continua aprovando merges conforme a governança. [Registro](MAIN-PROTECTION-PROPOSAL.md). |
| T01 | Concluído | PRs #44–#53 mescladas, main de aplicação `91658ed` com CI/negócio/browser/CodeQL aprovados e publicação HML confirmada. Segurança administrativa segue em S03/G03, aplicação genérica em T02 e produção em I04; integração não dispensa esses gates. |
| I02 | Restore externo concluído; política parcial | Baixados dump/manifesto do Drive, conferidos SHA-256/tamanho e restaurados esses bytes em PostgreSQL 17 sem rede: 38 tabelas/36 recibos exatos e catálogo independente de 0033. Recibo evidence/offsite-restore-2026-10-21.json. Restam retenção, responsáveis, periodicidade, RPO/RTO e recuperação de Auth, excluído do dump public/drizzle. Não apagar backups para abrir quota. |
| I03 | Parcial; frequência divergente em A03 | Diário 03h era o planejamento anterior; revisão observou regra semanal quinta 00:15, fuso a reconfirmar. Validar execução/upload/alerta de falha, completar logs/correlação e decidir disponibilidade independente do computador/app. E-mail de teste e restore históricos não comprovam continuidade. |
| I04 | Pendente / gate humano | Liberação definitiva somente após revisão/integridade/QA, integração, plano de recuperação, configuração revisada dos ambientes e aceite humano. Configurações HML existentes não precisam ser refeitas; secrets/DNS/produção exigem autorização específica. |
| I05 | Pendente / operação autorizada | Após os aceites e a recuperação, conduzir piloto com a operadora e fatos reais expressamente autorizados: compra, produção, venda, recebimento, entrega e conferência de lucro/estoque. Registrar problemas e decisão de aceite; não criar demonstrações fictícias no HML nem iniciar compras/produção sem previsão real. |

Checkpoint GitHub de 21/10: PRs #44–#53 mescladas e issue #36 encerrada.
Consulta nova de 23/10 confirma #55/#59/#60 integradas e #61–#64 abertas.
Atualização documental não habilita o migrador nem altera proteções.

## Ajustes operacionais e evoluções de produto

| ID | Estado | Escopo restante e dependência |
| --- | --- | --- |
| O05 | Quando houver operação real | Registrar compras ou saldo inicial documentado e autorizado; depois iniciar produção real. A ausência atual de operações não é defeito nem motivo para criar demonstrações no HML. |
| O06 / O09 | Configuração a conferir | Pontos de reposição, fornecedores e locais/canais efetivamente usados, com fonte válida. Cadastro vazio não justifica valores inventados; alertas de cobertura dependem de histórico. |
| O10 | Condicional | Importar histórico somente se solicitado, após conferir fonte, aliases, custos, duplicidade, corte e referências inéditas. Os recibos de catálogo não autorizam essa importação. |
| O11 | Condicional | Definir manutenção diária versionada de receitas/perfis/tarifas: procedimento controlado existente ou gestão pela interface, com auditoria. Não alterar versões usadas silenciosamente. |
| F01 / F03 | Parcial | Lucro conjunto e recebimentos já estão entregues. Revisar somente indicadores/alertas adicionais ainda necessários, como contribuição, margem mínima realizada e comparação específica por canal. Ranking por sabor exige taxonomia; distinguir competência de caixa e não prometer conciliação bancária completa. |
| F04 | Depende de histórico | Cobertura em dias e sugestão de reposição exigem consumo confiável, janela e regra aprovadas. Estoque vazio não é recomendação automática de compra. |
| S02 | Condicional | Definir gestão de concessão/revogação/troca de papel pela interface, preservando permissões e autoria. Dupla aprovação não é controle já entregue. |
| R01 | Evolução futura | WhatsApp: ADR, webhook validado, evento persistido, idempotência/retry, interpretação sem bypass das regras, confirmação e auditoria. |
| R02 | Evolução futura | Notas/OCR: armazenamento/upload seguro, extração candidata, validação, deduplicação, vínculo com compra e política de retenção. |
| R03 | Evolução futura | Pagamentos parciais/mistos/parcelados, integrações de operadora, conciliação e logística ampliada conforme necessidade aprovada. Recebimento integral por meio já foi entregue. |
| R04 | Condicional | Multitenancy/SaaS somente após decisão sobre memberships, tenant ativo e mapeamento histórico. Não atribuir tenant fictício aos fatos; não é pré-requisito para uma única operação interna. |
| R05 / R06 | Evolução futura | Planejamento entre lotes, gestão avançada e XLSX conforme necessidade. A UX diária revisada e o CSV existente já estão entregues. |
| R07 | Condicional | Avançar automação/autonomia somente após avaliação do piloto e estabilidade; multiagente requer autorização. A retomada pontual das 02:33 foi concluída e não cria recorrência. |
| S04 | Parcial; incremento tipado integrado e publicado | Finanças, lifecycle e Cenários sem `any` explícito nos módulos tratados; contratos derivados do driver/schema, callback genérico, seleções/snapshots inferidos e falha controlada para resultados obrigatórios ausentes. PRs #52/#53 integradas e publicadas no HML; 570 testes Node e 12 casos conectados isolados aprovados, incluindo lifecycle e rollback dos cinco writers de Cenários. [Transações](TYPED-TRANSACTIONS-2026-10-21.md), [Cenários](TYPED-SCENARIOS-2026-10-21.md), [publicação](JOINT-HML-PUBLICATION-2026-10-21.md). Restam extrações graduais em operações/produção/financeiro. Cálculos, versões, ativação e permissões preservados; nenhuma migration. |

## Pendências antigas encerradas ou substituídas

- Não refazer cadastro de ovos/insumos/receitas/perfis, definir novamente
  recheios/embalagens ou pedir novamente taxas, diária, energia, rendimento e
  meta. Os pacotes e as decisões já foram aplicados.
- Não reabrir restore, bootstrap de acesso, publicação do limiter ou aplicação
  específica de migrations como tarefas inéditas. O que resta está delimitado
  em H01–H03, T02 e I02.
- Não ativar de novo o primeiro rascunho do mix: o cenário revisado já está
  ativo e o original está arquivado com histórico preservado.
- Não repetir publicações antigas de UX ou a conferência de CI de `e890e3d`
  como gate atual: o código que as sucede foi publicado com CI/CodeQL próprios.
- Anotações antigas de 13 vulnerabilidades ou audit zero são históricas.
  A revisão de 23/10 registrou quatro pacotes altos, uma causa raiz Zod;
  correção e nova auditoria acompanham A02. Nenhum audit novo nesta reconciliação.
- As novas identidades de Gerente e Funcionário já foram concedidas e tiveram
  entrada confirmada. Aceite completo permanece H03. Acessos adicionais,
  multitenancy e importação histórica são condicionais; não bloqueiam
  genericamente a validação técnica autorizada.

## Evidências de referência

As fontes abaixo comprovam entregas e limites, sem constituir roadmaps paralelos:

- [Estado canônico e publicações](PROJECT-STATUS.md).
- [Validação automática de segurança/recuperação](AUTOMATIC-READINESS-2026-10-21.md),
  [procedimento T02](MIGRATION-OPERATOR-PROCEDURE.md) e
  [proposta G03](MAIN-PROTECTION-PROPOSAL.md).
- [CI da main b82e044](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349886),
  [negócio/browser conectado](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349936)
  e [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/39538349907).
- [Validação conectada, backup e alertas](CONNECTED-QA-2026-10-20.md).
- [Protocolo de QA](QA-VALIDATION-PROTOCOL.md) e
  [primeiro acesso publicado](AUTH-FIRST-ACCESS-2026-10-20.md).
- [PR #49 integrada](https://github.com/naiguelcabral/seus-brownies/pull/49) e
  [issue #36 encerrada](https://github.com/naiguelcabral/seus-brownies/issues/36).
- [Estado da branch main](https://api.github.com/repos/naiguelcabral/seus-brownies/branches/main)
  e [rulesets consultados](https://api.github.com/repos/naiguelcabral/seus-brownies/rulesets)
  (retrato de 21/10; estado remoto pode mudar).
- [Revisão integral do workbook](ATTACHED-WORKBOOK-COMPLETE-REVIEW-2026-10-18.md).
- [Custos, recuperação e taxas aplicados](COST-RECOVERY-FEES-HML-2026-10-18.md).
- [Recebimentos e lucro publicados](PAYMENT-SETTLEMENT-PROFIT-HML-2026-10-18.md).
- [Cenários publicados](SCENARIO-UX-HML-2026-10-19.md).
- [Compras e Produção publicados](PURCHASE-PRODUCTION-UX-HML-2026-10-19.md).
- [Conferência integrada de integridade e recibo HML](INTEGRITY-RECONCILIATION-2026-10-19.md).
- [Recibo histórico da publicação de Compras e Produção](../../evidence/purchase-production-ux-hml-2026-10-19.json).
- [Runbooks e matriz de ambientes](ENVIRONMENT-MATRIX.md).
- [ADR atual da cadeia genérica de migrations](MIGRATION-CHAIN-REMEDIATION-ADR.md).
- [Gates humanos](HUMAN-APPROVALS.md) e [Definition of Done](DEFINITION-OF-DONE.md).

Ordem recomendada: **A01 e correções A02/A05/A06 → recuperação/autoria/conexões
→ autenticação real e aceite por perfil → antiabuso/FIFO/cabeçalhos/celular
→ piloto autorizado → aceite de produção → WhatsApp/assistente → OCR**.
Frentes independentes podem avançar dentro da autorização vigente. Integração
à `main` e ensaios isolados já estão concluídos; não há compra/produção real
a executar antes de existirem fatos e previsão reais.
