# Espelho de execução do roadmap — Cacau v1

Atualizado em 26/10/2026. O [ROADMAP-CODEX.md](ROADMAP-CODEX.md) é a única
fonte de tarefas e prioridades. Este arquivo apenas adapta seus estados ao
controlador conservador; não cria autorização, dependência ou fila paralela.
As tabelas antigas foram substituídas; seu histórico completo permanece no Git.

## Pacotes

| ID | Pacote | Tipo | Estado | Resultado e dependência canônica |
| --- | --- | --- | --- | --- |
| A59 | Continuidade local de Auth e conexões | codigo | done | Candidata b4ae5cb sobre f2a7fc7: lifecycle por Server Function, correlação HMAC, limites por origem/localidade e hostname/action. 614 Node, gates de qualidade, build e 12 conectados aprovados; os 12 checks e CodeQL do código aprovados. Pacote entregue e integração da PR #74 autorizada; resultado de merge/CI final na PR. A04 parcial e prova HML/gates externos pendentes; nenhuma publicação autorizada nesta integração. |
| A58 | Ajustes locais de pré-publicação | codigo | done | Pacote de código entregue na PR #72 e integração autorizada na continuidade: A02, partes de A04/A08, A09/A10 e preparações L01/L07/L08/L09. 601 testes Node, 12 conectados, 40 fixtures e gates locais aprovados; checks do código e CodeQL aprovados. Resultado de merge/CI final na PR; publicação e pendências maiores continuam separadas. Ver seção atual do roadmap. |
| A50 | Segurança e dependências | codigo | done | Pacote versionado entregue na main por #61/#63/#62/#64; auditoria zerada e gates reconferidos. #65 consolida o recibo. Limites A02, redação publicada A05 e headers globais A10 continuam pendências próprias; não refazer a atualização. |
| A51 | Recuperação externa | auditoria-leitura | done | I02: dump efetivamente baixado do Drive, SHA-256/manifesto conferidos, restore PostgreSQL 17 sem rede, 38 tabelas/36 recibos exatos e catálogo independente. Retenção/RPO/RTO/responsáveis e Auth continuam separados. |
| A52 | Aplicação futura de migrations | auditoria-leitura | needs-human | T02: preparo/revisão offline entregues; original continua production. Exige alvo/role read-only/vínculo Worker, coleta atual e plano/autorização específicos. Não reaplicar 36 recibos. |
| A53 | Autenticação e perfis reais | auditoria-leitura | needs-human | H01–H03: laboratório sintético aprovado; faltam Neon Auth/Turnstile reais e matriz por identidade autorizada. |
| A54 | Teclado e tela móvel | codigo | needs-human | H06: incremento automático já integrado/publicado; aceite no celular físico e uso diário pendentes. A10 acompanha cabeçalhos. |
| A55 | Proteção de integração | documental | done | G03: ruleset ativa e relida; #55 integrada. Não reaplicar configuração. |
| A56 | Sustentação, piloto e liberação | documental | needs-human | A01/A03 e I02–I05: registrar/revisar a coleta parcial de revogação, reconciliar backup semanal observado versus diário planejado, política/Auth/alertas, fatos reais e aceite definitivo. |
| A57 | Lacunas complementares | codigo | needs-human | L01–L09 do roadmap: configuração do Worker de produção, papel de banco mínimo, trilha de consultas, ambientes, visibilidade de falhas, LGPD, cobertura, SDK beta e worktrees por agente. Partes de código podem ser preparadas localmente; banco, secrets e política exigem decisão do Dono. |

Nenhum pacote está exatamente `ready`. O controlador não deve promover
`review-ready`, `needs-human` ou `done` automaticamente. A execução atual foi
conduzida diretamente após autorização do usuário; este espelho não inicia
Codex, delegação, cron ou recorrência.

Sequência e responsáveis estão exclusivamente na tabela executável do
roadmap. L09 aplicado nesta execução por worktree isolada; formalização
permanece proposta. A50 done refere-se ao pacote integrado; não encerra limites de payload ou redação remota.
Não promover A50/A57 a ready nem iniciar novas recorrências/delegação.

## Seleção e validação

O controlador só seleciona o primeiro pacote com estado exatamente `ready`
ainda não tentado no ciclo. Antes de disponibilizar outro pacote, confrontar
escopo, dependências e autorização com o roadmap e registrar o handoff.
Não tratar instruções históricas de Prettier como procedimento atual:
Oxlint/Oxfmt, builds isolados e checks seguem
[DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md).
Para documentação, revisar links e `git diff --check`. Falha de integridade,
segurança, estoque, dinheiro ou lifecycle bloqueia conclusão; nunca enfraquecer
testes ou alterar baseline para simular sucesso.

Consulte [HUMAN-APPROVALS.md](HUMAN-APPROVALS.md),
[AUTONOMY-HANDOFF.md](AUTONOMY-HANDOFF.md) e
[AUTONOMY-RUNBOOK.md](AUTONOMY-RUNBOOK.md). Merge, aplicação compartilhada e
produção conservam seus gates próprios.
