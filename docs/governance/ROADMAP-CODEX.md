# Roadmap único — Cacau v1

Atualizado em **22/10/2026**, após a correção de segurança do CodeQL e a
proteção da `main`; a publicação conjunta anterior usou o código `91658ed` no
HML, versão `de9a88e6`, em 100% do tráfego.
Este é o **único arquivo de planejamento e acompanhamento de pendências**.
Relatórios datados, recibos, matrizes e runbooks preservam evidências e
procedimentos; suas listas antigas não são filas adicionais de execução.

A consolidação substitui os checkpoints repetidos deste arquivo. Seu histórico
completo permanece no Git. Não autoriza executar itens pendentes, mudar regras,
conceder acessos, aplicar migrations ou publicar em produção.

## Prioridade de retomada

O núcleo operacional já está integrado à `main`: compra → estoque → produção
→ venda → recebimento/entrega → lucro foi comprovado com interface, HTTP e
PostgreSQL 17 isolados. A identidade desse laboratório é sintética; o aceite
do Neon Auth/Turnstile reais e dos perfis no ambiente publicado continua
separado. Primeiro acesso e ordenação da razão de Relatórios já foram
corrigidos e publicados no HML. Não refazer esses incrementos.

Priorizar H01–H03 (autenticação real e permissões), I02 (definir política de
recuperação após o restore externo comprovado), T02 (ambientes e futuras
migrations) e H06 (uso diário e celular físico). A candidata de hardening do
CodeQL deve passar pelos gates ativos antes da integração. Depois, executar
piloto autorizado e preparar o aceite I04.
WhatsApp e OCR vêm após a validação do núcleo interno.

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
| HML | Código `91658ed`, versão `de9a88e6-a2e0-4224-8c9c-e6f3da8ccb6c`, 100%; deploy, smoke público e Cenários/Financeiro do Dono confirmados. [Recibo](JOINT-HML-PUBLICATION-2026-10-21.md). |
| Trabalho versionado | PRs #44–#53 mescladas; main de aplicação `91658ed`. Integração/publicação HML não equivalem a aceite de produção. |
| Banco usado no HML | Atualizações específicas até `0033`, 36 recibos. A original conserva classificação `production`; seu uso histórico autorizado não a torna laboratório. Migrador genérico continua bloqueante. |
| Catálogo e produção | 38 produtos; duas versões de receita e 34 perfis contando os históricos; receita 2 ativa com 17 perfis completos e 31 componentes |
| Cenários | Cenário 2/v2/rev2 ativo, 16 produtos orientativos em 100%; cenário 1 e seu histórico preservados |
| Meta | R$ 10.000 de lucro mensal após os custos de **todas as vendas**, inclusive Bordinhas realizadas; sem cotas obrigatórias por produto |
| Operação real | Sem compras ou produção previstas; nenhum fato fictício criado no HML para testar as entregas |
| Última validação de código | `91658ed`: CI com 570 testes Node, lint/formato/tipos/Knip/build isolado; negócio/browser e 12 casos conectados PostgreSQL 17 aprovados. Não representa percentual de cobertura. |
| Segurança | launch-editor 2.14.2 integrado/publicado; análises atuais do CodeQL da main `1061f4e` sem resultados. Em 22/10, as duas análises da configuração legada foram removidas pelo procedimento oficial, encerrando os cinco alertas obsoletos sem dispensa individual. A candidata de pins/teste estrutural do workflow aguarda PR. |
| Proteção de integração | `main.protected:true`; ruleset ativa `main-production-integration` (ID 25611109), sem bypass. Exige PR atualizado, conversas resolvidas, sete checks e CodeQL com bloqueio de segurança alta/crítica. Ver G03. |
| Recuperação e alertas | Dump/manifesto efetivamente baixados do Drive e restaurados em PostgreSQL 17 sem rede: 38 tabelas/36 recibos exatos, catálogo independente e constraints validadas. Auth gerenciado excluído; retenção/responsáveis/RPO/RTO pendentes. Backup diário 03h e monitor horário dependem do computador/app/conectores; continuidade não atestada. |
| Preservação | 21 tabelas tiveram contagens/digests idênticos no checkpoint anterior. A publicação de 21/10 não executou SQL/migrations ou salvou operações; não coletou novo digest operacional. |

Legenda: **concluído** significa que o resultado descrito foi comprovado;
**parcial** distingue implementação de homologação; **pendente** exige trabalho;
**condicional** depende de necessidade ou decisão. Nenhum estado implica
liberação definitiva de produção.

## Entregas concluídas

- [x] **Governança e ferramentas:** arquitetura/regras/segurança/DoD, workflow
  Git, TypeScript 7/Oxlint/Oxfmt, Knip e CodeQL integrados à `main`. A
  ruleset G03 está ativa e a configuração CodeQL legada foi reconciliada; o
  hardening versionado do workflow segue na PR candidata.
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
| S03 | Reconciliação administrativa concluída; hardening versionado pendente de PR | launch-editor 2.14.2, regressão e npm audit zero no pacote validado, integrado pelas PRs #51–#53 e publicado. As três análises atuais da main `1061f4e` não tiveram resultados; em 22/10, a configuração `.github/workflows/codeql.yml:analyze` obsoleta foi removida oficialmente, encerrando seus cinco alertas legados sem dispensa individual. A candidata fixa as Actions em SHAs e reforça o teste estrutural antes da integração. |

## Preparação e liberação da operação

| ID | Estado | Resultado que falta |
| --- | --- | --- |
| G01 | Concluído no escopo documental desta rodada | README/roadmap/status, arquitetura/controles, workflow, QA, resiliência, ambientes, paridade, checklist e fila/handoff reconciliados. Fila é espelho do roadmap, sem pacotes ready; evidências históricas preservadas. Incremento integrado nas PRs #51–#53. |
| G02 / I01 | Plano formalizado; laboratório conectado entregue | `QA-VALIDATION-PROTOCOL.md` define topologia, dados, responsabilidades e critérios; `CONNECTED-QA-2026-10-20.md` comprova interface/HTTP/PostgreSQL isolados. Resta consolidar identificação/configuração dos destinos e identidades para aceites reais e operação. Não presumir a original `production` como laboratório. |
| G03 | Concluído; ruleset ativa | Após autorização do Dono, a ruleset `main-production-integration` (ID 25611109) foi aplicada e lida de volta: main `protected:true`, sem bypass, PR atualizado, conversas resolvidas, sete checks exigidos, sem force push/exclusão e CodeQL bloqueando alertas de segurança altos/críticos. Política de mantenedor único mantém zero aprovações formais; o Dono continua aprovando merges conforme a governança. [Registro](MAIN-PROTECTION-PROPOSAL.md). |
| T01 | Concluído | PRs #44–#53 mescladas, main de aplicação `91658ed` com CI/negócio/browser/CodeQL aprovados e publicação HML confirmada. Segurança administrativa segue em S03/G03, aplicação genérica em T02 e produção em I04; integração não dispensa esses gates. |
| I02 | Restore externo concluído; política parcial | Baixados dump/manifesto do Drive, conferidos SHA-256/tamanho e restaurados esses bytes em PostgreSQL 17 sem rede: 38 tabelas/36 recibos exatos e catálogo independente de 0033. Recibo evidence/offsite-restore-2026-10-21.json. Restam retenção, responsáveis, periodicidade, RPO/RTO e recuperação de Auth, excluído do dump public/drizzle. Não apagar backups para abrir quota. |
| I03 | Parcial | Backup diário às 03h Brasília, monitor horário e e-mail de teste configurados; execuções futuras e incidente real não observados. Validar rotina e resposta, completar logs/correlação/alertas dos domínios e decidir disponibilidade independente do computador/app. Automação local não comprova serviço contínuo. |
| I04 | Pendente / gate humano | Liberação definitiva somente após revisão/integridade/QA, integração, plano de recuperação, configuração revisada dos ambientes e aceite humano. Configurações HML existentes não precisam ser refeitas; secrets/DNS/produção exigem autorização específica. |
| I05 | Pendente / operação autorizada | Após os aceites e a recuperação, conduzir piloto com a operadora e fatos reais expressamente autorizados: compra, produção, venda, recebimento, entrega e conferência de lucro/estoque. Registrar problemas e decisão de aceite; não criar demonstrações fictícias no HML nem iniciar compras/produção sem previsão real. |

Conferência GitHub anterior ao recibo final em 21/10/2026: PRs #44–#53
mescladas, issue #36 encerrada e nenhuma PR aberta. O registro final desta
publicação é documental; não habilita o migrador nem altera proteções.

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
- A anotação antiga de 13 vulnerabilidades não descreve a última auditoria
  documentada, que registrou zero. Nesta consolidação não foi executado novo
  `npm audit`; revalidar dependências no gate apropriado, sem inventar estado.
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

Ordem recomendada: **autenticação real e aceite por perfil → recuperação
externa, ambientes/migrations e proteção de integração → uso diário/celular
→ piloto autorizado → aceite de produção → WhatsApp/assistente → OCR**.
Frentes independentes podem avançar dentro da autorização vigente. Integração
à `main` e ensaios isolados já estão concluídos; não há compra/produção real
a executar antes de existirem fatos e previsão reais.
