# Inicialização canônica até 0016 — plano e execução

Plano autorizado pelo usuário. Incidente de restore corrigido sob autorização
específica em [NEON-RESTORE-INCIDENT-2026-10-17.md](NEON-RESTORE-INCIDENT-2026-10-17.md).

## Resultado da execução autorizada

Snapshot `snap-withered-poetry-achs77uu` preservado até
`2026-10-24T18:30:00Z`. Cópia privada `br-super-waterfall-ac0mxtnt`, endpoint
`ep-[redacted:67a3843e]`, isolada após recuperação do incidente. Catálogo
prévio confirmou zero relações/enums de aplicação; digest do catálogo do
schema gerenciado era `bcb4fd4408ebb95ee07cda6b3495acac` (30 relações).

Compilador offline `scripts/auth-baseline-payload.mjs` verificou os 17 hashes
aprovados, gerando 185 instruções para uma transação MCP. Inclui timeout,
lock, search_path público, recusa de qualquer instalação existente ou enum
público prévio e journal na mesma transação dos DDLs. Preserva todos os SQLs
originais e o contrato de hash/timestamp do Drizzle. Não é executor automático
de rede nem substitui o preflight geral bloqueado.

Quatro ensaios locais passaram, incluindo o lote exato do MCP, rejeição de
repetição e rollback completo de tabelas/journal. Na cópia Neon, aplicação e
verificação passaram: 17 hashes/timestamps idênticos ao manifesto, 60 relações
de aplicação, 15 enums, três tabelas auth e zero vínculos de acesso. Escrita de
auditoria validada com referência **consumida apenas na cópia**
`baseline-copy-validation:20261017:3cfb0309`: intenção e sucesso sintéticos,
sem chamar provedor nem enviar e-mail. Não repetir essa referência.

Original `br-lingering-wind-acwh5wap`, nome `production`, default/primary e
endpoint `ep-[redacted:26398d41]` revalidados. Antes do DDL, zero relações e
enums de aplicação, digest gerenciado idêntico à cópia. Mesmo lote aplicado
sob a aprovação condicional; verificações posteriores confirmaram os mesmos
17 recibos até `0016`, três tabelas auth, 60 relações/15 enums e digest
gerenciado inalterado. Zero vínculos de acesso. Nenhuma migration `0017+`
executada e nenhum usuário/secret/papel Postgres alterado pelo pacote.

Validação por digest é de **catálogo**, não leitura/comparação do conteúdo
de identidades/sessões. Os SQLs limitados a `public`/`drizzle` não modificam
o schema gerenciado. Não afirmar homologação integral ou entrega de e-mail
antes da tentativa real pelo usuário, que foi solicitada após a aplicação.

Telemetria após a aplicação já confirmou `provider_request_started` em
epoch ms `1792261912424`, `provider_request_succeeded` em `1792261913782` e
`completed` em `1792261913931` (`2026-10-17T18:31:53.931Z`). Provedor aceitou
a solicitação e o lifecycle auditado concluiu; recebimento do e-mail,
consumo do token e troca da senha foram depois confirmados pelo usuário.
A concessão de acesso permanece pendente, conforme registro de recuperação.
Resposta de sucesso não prova existência da conta nem entrega SMTP.
Evidência de aplicação: [auth-baseline-0016-execution-2026-10-17.json](evidence/auth-baseline-0016-execution-2026-10-17.json).

## Problema comprovado

O Worker retorna `42P01` na auditoria que antecede o envio de recuperação.
Catálogo autorizado de `steep-brook-51659857` /
`br-lingering-wind-acwh5wap` (`production`) / `neondb`, sob READ ONLY,
confirmou ausência das três tabelas auth e do journal. Inventário ampliado
autorizado retornou zero tabelas normais/particionadas, views, materialized
views e sequences em `public`/`drizzle`, e ausência dos dois enums auth.
Isso não afirma ausência de usuários/sessões no schema gerenciado Neon Auth,
que não foi lido, nem ausência de todos os tipos/funções/foreign tables.

Não basta criar apenas `auth_audit_events`: o login usa `auth_login_attempts`
e o acesso usa `app_user_access`. Aplicar somente `0014` e marcar seu journal
como se `0000–0013` estivessem instaladas falsificaria a baseline e faria o
migrador pular pré-requisitos. A proposta usa os arquivos originais, em ordem.

## Pacote exato

Migrations `0000_groovy_gamora` até `0016_migrate-admin-to-owner`: 17 arquivos,
sem alteração de conteúdo. Nomes, timestamps e SHA-256 no manifesto
[evidence/auth-baseline-0016-2026-10-17.json](evidence/auth-baseline-0016-2026-10-17.json).
Os arquivos originais continuam em `drizzle/`; a cadeia ativa não foi alterada.

Checkpoint final: estrutura de catálogo/estoque/produção/FIFO até `0013`,
as três tabelas de autenticação da `0014`, enums canônicos da `0015` e
transição `0016`. Na base nova, não há acesso admin a migrar: o teste confirmou
zero vínculos de usuário. Não criar usuário, cadastrar identidade, conceder
Dono, preencher dados de negócio ou importar históricos neste pacote.

Não aplicar `0017–0028`; não resolver regras financeiras ou nomes históricos
por esta autorização. A baseline até `0016` não homologa os recursos mais
recentes do aplicativo. Depois da recuperação de senha, autorização de acesso
e etapas posteriores do roadmap ainda precisam de seus próprios gates.

## Ensaios concluídos sem Neon

PostgreSQL 17 descartável em loopback, credenciais sintéticas, sem dotenv:

1. Arquivos copiados para fixture são idênticos byte a byte aos originais.
2. Migração de base nova até `0016` concluiu e journal contém os 17 hashes e
   timestamps reais. Não há migração `0017` nesse conjunto.
3. `executeAuditedPasswordReset` com writer Drizzle real e provedor simulado
   gravou intenção e sucesso, chamando o provedor uma vez.
4. Estado de tentativa de login pôde ser inserido/lido; papel owner/employee
   existe, mas nenhum usuário recebeu acesso.
5. Reaplicar o mesmo conjunto não repetiu recibos no journal.
6. Falha forçada ao fim reverteu tabelas de aplicação e todos os recibos.
   O migrador Drizzle cria o journal fora da transação de aplicação: após falha
   pode restar journal vazio, o que não deve ser tratado como migração aplicada.
7. Marcador sintético em schema `neon_auth` permaneceu intacto nos dois casos.

Reprodução: `node --import tsx scripts/test-auth-baseline-disposable.mjs
--ack-disposable-postgres17`, exclusivamente com o PostgreSQL sintético
`127.0.0.1:5433` da fixture existente. O script não aceita DSN nem alvo remoto.
Ensaio incorporado ao workflow PostgreSQL 17. Não reutilizar as fixtures
marcadas disposable como executor remoto.

Validação desta preparação: dois cenários PostgreSQL 17 aprovados, 476 testes
gerais aprovados, typecheck, lint sem avisos, formatação e diff check aprovados.
O container sintético foi removido ao fim. CI remota ainda não executada para
este pacote. Aplicação e migrations existentes não foram modificadas; nenhum
novo build/deploy do Worker foi necessário nesta preparação.

## Procedimento aprovado — etapas 1–5 executadas

1. Criar snapshot privado da branch declarada, nome
   `cacau-before-baseline-0016-20261017`, com validade de sete dias. Confirmar
   identificador/estado. A listagem de snapshots atual retornou zero.
2. Restaurar esse snapshot em **nova branch privada temporária**
   `cacau-baseline-0016-validation-20261017`, sem substituir ou promover a
   branch original. A cópia mantém dados gerenciados; não imprimir seus valores.
3. Revalidar manifesto e obter catálogo da cópia. Confirmar ausência de
   relações de aplicação, journal e tipos de enum que os scripts criam.
   Se houver divergência ou qualquer objeto conflitante, parar para revisão.
4. Aplicar exclusivamente o pacote canônico na cópia, transacionalmente,
   com timeouts e `search_path` limitado a `public`. Journal deve conter
   somente recibos reais de SQL aplicado, conforme contrato Drizzle instalado.
   Conferir os 17 hashes, tabelas auth, tipos e preservação do schema gerenciado.
   Ensaiar escrita de auditoria na cópia com referência sintética inédita,
   sem envio de e-mail ou alteração de identidade/credencial.
5. Somente se a cópia passar, e sob autorização explícita para produção,
   revalidar ausência de instalação concorrente no alvo original e executar
   **o mesmo pacote e hashes**, sem `db:push`, sem invocar o comando completo
   `db:migrate` bloqueado e sem reclassificar produção como HML. Uma divergência
   bloqueia a aplicação; não adaptar SQL automaticamente para fazê-lo passar.
6. Validar journal/catálogo e usuário solicita novamente a recuperação pela
   UI de HML. Confirmar telemetria do provedor, auditoria e recebimento, sem
   expor token. Usuário conclui pessoalmente a troca de senha.

Este pedido precisa autorizar tanto os recursos temporários de recuperação
quanto o DDL do pacote na branch `production`, condicionado ao ensaio. As
aprovações de catálogo e deploy anteriores não autorizam esse DDL.
Não altera secrets, DNS, Worker principal, roles de Postgres, política de
sessão, exigência de verificação ou schema gerenciado pelo provedor.

## Falha e recuperação

Falha durante a transação: rollback, registrar SQLSTATE sanitizado e parar.
Não forçar journal, ignorar erro, avançar até `0017` ou remover constraints.
Depois do commit: preservar eventos novos e interromper a expansão se houver
falha; não apagar tabelas nem restaurar a base inteira automaticamente.
Snapshot e cópia são pontos de recuperação para intervenção aprovada; restore
sobre a branch original pode afetar identidades e exige decisão própria.
Não excluir snapshots/cópias nem dados existentes automaticamente.
