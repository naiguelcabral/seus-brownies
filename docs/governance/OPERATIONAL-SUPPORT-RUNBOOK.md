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

## Backup e recuperação

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
