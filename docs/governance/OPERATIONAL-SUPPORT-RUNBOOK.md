# Sustentação operacional — Cacau v1

Procedimentos de I02/I03, definidos em 20/10/2026. Estados e pendências ficam
somente no [roadmap](ROADMAP-CODEX.md). Não cria contratação, recorrência,
destinatário de alerta, RPO/RTO presumido ou autorização de produção.

## Disponibilidade e incidentes

```sh
node scripts/check-hml-availability.mjs
```

O comando faz somente GET anônimo de `/` e `/login` no HML fixo, sem seguir
redirecionamentos, enviar cookie ou carregar configuração privada. Exige
redirecionamento local para login e login HTML 200; saída sanitizada e status
de processo permitem integração posterior a um monitor autorizado. Não testa
sessão, banco, CAPTCHA, permissões ou escrita. Uma execução manual não prova
monitoramento contínuo nem entrega de alerta.

Em incidente, o operador deve: confirmar disponibilidade; anotar horário,
versão/deployment e referências afetadas; consultar erros e eventos
correlacionados; suspender novas escritas se houver suspeita de integridade;
preservar dados/logs; confrontar a conferência de estoque/produção/CMV; preparar
reparo ou rollback revisável; conferir recuperação e registrar o desfecho.
Não repetir pagamento, lote ou referência consumida para investigar.

Dono decide impacto operacional, recuperação e liberação. Gerente descreve
os fatos afetados e valida o resultado funcional. Agente prepara diagnóstico,
testes e plano; não envia mensagens externas por inferência. Contato, canal,
escala de resposta e destinatários devem ser escolhidos antes de ligar alertas.
Logs HML estão explicitamente habilitados em `observability.logs`, conforme
reconciliação da matriz; auditoria no banco não substitui alerta de indisponibilidade.

Investigação de20/10 em `HML-SESSION-INCIDENT-2026-10-20.md`: HTTP500 pode
coexistir com Worker outcome `ok`; conferir os dois campos. Para falha de sessão,
a instrumentação preparada emite `auth.session.provider`, stage, status HTTP
permitido e código `NETWORK_*` permitido. Correlacionar à invocação sem copiar
request headers, cookies, body ou metadados brutos do SDK. Não inferir queda do
provedor apenas pelo500. A entrada sem token dispensa consulta upstream; sessão
com token permanece fechada se o provedor não puder validá-la.

## Backup e recuperação

Decisão do usuário em 20/10: cópia local na raiz do projeto; alertas internos
destinados ao perfil Dono; duas novas contas de teste/Gerente serão criadas por
ele. O destino técnico é `backups-local/`, ignorado pelo Git e recusado pelo
guard mesmo em staging forçado, com diretório 0700 e arquivos 0600. Trata-se
de cópia na mesma máquina, não de armazenamento independente externo.

O utilitário `create-local-backup.mjs` está preparado para `public` e `drizzle`,
com autenticação da CLI nativa em memória, endpoint direto fixo, TLS verificado
e `default_transaction_read_only=on`. Não inclui o serviço gerenciado de Auth.
O alvo conhecido é a original chamada `production`; o reconhecimento da CLI
também usa esse nome. A revisão automática bloqueou a primeira execução por
falta de autorização explícita desse alvo e do payload potencialmente sensível.
Naquela tentativa nenhum dump foi gerado. Após a pergunta específica, o usuário
autorizou “Autorizar essa cópia somente leitura”. A exportação e restauração
local isolada foram realizadas em 20/10/2026: 222.994 bytes, checksum registrado
no recibo privado, 38 tabelas e 36 recibos exatos. O catálogo canônico coincide
com o checkpoint 0033. O schema `public` vazio do laboratório foi preservado
por renomeação antes do restore; nada foi removido na origem. Diretório e
arquivos estão em 0700/0600. A cópia não inclui Auth gerenciado e não constitui
recuperação completa desse serviço ou cópia externa independente.

Para outra cópia manual, somente sob autorização específica do mesmo alvo:

```sh
node scripts/create-local-backup.mjs --ack-production-branch-local-backup
```

O comando exige a CLI Neon nativa instalada/autenticada e Docker com
PostgreSQL17; nunca registra o DSN. Não aplica retenção automática nem sobrescreve
cópias anteriores. Cada arquivo novo precisa de prova de restore própria; a
inspeção do cabeçalho, sozinha, não comprova recuperação. Não abrir dumps/logs
privados na revisão de código ou incluí-los em artefatos da CI.

Antes de qualquer nova aplicação compartilhada, identificar projeto/branch,
database e vínculo com o Worker; marcar o ponto de recuperação; conferir
conteúdo coberto, acesso, retenção e destino independente; e testar restauração
isolada. Backups e branches históricos existentes são preservados. Não apagar
cópias para abrir quota nem usar janela de histórico como prova de backup
independente.

O registro mínimo de cada execução contém: alvo sanitizado, horário/ponto,
responsável, ferramenta/versão, localização privada da cópia (sem credencial),
checksum, retenção escolhida, resultado e prova da restauração. A evidência de
restore inclui schema/journal, contagens/digests e invariantes de
dinheiro/estoque/FIFO/auditoria; a cópia restaurada não recebe tráfego real.
Dump com dados pessoais fica fora do Git e dos artefatos públicos da CI, em
armazenamento restrito e com retenção/acesso aprovados. Nunca registrar DSN
em argumentos, recibos ou logs.

Periodicidade, retenção, RPO, RTO, destino independente e responsável titular
exigem decisão operacional. Os ensaios específicos existentes não comprovam
essa rotina. Antes de automatizá-la, apresentar configuração e custo do alvo
para revisão, testar falha/alerta e fazer uma restauração medida. A ativação da
rotina só pode ser declarada após execução observada e responsável confirmado.
