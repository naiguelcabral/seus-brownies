# Procedimento para futuras migrations — T02

Revisado em 21/10/2026. Preparação/revisão offline entregues; **aplicação
compartilhada bloqueada** até os gates específicos. Este procedimento não
autoriza SQL externo e não substitui o [ADR da cadeia](MIGRATION-CHAIN-REMEDIATION-ADR.md).

## Estado comprovado

- Linha forward-compatibility-v1 conserva SQLs, hashes, timestamps e snapshots.
- Alvo histórico já atualizado até 0033: 36 recibos, não reaplicar.
- Cópia externa restaurada em PostgreSQL 17 isolado: recibos exatos e catálogo
  canônico de 0033 conferidos. [Recibo](../../evidence/offsite-restore-2026-10-21.json).
- [Metadados Neon](../../evidence/environment-metadata-2026-10-21.json)
  reconfirmam dez branches no projeto usado pela operação. A original
  br-lingering-wind-acwh5wap continua production, primary/default; Development
  e g1-auth-hml têm IDs próprios. Metadados não comprovam schema atual,
  role não gravável ou destino de um binding secreto.
- Esta rodada não consultou SQL no Neon, não alterou role/branch/endpoint e
  não reclassificou ambientes. O restore não é coleta atual do alvo vivo.

## Sequência do operador

1. Identificar projeto, branch, database, classificação e versão efetiva do
   Worker. Conferir vínculo sem copiar credencial/URL privada para evidência.
   Não usar nome HML ou status ready como prova de destino seguro.
2. Obter acesso de auditoria já aprovado e comprovadamente não gravável.
   Criação de role/grants ou alteração de secret exige autorização própria.
3. Coletar independentemente, só em leitura, todos os recibos/hash/timestamps
   e as nove seções de catálogo. Preservar identidade/proveniência/UTC;
   catálogo driftado, recibo parcial ou objeto manual exige plano próprio.
4. Preparar pacote com `npm run db:prepare`. Conferir manifesto e snapshots;
   o diretório temporário é material de inspeção, não uma nova cadeia ativa.
5. Usar `npm run db:review -- --evidence evidence/<metadados>.json` somente
   com metadados sanitizados, coleta de até 30 minutos, classificação/vínculo
   comprovados e decisões aplicáveis. A original conhecida como production
   permanece recusada mesmo se rotulada HML. Não criar fixture para contornar.
6. Antes de aplicar em ambiente compartilhado: revisar diff SQL, impacto,
   recuperação/restore, decisões específicas (0019/0028 se pendentes), locks,
   preservação, rollback e autorização delimitada. READY_FOR_OPERATOR_REVIEW
   conserva application_authorized:false e execution_enabled:false.
7. Após qualquer execução especificamente autorizada, reler estado/recibos e
   comparar catálogo e preservação. Em resposta incerta, consultar o journal
   antes de repetir. Não reutilizar referências, editar recibos ou executar
   db:push para ocultar divergências.

Instalação nova não importa catálogo/receitas/cenários nem adota parâmetros
atuais por inferência. Esses provisionamentos exigem fonte e autorização
próprias. `db:migrate` continua preflight bloqueante; nenhuma ferramenta desta
rodada passa a aplicar SQL automaticamente.
