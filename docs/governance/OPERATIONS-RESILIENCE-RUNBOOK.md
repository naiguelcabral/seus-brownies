# Runbook de resiliência operacional — Cacau v1

Atualizado em 8 de setembro de 2026. Este runbook prepara a recuperação sem
autorizar escrita em banco compartilhado, deploy, troca de secrets ou alteração
de infraestrutura. Ele não substitui a autorização humana para cada incidente.

## Estado atual e objetivo

O PostgreSQL/Neon é a fonte de verdade operacional. A recuperação primária
proposta usa o histórico de branch e restauração do Neon para uma **branch nova
e isolada**. A restauração em uma branch ativa, corte de tráfego ou troca de
endpoint é ação humana, pois pode afetar dados e sessões em uso.

O Neon documenta restauração a partir de timestamp ou LSN dentro da janela de
histórico e criação de branch a partir desse ponto. A duração real da janela,
limites do plano e permissões da conta devem ser confirmados pelo responsável
antes de se adotar este procedimento. O histórico da plataforma não substitui
uma cópia independente e testada.

## Decisões humanas pendentes

| Decisão            | Recomendação                                                                                   | Impacto                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| RPO                | Definir pela tolerância máxima de perda de lançamentos, em horas.                              | Determina a janela mínima de recuperação e a frequência da cópia independente.                    |
| RTO                | Definir pela indisponibilidade máxima aceitável, em horas.                                     | Determina equipe de plantão, ensaio e prazo para validar uma branch restaurada.                   |
| Cópia independente | Armazenar export criptografado fora do repositório, com acesso mínimo e retenção aprovada.     | Protege contra indisponibilidade da conta/plataforma; exige custo, local e responsável aprovados. |
| Responsáveis       | Nomear dono do incidente e duas pessoas autorizadas a aprovar corte/restauração.               | Evita que uma restauração de dados compartilhados seja feita unilateralmente.                     |
| Retenção           | Definir retenção de backups, auditoria e artefatos sanitizados conforme obrigações do negócio. | Sem esta decisão não há expurgo automático nem promessa de preservação.                           |

Nenhum valor de RPO/RTO, storage externo, plano pago ou configuração de Neon é
criado por este repositório.

## Preparação antes de mudança de risco

Antes de migration, importação, backfill, correção manual ou corte que possa
alterar dados relevantes, o responsável deve:

1. congelar writers e registrar o motivo, responsável e instante em UTC;
2. confirmar a branch alvo, a janela de restauração disponível e que a conta
   permite criar uma branch de recuperação;
3. registrar um ponto de recuperação identificável sem colocar DSN, token ou
   valores de negócio no Git;
4. revisar a migration e seu plano de recuperação;
5. preparar uma branch descartável para o ensaio e manter o ambiente ativo
   separado de qualquer teste;
6. confirmar que não serão reutilizadas referências idempotentes já consumidas.

Para mudanças de schema, conservar o SQL da migration, o commit e as prévias
sanitizadas. Não usar `db:push` como atalho para a recuperação.

## Ensaio de restauração em ambiente descartável

Este ensaio é o critério de aceite da estratégia. Não o execute nesta missão
sem branch descartável e autorização explícita.

1. Criar uma branch de restauração a partir do timestamp/LSN escolhido, sem
   finalizar restauração na branch ativa.
2. Conectar somente por runtime secreto autorizado; não escrever DSN em shell
   history, evidência, artefato ou repositório.
3. Verificar na branch restaurada: versão das migrations, presença das tabelas
   esperadas, contagens agregadas de fatos e integridade de razão/FIFO pela
   reconciliação somente leitura.
4. Executar os testes de aplicação que não escrevem no banco compartilhado e,
   quando autorizado, cenários sintéticos com referências inéditas nessa branch.
5. Comparar a aplicação em modo leitura com a evidência de origem, sem copiar
   dados pessoais, notas, cookies, tokens ou corpos de resposta para os logs.
6. Medir do início da criação da branch até a aprovação da validação. Esse tempo
   é a evidência de RTO, não uma estimativa.
7. Registrar apenas identificador de execução, timestamp, resultado, duração,
   versão de schema e divergências. Descartar a branch de ensaio somente com a
   autorização aplicável; até lá ela é evidência operacional.

Se qualquer verificação falhar, marcar `restore-validation-failed`, preservar a
evidência sanitizada e não promover a branch restaurada.

## Resposta a incidente e restauração

1. Declarar incidente, congelar writers e preservar IDs de operação, auditoria
   e a hora em UTC. Não apagar, truncar ou editar fatos para “corrigir” o
   sintoma.
2. Classificar o alvo: código, configuração, dado operacional ou indisponibilidade
   de plataforma. Código inválido não justifica restauração de dados.
3. Criar e validar uma branch restaurada. Investigar nela antes de decidir o
   corte, mantendo a branch ativa intacta.
4. O responsável humano aprova a fonte e o ponto de restauração, após avaliar
   os lançamentos posteriores que seriam perdidos e a reconciliação.
5. Só uma pessoa autorizada executa o corte/finalização na plataforma. Não
   repetir a chamada se a rede falhar: primeiro verificar o estado da operação,
   porque operações de restauração podem não ser idempotentes.
6. Após o corte, validar autenticação, leitura crítica, reconciliação FIFO,
   idempotência de novas operações e disponibilidade. Reabrir writers somente
   com aprovação registrada.

Se a restauração for rejeitada, manter a branch de investigação e aplicar uma
correção prospectiva auditável. Não existe rollback automático que apague
lançamentos financeiros ou de estoque.

## Rollback de código e deploy

Para incidente causado por código, preferir retornar para o último commit e
artefato aprovados sem reverter dados. Antes de qualquer deploy humano:

1. confirmar commit, migration compatível e evidência da CI;
2. interromper a promoção se o rollback exigir schema incompatível;
3. restaurar apenas uma versão previamente validada;
4. validar smoke de leitura e as métricas combinadas abaixo;
5. abrir incidente corretivo com causa, impacto e plano de prevenção.

Este repositório não contém mecanismo de deploy/rollback automático de
produção, nem a proteção de branch da `main`; ambos permanecem gates externos.

## Observabilidade e artefatos

| Sinal                     | Fonte atual                                      | Regra de captura                                                                                                 |
| ------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Mutação operacional       | `operational_audit_events` após migration `0018` | Ator conhecido, ação, entidade, instante, motivo e referência de operação; falha de persistência impede sucesso. |
| Autenticação              | trilha de auditoria de auth                      | Nunca incluir senha, token, cookie, JWT, e-mail completo ou corpo de request. Retenção aguarda decisão.          |
| Integridade               | reconciliação FIFO somente leitura               | Registrar código da divergência, entidade e IDs relacionados; nenhuma correção automática.                       |
| Disponibilidade/aplicação | logs da plataforma ainda não configurados        | Definir responsável, alerta, correlação e acesso antes de produção.                                              |
| CI                        | GitHub Actions                                   | Mantém resultado de suíte, lint, tipos e build; o workflow atual não envia artefatos.                            |

HAR, trace, vídeo, screenshot, cookies, corpo HTTP, conversa bruta, dump e
arquivo de ambiente não podem entrar no Git ou em artefato público. Artefatos
futuros exigem sanitização revisada, retenção aprovada e exclusão automática
verificável; até essa decisão, não criar coleta adicional.

## Evidência mínima de cada ensaio ou incidente

- identificador da execução e responsável;
- branch de origem e de ensaio, sem URL privada ou credencial;
- momento de recuperação e janela confirmada;
- versão de schema e commit avaliados;
- checks executados, resultado e duração;
- divergências, decisão de corte ou motivo de rejeição;
- aprovação humana para qualquer ação em ambiente compartilhado.

## Critério para promover este runbook

O runbook só passa de preparado para validado quando houver ensaio completo em
branch descartável, RPO/RTO aprovados, cópia independente testada e responsáveis
nomeados. Produção permanece bloqueada até então.
