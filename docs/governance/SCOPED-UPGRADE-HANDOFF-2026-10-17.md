# Handoff — atualização da original concluída

## Resultado

Original `steep-brook-51659857` / `br-lingering-wind-acwh5wap` / `neondb`
atualizada até `0028` com ponte de compatibilidade aprovada. 31 hashes/timestamps
conferidos; catálogo idêntico ao laboratório/cópia, 38 consultas ORM LIMIT 0
aprovadas. Nove registros existentes em 29 tabelas preservados. Dono e Gerente
ativos. Parâmetros `0019` aprovados e mix novo vazio. Sem novo deploy/secrets.
Recibo: `evidence/scoped-upgrade-execution-2026-10-17.json`.

Backup atual `br-morning-star-ac9j0kkh`, sem compute, LSN `0/1EA56F0`, foi
explicitamente aceito após quota de snapshots. Snapshot antigo preservado.
Cópia ensaiada `br-misty-surf-acbrzli5` / `ep-[redacted:05df6f45]`, compute idle.
Original conserva nome/primary/default e endpoint `ep-[redacted:26398d41]`;
Auth G1 continua em `ep-[redacted:d0e61006]`. Worker HML `1ea59a90` a 100%,
flags diagnósticos desligados. Não reaplicar o lote nem apagar backups.

## Próximo passo

Aguardar usuário confirmar novo login e painel HML. Pergunta assíncrona já
enviada: entrar novamente com Gerente; não pedir senha/token. Navegador do agente
continua anônimo; login público renderizou. Se houver erro, correlacionar apenas
telemetria sanitizada e mensagem, sem adivinhar ou mudar RBAC. Homologações de
vendas/produção/FIFO/finanças e classificação global da cadeia continuam
separadas. `drizzle/` e `npm run db:migrate` não foram modificados.

## Verificações

481 testes gerais, 26 cenários antigos e cinco novos PostgreSQL 17 passaram,
com tipos/lint/check. Ensaio Neon e original passaram em preservação, catálogo,
31 recibos e 38 consultas. Não repetir testes nem SQL sem mudança/falha nova.

## Git e capacidade

Branch raiz `codex/worker-sql-connection-check`, commit de entrega `2b9f681`.
Única alteração não relacionada na raiz: `.env.example`, não lida/incluída.
Encerramento em checkout limpo `/tmp/cacau-worker-sql-probe-release-20261017`,
branch `codex/worker-sql-probe-release-20261017`, avançada por fast-forward ao
handoff antes de executar `./DESLIGARTUDO`. Conferir o resultado da sincronização.

Uso Codex
- restante: 4% (fonte oficial: 96% usado)
- reserva do projeto: 5%
- reset exibido: 2026-10-17 20:09:14 -03
- estado: encerrando por reserva após entrega SQL concluída; UI pendente.

Na retomada, seguir CODEX-USAGE-POLICY: confirmar franquia renovada no horário
de reset ou depois, executar LIGARTUDO e preservar a árvore suja da raiz.
Não prometer retomada automática: nenhuma Automation foi criada.
