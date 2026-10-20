# Roadmap único — Cacau v1

Atualizado em **20/10/2026**, durante a validação integrada autorizada.
Este é o **único arquivo de planejamento e acompanhamento de pendências**.
Relatórios datados, recibos, matrizes e runbooks preservam evidências e
procedimentos; suas listas antigas não são filas adicionais de execução.

A consolidação substitui os checkpoints repetidos deste arquivo. Seu histórico
completo permanece no Git. Não autoriza executar itens pendentes, mudar regras,
conceder acessos, aplicar migrations ou publicar em produção.

## Prioridade de retomada

Publicação de `6acb11a` revertida após erro500; HML restaurado para `d5cc034`,
raiz307/login200. Investigação comprovou500 preexistente e reproduziu falha de
consulta remota sem sessão. Correção local e instrumentação sanitizada passaram
556 testes e16 casos runtime; CI e publicação ainda serão conferidas. Causa
upstream histórica inconclusiva; ver `HML-SESSION-INCIDENT-2026-10-20.md`.
Backup local privado criado/restaurado com autorização explícita; sem cópia
externa, periodicidade ou alertas automáticos ao Dono. PRs47/48 em rascunho.

## Estado confirmado

| Área | Situação atual |
| --- | --- |
| HML | Código `d5cc034`, Worker `f0c2e0e2-8798-4132-9abc-50c87bf7a973`, 100% do tráfego; metadados reconferidos em 20/10/2026 |
| Trabalho versionado | Última publicação em `feat/input-catalog-kg-purchases`; PR #46 contém preparação/revisão offline. Continuação em `codex/integrated-validation-gates`; publicação HML não equivale a integração na `main` |
| Banco HML | Atualizações específicas aplicadas, 36 recibos; migrador genérico continua sendo tarefa separada |
| Catálogo e produção | 38 produtos; duas versões de receita e 34 perfis contando os históricos; receita 2 ativa com 17 perfis completos e 31 componentes |
| Cenários | Cenário 2/v2/rev2 ativo, 16 produtos orientativos em 100%; cenário 1 e seu histórico preservados |
| Meta | R$ 10.000 de lucro mensal após os custos de **todas as vendas**, inclusive Bordinhas realizadas; sem cotas obrigatórias por produto |
| Operação real | Sem compras ou produção previstas; nenhum fato fictício criado no HML para testar as entregas |
| Última validação de código | 551 testes Node, 35 casos browser, dois runners negócio, 48 casos migrations; CI e CodeQL aprovados em6acb11a. Publicação HML revertida; diagnóstico pendente. |
| Segurança | PR #46 com CI/PostgreSQL/CodeQL aprovados, três análises sem resultados e alerta #10 corrigido; conferência própria exigida para cada incremento |
| Preservação | 21 tabelas acompanhadas com contagens e digests idênticos antes/depois da última entrega |

Legenda: **concluído** significa que o resultado descrito foi comprovado;
**parcial** distingue implementação de homologação; **pendente** exige trabalho;
**condicional** depende de necessidade ou decisão. Nenhum estado implica
liberação definitiva de produção.

## Entregas concluídas

- [x] **Governança e ferramentas:** arquitetura/regras/segurança/DoD, workflow
  Git, TypeScript 7/Oxlint/Oxfmt, Knip e CodeQL na branch de trabalho. A
  integração à `main` permanece separada em T01.
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
| T02 / #36 | Parcial | Preparação/revisão offline adotadas via `db:prepare` e `db:review`, com oito referências de catálogo PostgreSQL 17, manifesto/recibos exatos, coleta independente recente, alvo HML e gates aplicáveis. Treze ensaios provam instalação, upgrades, preservação, replay, drift, rollback e geração futura; 38 tabelas atuais conferidas. Falta classificar independentemente os alvos relevantes e definir plano/autorização específicos para aplicação compartilhada. Detalhes em `MIGRATION-CHAIN-REMEDIATION-ADR.md`. Nenhum comando novo executa SQL; `db:migrate` permanece bloqueante e `db:push` não é atalho. |
| T03 | Concluído no escopo isolado | Workflow validado: dois runners PostgreSQL 17 e 35 casos em oito specs UI com rede restrita. Jobs remotos passaram em6acb11a. Aceite conectado H04/H05 continua separado; publicação estável pendente do diagnóstico HML. |
| H04 / H05 | Parcial | Ensaiar o fluxo completo pela interface, com backend/banco e identidade de teste isolados: compra em kg → consumo em g → produção → venda → recebimento/entrega → lucro; cancelamento, devolução, crédito/resgate, fechamento, concorrência e falhas. Não gravar fatos sintéticos na base compartilhada. |
| H01 / H02 | Parcial | Completar a homologação integrada de login/logout, expiração/revogação, OTP/reset, cooldown, limiter distribuído e Turnstile válido/inválido/replay, preservando controles e auditoria. Sessão e recuperação do Dono já foram comprovadas. |
| H03 | Parcial | Validar Dono, Gerente, Produção e Funcionário, incluindo chamadas diretas e negações por permissão. Usar identidades autorizadas; não conceder papéis apenas para contornar um teste. |
| H06 | Parcial | Concluir o aceite por perfil das telas e relatórios ainda não cobertos, celular, acessibilidade, CSV, filtros/paginação e desempenho percebido. As revisões de UX publicadas não voltam à condição de “não implementadas”. |
| T04 | Concluído | Oxfmt alinhado; 21 testes do controlador simulado, Oxc1.64.1 conferida e Python3.12 validada. ActionsNode24 revisadas, Ubuntu24.04 fixado; CI sem avisos de runtime. |

## Preparação e liberação da operação

| ID | Estado | Resultado que falta |
| --- | --- | --- |
| G01 | Parcial | Este roadmap já foi consolidado. Reconciliar os demais retratos de paridade, ambientes e fila do controlador quando suas frentes forem revisadas; preservar as evidências datadas. |
| G02 / I01 | Plano técnico formalizado; execução parcial | `QA-VALIDATION-PROTOCOL.md` define topologia isolada, identidades/dados permitidos, responsabilidades, referências inéditas e critérios por camada. `ENVIRONMENT-MATRIX.md` reconciliada com metadados atuais. O aceite conectado ainda exige ambiente/identidades próprios; não presumir a original `production` como laboratório. |
| T01 | Pendente | Revisar e integrar o código da branch de trabalho à `main`, reconciliando as PRs #44/#45 e os gates da #36; conferir CI/CodeQL do resultado integrado. Merge depende da aprovação aplicável. |
| I02 | Parcial | Transformar os backups e ensaios específicos já realizados em rotina: retenção, cópia independente, responsáveis, RPO/RTO e restauração periódica. Não apagar backups existentes para abrir quota. |
| I03 | Parcial | Completar logs dos domínios, correlação, monitoramento, alertas de erro/disponibilidade e resposta a incidentes. Logs Cloudflare/auth e auditorias existentes não equivalem a monitoramento completo. |
| I04 | Pendente / gate humano | Liberação definitiva somente após revisão/integridade/QA, integração, plano de recuperação, configuração revisada dos ambientes e aceite humano. Configurações HML existentes não precisam ser refeitas; secrets/DNS/produção exigem autorização específica. |

Conferência GitHub nesta consolidação: PRs #44 e #45 abertas em draft e issue
#36 aberta. Esta tarefa documental não alterou nem encerrou esses registros.

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
- A segunda identidade de Gerente, novos papéis, multitenancy e importação
  histórica permanecem condicionais; não são bloqueios genéricos para continuar
  a validação técnica autorizada.

## Evidências de referência

As fontes abaixo comprovam entregas e limites, sem constituir roadmaps paralelos:

- [Estado canônico e publicações](PROJECT-STATUS.md).
- [Revisão integral do workbook](ATTACHED-WORKBOOK-COMPLETE-REVIEW-2026-10-18.md).
- [Custos, recuperação e taxas aplicados](COST-RECOVERY-FEES-HML-2026-10-18.md).
- [Recebimentos e lucro publicados](PAYMENT-SETTLEMENT-PROFIT-HML-2026-10-18.md).
- [Cenários publicados](SCENARIO-UX-HML-2026-10-19.md).
- [Compras e Produção publicados](PURCHASE-PRODUCTION-UX-HML-2026-10-19.md).
- [Conferência integrada de integridade e recibo HML](INTEGRITY-RECONCILIATION-2026-10-19.md).
- [Recibo histórico da publicação de Compras e Produção](../../evidence/purchase-production-ux-hml-2026-10-19.json).
- [Runbooks e matriz de ambientes](ENVIRONMENT-MATRIX.md).
- [Cadeia genérica de migrations](MIGRATION-CHAIN-REPAIR-0016.md).
- [Gates humanos](HUMAN-APPROVALS.md) e [Definition of Done](DEFINITION-OF-DONE.md).

Ordem recomendada: **T02 e ensaios integrados → homologação por
perfil → integração e sustentação → aceite de produção**. Trabalhos
independentes podem avançar dentro da autorização vigente. Não há tarefa de
compra/produção real a executar antes de existirem fatos e previsão reais.
