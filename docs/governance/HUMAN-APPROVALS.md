# Ações que exigem aprovação humana — Cacau v1

## Correção da apresentação de 24 unidades — 29/10/2026

Usuário relatou 24 mil na tela e confirmou a intenção de somente 24 unidades. O banco já conservava 24; corrigida apenas a apresentação, testada e integrada normalmente pela PR #97. Continuidade da publicação autorizada do piloto aplicada à versão b3688e0d, sem escrita operacional, mudança de contas ou novo lote. [Recibo](../../evidence/pilot-production-quantity-publication-2026-10-29.json).

## Conferência única publicada no piloto — 29/10/2026

Autorização de conferência/publicação aplicada à PR #95 após revisão e checks normais. Piloto f27304c7, 100%, fonte 24c9dc1. Nenhuma inclusão operacional; usuário deve confirmar o manifesto privado na própria sessão do tablet. Compras e rascunho #1 preservados. [Recibo](../../evidence/pilot-adjustment-batch-publication-2026-10-29.json).

## Conferência única dos complementos no tablet — 29/10/2026

Usuário confirmou “O painel abriu” e escolheu “Preparar uma conferência única no piloto, como fizemos com as compras”. Continuidade da autorização de atualizar/publicar o piloto; preparar, validar, revisar e integrar normalmente o fluxo de conferência para confirmação na sessão do próprio usuário. Sem novas permissões ou autoria fabricada. As quatro referências existentes e o rascunho #1 devem ser preservados. Publicar a interface não constitui inclusão operacional nem aceite I05/I04. [Contrato](POSITIVE-ADJUSTMENT-BATCH.md).

## Correção do fluxo do piloto publicada — 29/10/2026

Continuidade do pedido de atualização/publicação do piloto e do relato do
botão: PR #93 revisada e integrada normalmente em `844f425`, com os checks e
as análises reais aprovados. Build/deploy isolado somente no piloto: versão
`48b34e2d`, 100%. Sem concessões, mudança de matriz ou SQL de escrita.

Usuário indicou contas para conferir o Dono e informou novo login. A sessão
controlável ainda recebeu recusa; o agente encerrou essa sessão pela UI e
deixou a aba em login para entrada na identidade correta, sem receber senha
ou código. Complementos continuam pendentes. Rascunho #1 já salvo sob a
autorização de preparação; nenhuma conclusão/venda/pagamento.
[Recibo](PILOT-INVENTORY-PERMISSION-FEEDBACK-2026-10-29.md).

## Continuidade do lote e correção de feedback — 29/10/2026

Usuário confirmou que o botão também não respondia e indicou a sessão e
três contas para conferir o perfil Dono. Consulta privada apenas de leitura
identificou o vínculo correto; nenhuma concessão/alteração de acesso.
A regra FIFO permanece restrita; corrigida somente a apresentação das ações
e mensagens. O rascunho #1 dos 24 brigadeiros foi salvo pela aplicação sob a
autorização anterior de preparar a produção. Sem conclusão/venda/pagamento;
ajustes pendentes da sessão com permissão. [Recibo](PILOT-INVENTORY-PERMISSION-FEEDBACK-2026-10-29.md).

## Publicação da atualização de segurança no piloto — 29/10/2026

Usuário autorizou “Pode publicar a versão atualizada no piloto” e depois
“Vamos seguir”. Aplicado ao pacote revisado: integração normal da PR #91 em
`91299ef`, checks da main aprovados, build/deploy isolado somente em
`cacau-v1-piloto` e fechamento documental. Versão `16a49edf`, 100%, com
configuração preservada. Nenhuma mudança em contas, secrets, Auth gerenciado,
HML anterior ou produção; nenhuma escrita operacional nesta publicação.

Sessão autenticada já existente observada no navegador controlável. Usuário
escolheu preparar somente a produção; não há venda autorizada para registro
por inferência. Aceite completo I05/I04 permanece separado.
[Recibo](PILOT-SECURITY-PUBLICATION-2026-10-29.md).

## Integração da correção de segurança — 28/10/2026

Após apresentação da PR #89 validada, usuário respondeu “Pode seguir a
próxima etapa”. Autorização aplicada à integração desse pacote concreto,
com reconferência do HEAD `0d90bdb`, doze checks e resultados CodeQL, e ao
respectivo fechamento documental. Merge normal em `4dc504b`, preservando
commits e proteções; três workflows da main e suas análises reais aprovados.

Não houve publicação, alteração de provedor/plugins/secrets/contas, escrita
operacional ou mudança de produção. A integração não atualiza o servidor
Neon gerenciado nem encerra I05/I04. Publicação no piloto permanece próxima
etapa separada. [Recibo](SECURITY-ALERT-REVIEW-2026-10-28.md#integração-autorizada).

## Confirmação das compras na sessão do tablet — 27/10/2026

Usuário informou “Deu certo” após a alternativa por colagem do lote já
aprovado. Leitura independente confirmou três compras, sete itens/movimentos,
seis saldos e um cadastro novo, com datas, quantidades e custos exatos iguais
ao manifesto. Auditorias de cadastro e compras correspondem ao ator
autenticado com perfil de gerente ativo; não houve fabricação de principal
ou SQL de escrita pelo agente. Referências consumidas, não repetir as notas
com novas chaves. Esse aceite encerra somente a fase de compras; não inclui
produção, venda, pagamento ou aceite integral de I05/I04.
[Recibo sem dados comerciais](../../evidence/pilot-receipt-purchase-acceptance-2026-10-27.json).

## Automação na sessão do tablet — 27/10/2026

Usuário pediu: “Esse registro de compras eu quero que você faça de forma
automática” e informou não poder acessar o computador. Preparação do fluxo de
importação assistida para usar a sessão autenticada do próprio tablet, com
conferência e confirmação antes da inclusão. O escopo de dados aprovado
abaixo permanece o mesmo. Não autoriza fabricar principal, conceder acesso,
contornar autenticação, gravar por SQL ou incluir dados em outra cópia.
Documentação: [contrato e retomada](PURCHASE-BATCH-IMPORT.md).

PR #85 integrada após 12 checks aprovados e resultados CodeQL conferidos.
Importador publicado exclusivamente no piloto, versão `0cdcdb1d`, com as
configurações preservadas; não houve inclusão operacional nessa publicação.
Manifesto privado entregue ao usuário para confirmação na própria sessão.
[Recibo da publicação](../../evidence/pilot-purchase-batch-publication-2026-10-27.json).

## Ensaio das notas filtradas — 27/10/2026

Após prévia extraída de três imagens, o usuário confirmou embalagens,
excluiu itens domésticos e autorizou: “O recheio está correto, é para o
brownie. Pode seguir com o teste”. Escopo: os insumos selecionados, no piloto
isolado, com data e valores originais, conferência de duplicidade e fluxo
auditado. Não inclui os itens excluídos, produção/venda/pagamento presumidos,
mudança de receita, concessão de acesso ou escrita na fonte original.

Validação adicional da persistência realizada em laboratório local descartável.
Inclusão publicada confirmada no checkpoint acima. Não gravar diretamente
por SQL nem fabricar principal para substituir a autenticação.
Fotos e valores comerciais permanecem fora do repositório público.
[Recibo sem dados comerciais](../../evidence/pilot-receipt-local-validation-2026-10-27.json).

## Continuidade: falha de login do piloto — 26/10/2026

Usuário relatou erro no login e confirmou o uso da mesma conta do endereço
anterior. O atendimento continua no piloto isolado já autorizado: investigação,
correção e diagnóstico mínimo sem dados pessoais, seguindo revisão/CI antes
da publicação. Não autoriza reset de senha por agente, concessão de perfil,
afrouxamento de segurança ou alteração de HML anterior/produção.
[Evidências e limites](PILOT-LOGIN-INVESTIGATION-2026-10-26.md).

## Publicação do piloto executada após retomada — 26/10/2026

Usuário autorizou a configuração e depois a retomada do trabalho. Concluída a publicação do pacote já integrado das PRs #77/#78, somente em `cacau-v1-piloto`, com os recursos e a chave pública próprios preparados. Fonte `53e410e`, versão `d4138431`, 100%; CI/CodeQL e smoke público conferidos. [Recibo](PILOT-PUBLICATION-2026-10-26.md).

Esta continuidade abrange o fechamento documental dessa publicação. Não inclui aceite autenticado/operacional, concessões de contas, nova importação, expurgo, alteração de política de recuperação, publicação de HML anterior ou produção. O usuário realizará o ensaio com notas reais de outros meses.

## Configuração Auth e piloto — 26/10/2026

Usuário autorizou “Pode configurar”. #77 integrada em `c6ff2b6`; diretórios restritos configurados no HML/Auth e no piloto, duas cópias Neon e seis secrets próprios do novo Worker preparados. Originais preservadas. Testes finais, publicação e aceite real pendentes. [Recibo e próximos passos](PILOT-CONFIGURATION-2026-10-26.md).

## Integrações #73/#76 e cinco etapas — 26/10/2026

Usuário autorizou **“Pode revisar e integrar e seguir com todas as 5 etapas”**,
após a apresentação da correção da CI e da sequência. Abrange as duas PRs
concretas, implementação/testes/PR da aprovação, homologação, preparação da
segurança/recuperação e piloto com fatos reais a informar.

#73 integrada em `233b3a4`; #76 atualizada sem conflito, validada e integrada em
`4c8e8aa`. Três workflows de cada main aprovados e três análises CodeQL de cada
merge sem resultados/erros/avisos, zero alertas abertos. Sem novo deploy.

À pergunta sobre objetivos RPO/RTO/retenção, usuário escolheu **“Preparar a
proposta e decidir depois”**. Não alterar a agenda ou tratar prazos propostos
como aprovados. Para o piloto, primeiro informou que enviaria operadora/fatos;
depois definiu **“Deixe tudo pronto, vou fazer o teste com notas de compras
reais de outros meses”**. Preparar roteiro, conferência de duplicidade/data e
recibo para esse teste manual. Não criar produção/venda presumida a partir
da nota, repetir carga na fonte original ou inferir aceite operacional.

A candidata S02/A04 e o novo diretório Auth precisam de revisão do resultado
concreto antes das alterações compartilhadas descritas no
[procedimento](REGISTRATION-APPROVAL-2026-10-26.md). Não há aceite de produção,
concessão de contas, mudança de política de retenção ou SQL destrutivo nessa
preparação. A fonte operacional original conserva sua classificação.

## Integração e publicação HML da PR #75 — 26/10/2026

Após a apresentação da CI aprovada e da PR pronta para integração, usuário
autorizou **“Pode seguir com a atualização e publicação”**. Aplicado ao pacote
concreto: merge da PR #75 e publicação da main aprovada somente em
`cacau-v1-hml`, com a configuração versionada e a chave pública já publicada.

Executado: merge `82eebfc`, três workflows da main e CodeQL aprovados,
versão HML `42da8a96` em 100%, smoke público desktop/móvel aprovado.
[Recibo e limites](HML-PUBLICATION-2026-10-26.md). Autorização consumida nesse
escopo. Não inclui produção, SQL/migrations compartilhados, secrets/DNS,
concessões de contas ou integração de PRs de dependências. S02/A04 segue com
implementação local autorizada e pendente; não repetir o deploy como tarefa nova.

## Dono e aprovação de cadastros por Gerente — 26/10/2026

Após a apresentação das pendências A04 e das fases seguintes, o usuário definiu:

> O dono pode ser tudo e os perfis de gerente podem incluir a liberação de usuários cadastrados que estejam validados devidamente no cadastro dentro dos parâmetros de segurança

Decisão de produto aceita: Dono conserva acesso funcional completo; Gerente
pode aprovar cadastros que passem pelas validações de segurança. Autoriza
preparar a implementação local, os testes e a PR desse fluxo em S02/A04.

O detalhamento inicial adota menor privilégio: Gerente libera somente primeiro
acesso como Funcionário, com identidade/e-mail confirmados pelo provedor,
sem autoaprovação, promoção ou reativação de vínculo inativo. Administração
geral e concessão de Gerente/Dono ficam com o Dono. Esta delimitação operacional
é a interpretação conservadora da delegação, não uma citação adicional do
usuário. Controles completos em [SECURITY.md](SECURITY.md) e política na
[matriz](AUTHORIZATION-MATRIX.md).

Este incremento registra a decisão; não altera o RBAC executável nem concede
papel a qualquer identidade. Implementação, auditoria transacional e testes
ainda são trabalho de S02/A04. Bootstrap histórico não deve ser repetido.
Não inclui merge de nova PR, deploy, SQL compartilhado, migrations aplicadas,
secrets, DNS ou redução dos controles existentes.

## Integração autorizada da PR #74 — 26/10/2026

Após a apresentação da PR #74 validada e da sequência restante, usuário
respondeu **“Pode seguir com a integração”**. Autoriza integrar somente esse
pacote concreto, preservando commits e proteção da main, após reconferir o
HEAD e todos os checks/resultados CodeQL. Não inclui deploy, SQL compartilhado,
secrets, DNS, concessões de acesso ou outras PRs.

O código revisado é b4ae5cb; a candidata documental 76fd7a5 teve todos os
12 checks aprovados e três análises CodeQL sem resultados/erros/avisos,
zero alertas abertos. Este fechamento altera só documentação/evidência.
A árvore de código/testes/configuração permanece a mesma. Resultado do merge,
SHA final e CI da main são conferidos no
[estado da PR #74](https://github.com/naiguelcabral/seus-brownies/pull/74).

A59 done identifica o pacote de código entregue e validado, não publicação
nem encerramento integral de A04/A07/A08. Restam autoria de concessões futuras/
bootstrap e conclusão de reset com identidade confiável, prova HML com serviços
reais/rede móvel, A01/A03 e decisões L02–L06. A configuração versionada não é
recibo de configuração remota aplicada. Registros de preparação abaixo são
históricos; sua restrição de merge antecede esta autorização específica.

## Continuidade local após a PR #72 — 25–26/10/2026

Após o relato da integração #72 e da sequência A04/A07/A08, evidências e
homologação, usuário respondeu **“Pode seguir”**. Autoriza avançar a preparação
local dessas frentes, testes isolados, documentação, commit e PR de revisão.
Esta candidata mantém a stack e os controles existentes; o pseudônimo de
correlação, os timeouts e os orçamentos técnicos integram sua revisão concreta.
Não concede papéis nem executa mudança de política ou infraestrutura remota.

A integração anterior foi consumida em #72. Esta continuidade não presume
aprovação do novo diff para merge, deploy, SQL compartilhado, secrets, DNS,
RBAC ou produção. Provedor real, sustentação e aceites mantêm seus gates.
[Escopo e evidência](AUTH-CONNECTION-HARDENING-2026-10-26.md).

## Continuidade e integração da PR #72 — 25/10/2026

Após apresentação da PR #72 pronta para revisão, com o escopo, os testes e
os gates restantes, usuário respondeu **“Pode seguir”**. A continuidade
autoriza integrar esse pacote concreto após reconferir diff, SHA, CI e
CodeQL, preservando os commits e as regras da main. Abrange também a regra
de worktree própria proposta em AGENTS.md nessa PR.

Sem autorização adicional para deploy, SQL compartilhado, migrations,
secrets, DNS, RBAC, políticas externas ou outras PRs. O registro de preparação
abaixo antecede esta autorização. O resultado do merge e do CI pós-merge é
conferido no [estado da PR #72](https://github.com/naiguelcabral/seus-brownies/pull/72).

## PR única de ajustes antes da publicação — 25/10/2026

Usuário autorizou: “Tudo que for pequeno e que pode ser feito antes do
ambiente publicado vamos fazer e juntar em uma pr”. Escopo: implementar e
testar ajustes locais pequenos, preparar configuração versionada, atualizar
documentação e abrir uma única PR. Inclui proposta da regra de worktree para
revisão humana. Não autoriza merge desta nova PR, deploy, SQL compartilhado,
secrets, RBAC, mudança arquitetural ou política externa. A autorização anterior
dos cinco merges já foi consumida na sequência #61/#63/#62/#64/#65.

## Integração do lote #61–#65 — autorização de 25/10/2026

Após apresentação da sequência e da validação conjunta, usuário autorizou:
**“Pode seguir com a integração das prs na sequência correta”**.
Escopo: integrar #61 → #63 → #62 → #64 → #65, atualizando branches,
resolvendo eventuais conflitos com preservação dos diffs e reconferindo
SHA/checks/CodeQL entre cada merge. Histórico preservado por merge commits;
sem bypass das regras da main ou force push.

#61/#63/#62/#64 já integradas em 1536920/f5f6f93/6dd8655/79634e6;
esta entrega documental #65 consolida os recibos. O resultado final da PR é
conferido no GitHub. A autorização não inclui deploy, SQL/migration
compartilhados, secrets, RBAC, limpeza HML ou outras PRs. Publicação HML e
liberação de produção conservam seus gates próprios.

## Recuperação de banco e usuários — 22/10/2026

Usuário pediu verificar as conexões Neon/banco/usuários e refazer o necessário
para voltar a funcionar; depois autorizou expressamente os procedimentos de
reconstrução da correção e informou que todos estavam sem conseguir logar.
Aplicado reparo necessário somente no `cacau-v1-hml`: converter a variável
`DATABASE_URL` em secret mantendo o destino e reconstruir `NEON_AUTH_BASE_URL`
a partir da branch de identidades confirmada no Neon. Demais bindings,
segredos, contas e papéis preservados. Leituras sanitizadas e testes de sessão
conferidos; login com senha real ainda aguarda relato do usuário.

Essa autorização foi usada para a correção concreta de configuração HML;
não houve recriação de usuários, troca de senha/papel, SQL de escrita,
migration, alteração de produção principal ou dispensa dos gates existentes.
[Registro](NEON-AUTH-RECOVERY-2026-10-22.md).

Seguimento em 23/10: usuário pediu continuar as correções necessárias e
confirmou **“Abriu normal”** após o roteiro de nova entrada da Gerente em
janela privativa. Aceite limitado à entrada e abertura do painel dessa conta;
nenhuma nova alteração de schema, fonte, credencial, papel ou configuração foi
necessária. O relato não libera produção nem conclui toda a matriz H01–H03.

## Publicação conjunta executada — 21/10/2026

Aplicada a autorização de continuidade abaixo após o aceite guiado dos três
perfis: PRs #50–#53 integradas, código `91658ed` publicado somente no HML
às 15:17:06 Brasília, versão `de9a88e6-a2e0-4224-8c9c-e6f3da8ccb6c`, 100%.
Usuário confirmou Cenários/Financeiro como Dono após atualizar no tablet.
Sem novas concessões, fatos fictícios, SQL/migrations compartilhados, secrets,
DNS ou produção. H01/H02 continuam parciais, com um HTTP 429 agregado na nova
versão; não há aceite de estabilidade permanente ou dispensa dos demais gates.
[Recibo](JOINT-HML-PUBLICATION-2026-10-21.md).

## Continuidade S04 e homologação assistida — 21/10/2026

Usuário solicitou executar o reforço de tipagem de Cenários e, em paralelo,
concluir a homologação de Funcionário/Gerente/Dono, incluindo chamadas diretas.
A execução paralela fica restrita a essas duas frentes. Cálculos, versões,
ativação e permissões devem ser preservados. Depois da homologação, seguir
para revisão, integração das PRs e publicação conjunta somente no HML.
O usuário escolheu executar os testes guiados no próprio dispositivo; não
forneceu sessões ou credenciais ao agente. Não presume aceite de casos ainda
não relatados, nem autoriza fatos fictícios, migração compartilhada, secrets
ou produção. Integração/publicação respeitam os checks e a ordem solicitada.

## Execução das tarefas automáticas — 21/10/2026

Após apresentação das frentes S03, I02, T02, H06, G01 e proposta G03, usuário
respondeu “Pode seguir realizando as tarefas de forma automática”. Autoriza
triagem/auditoria, correções/testes e PR de revisão, download/restauração da
cópia externa já autorizada em ambiente isolado, procedimentos offline,
verificações móveis e reconciliação documental. Não autoriza merge, aplicação
de proteção administrativa, fechamento manual de alertas, mudança de regras,
SQL compartilhado, secrets ou produção. Não é pedido de nova recorrência,
autonomia permanente ou delegação. Resultado em AUTOMATIC-READINESS-2026-10-21.md.

## Merge da PR #48 — 21/10/2026

Após o relato de conflitos resolvidos em `97195ac`, 560 testes, build/checks
aprovados e revisão pendente, o usuário respondeu “Faça a Marge eu autorizo”.
Autorização específica para integrar a PR #48 à main, incluindo o pacote de
tooling/runtime já apresentado. Merge executado em `83178a5`, após reconferir
o SHA, mergeabilidade, checks e resultados CodeQL. Não autoriza deploy de
produção, SQL compartilhado, secrets, fechamento manual de alertas ou dispensa
dos aceites funcionais/recuperação. CI e testes pós-merge aprovados; análises
atuais sem resultados, cinco alertas da configuração anterior ainda abertos.

## Continuidade, cópia externa e alertas — 20/10/2026

Usuário solicitou publicar primeiro acesso após CodeQL, validar perfis/fluxo
isolado/celular/CSV, configurar alertas/backups, fechar gates e integrar à main
antes do aceite de produção; confirmou “Pode seguir”. Depois escolheu Google
Drive privado para cópia externa e e-mail do Dono para alertas. Autorizados
upload privado da cópia public/drizzle da origem já aprovada e agendamentos
locais de backup/monitoramento, sem expurgo. Não inclui dados Auth gerenciados,
fatos fictícios compartilhados, reclassificação de ambiente ou dispensa dos
gates de migrations/integração/produção. Resultado em CONNECTED-QA-2026-10-20.md.

## Novas identidades de Gerente e Funcionário — 20/10/2026

O usuário solicitou criar uma conta de Gerente e uma de Funcionário para os
endereços informados na conversa. A consulta exata prévia não encontrou as
identidades no Neon Auth de `g1-auth-hml`. As duas foram criadas nesse provedor
e a releitura confirmou uma identidade por endereço, ambas com
`emailVerified=false` e papel padrão `user` do provedor. Os endereços e IDs
pessoais não são reproduzidos neste registro.

Posteriormente, a releitura no Neon Auth confirmou `emailVerified=true` para
a identidade de Funcionário. O papel `employee` foi concedido na base
operacional original, em transação única com evento `role_changed` de sucesso,
motivo e referência inédita
`access-grant:20261020:487652cd-5769-4757-89cf-e3f5a461cfee`. Leitura
independente confirmou exatamente um vínculo ativo e um evento correspondente.
A identidade de Gerente foi posteriormente relida com `emailVerified=true`.
Conforme a autorização anterior, recebeu vínculo ativo `manager` e evento
`role_changed` na mesma transação, com motivo e referência inédita
`access-grant:20261020:27aa6e84-cf48-4fc1-91be-131f86b445e8`. A consulta
independente confirmou exatamente um vínculo ativo e um evento correspondente.
As duas concessões estão aplicadas; o aceite conectado dos perfis permanece
pendente. Não reutilizar referências consumidas. Senha, token, OTP e URL
privada não entram no Git.

## Continuidade integral da validação técnica — 20/10/2026

Definição operacional posterior: usuário criará mais duas contas (teste e
Gerente), escolheu cópia local na raiz do projeto e perfil Dono para alertas.
Pasta privada/ignorada `backups-local/` e utilitário foram preparados. A
exportação da original `production/br-lingering-wind-acwh5wap` foi rejeitada
pela revisão automática por falta de autorização específica do alvo/payload;
nenhuma cópia foi gerada. Pergunta explícita enviada; não repetir ou contornar
a exportação antes da resposta. Não confundir cópia local com backup externo.

Na pergunta específica, foram apresentados o ID da original `production`, os
schemas `public`/`drizzle`, o conteúdo potencialmente sensível, a pasta privada
fora do Git e a exclusão do serviço gerenciado de Auth. Usuário respondeu
“Autorizar essa cópia somente leitura”. A nova autorização foi aceita e a cópia
foi executada, sem alteração da origem. Restore local isolado passou, catálogo
independente igual ao checkpoint 0033, 38 tabelas e 36 recibos exatos. Permissões
0700/0600 conferidas. Não autoriza escrita em produção nem inclusão de Auth.

Após a lista de pendências de banco, QA integrado, acesso, usabilidade,
automação, integração e sustentação, o usuário respondeu “Pode seguir com
tudo que precisa ser feito”. Autoriza avançar essas frentes dentro das
restrições existentes: inspeção sanitizada de metadados, implementação e
ensaios isolados, configuração das ferramentas, documentação e PRs de revisão.
A autorização HML anterior permanece para incrementos testados e revisados.
Não autoriza liberação definitiva de produção, fatos fictícios no HML ou
alteração de secrets, nem dispensa plano específico de migration ou classificação
independente do destino. Integração exige revisão concreta do diff e dos
checks; a resposta não exige mesclar PRs informativas/sobrepostas sem análise.

## Continuação T02 — preparação e revisão local — 20/10/2026

Após a entrega da candidata genérica e indicação da adoção/revisão como
próximo passo, o usuário respondeu “Pode continuar”. A continuidade abrange
adotar a linha com pontes para preparação e revisão offline, testar em
PostgreSQL descartável, documentar e atualizar a PR #46. Não há execução
automática ou ativação do migrador compartilhado. Essa continuidade não
substitui classificação independente do alvo, recuperação e decisão específica
para aplicar SQL compartilhado, nem autoriza merge, produção ou secrets.
Os comandos novos retornam `application_authorized:false` e
`execution_enabled:false` em todos os resultados.

## Continuação de Compras e Produção — 19/10/2026

Após a entrega de Cenários e a indicação da revisão de Compras/Produção como
próxima tarefa, usuário pediu “Vamos continuar se onde parou”. Prosseguir com
essa revisão de UX dentro da autorização vigente para melhorar praticidade,
ensaiar e publicar no HML. Somente frontend, sem alterar regras de domínio,
permissões ou contratos de escrita. A autorização não inclui operações
fictícias no HML, produção principal, secrets, migrations ou reimportações.
Compras e lotes reais continuam sem previsão; dados sintéticos somente
isolados. Concluído em a76c37c, Worker HML6bc5bd55 a100%; formulários
conferidos sem salvar e21 digests preservados. Sem escrita compartilhada.
Recibo `evidence/purchase-production-ux-hml-2026-10-19.json`.


## Execução única de usabilidade — 19/10/2026, 02:33 Brasília

Heartbeat `retomar-cacau-s-02h33`, solicitado pelo usuário, autoriza uma única
próxima tarefa: simplificar Metas e cenários, testar em isolamento e publicar
somente no `cacau-v1-hml`, conferindo o resultado. Preservar a meta conjunta
de R$ 10.000 após custos, normalização em 100%, premissas já confirmadas,
permissões, versões e auditoria. Não refazer incrementos já publicados.
Não há compras ou produção previstas; testes sintéticos somente locais.
Sem autorização para produção principal, secrets, fatos fictícios no HML,
limpeza, alterações de regra financeira ou reuso de referências consumidas.
Concluído no código dc0a37b, Worker HML97ffb52e a100%. A tarefa não exigiu
migration nem gravação em dados compartilhados; tela autenticada e hashes
antes/depois conferidos. Recibo `evidence/scenario-ux-hml-2026-10-19.json`.


## Recebimentos, lucro e usabilidade — 18/10/2026

Após proposta explícita de taxas nos recebimentos, despesas sem dupla contagem,
meta conjunta no dashboard, modais de Compras/Produção/Vendas e ensaio isolado,
usuário respondeu: “Pode realizar com base nas informações eu enviei”.
Autoriza implementar e concluir esse incremento no HML já autorizado nesta
conversa, sem compras ou fornadas reais e sem fatos fictícios na base compartilhada.
Débito 1,43%, crédito 3,36%, Pix R$ 0,49 por pagamento e dinheiro sem taxa.
Mão de obra/energia já apropriadas nos lotes não são deduzidas novamente por
despesa; R$ 2.288 é orçamento planejado e não despesa efetivamente incorrida.
Não autoriza produção principal, dados bancários, secrets, limpeza ou backfill.
Concluído: migration0033 e publicação41820ba em12776985 (100%).
Referência PAYMENT-SETTLEMENT-2026-10-18-001 consumida, não repetir.
Zero fatos operacionais na original após conferência autenticada.


## Publicação de custos e rendimento — autorização atual de18/10/2026

“Pode fazer tudo e publicar”, seguido de “Vamos continuar”, autoriza concluir,
ensaiar, atualizar o banco HML e publicar no cacau-v1-hml. Peso850 g frio por
receita de oito ovos e rendimentos48/24 no5×5 e24/12 no7×7 confirmados.
“as vendas são de todos os brownies” corrige a interpretação de cota obrigatória
de Bordinhas: meta conjunta; aproveitamento real soma resultado, sem mínimo
fixo presumido. Cenário anterior preservado e nova versão orientativa.
Sem autorização de produção, secrets, limpeza ou reimportação histórica.
Concluído: schema/dados002, deploy73ead0a no HML e cenário2/v2/rev2 ativo.
Referência002 consumida, não repetir. Produção principal não alterada.
Plano/recibo: COST-RECOVERY-FEES-HML-2026-10-18.md.


## MEI e taxas — definições de 18/10/2026

Usuário definiu MEI R$ 88/mês e confirmou adicional aos R$ 2.200: orçamento
fixo R$ 2.288. Informou débito 1,43 e crédito 3,36 no contexto percentual;
confirmou Pix R$ 0,49 por transação. “Não tem padrão depende do local de venda”
para a combinação de pagamentos. Preservar meios separados, sem média
inventada, Pix em percentual ou taxa por produto. A referência genérica 1,99
foi substituída. Preparação de premissas, sem lançar despesa paga, inventar
pagamentos históricos ou alterar política de caixa silenciosamente.


## Saquinho das Bordinhas — preço confirmado em 18/10/2026

Usuário informou “A embalagem das bordinhas custam 0,11 centavos por unidade”.
Referência normalizada, com explicitação, para R$ 0,11 (11 centavos) por
saquinho no contexto do custo antes discutido. Não altera a quantidade de um
saquinho por pacote de 100 g, nem autoriza fundir estoque com outra embalagem
pelo mesmo preço. Preço confirmado para revisão; sem aplicação compartilhada.


## Bombom — cobertura definida em 18/10/2026

Usuário informou “Uns 50 gramas por chocolate de bombom” e confirmou que são
50 g só de chocolate de cobertura. Usar como estimativa aproximada de
planejamento por bombom, referência INS019/R$ 40 por kg do workbook.
Não equivale a peso total, medição exata realizada ou definição automática
da montagem/embalagem/adesivos de Kit. Depois confirmou quatro bombons
colocados diretamente na embalagem do kit, sem embalagens individuais.
Confirmou depois “Sim, um adesivo por embalagem vendida”: avulso com uma
embalagem INS011 e um adesivo; Kit com uma embalagem INS012 e um adesivo no
total, sem embalagens internas. Usar no recálculo substituindo complementos
históricos, sem somá-los de novo. Sem aplicação compartilhada nesta etapa.


## Meta, chocolate e recheios — definições de 18/10/2026

Usuário confirmou R$ 10.000 de lucro após custos somando todos os produtos,
incluindo Bordinhas; não é meta de faturamento. Depois especificou chocolate
Melken 50% em pó e recheios comprados como no workbook. Usar referência mestre
dos insumos e consumos previamente aprovados; não fabricar sub-receitas de
recheio nem substituir preços pela compra histórica sem decisão própria.
Preservar SKU/metadados e distinguir chocolate em pó da cobertura. Especificação
registrada para revisão; sem escrita compartilhada ou homologação completa.


## Bordinhas — materiais definidos em 18/10/2026

Usuário confirmou um saquinho e um adesivo por pacote de Bordinhas de 100 g.
Usuário orientou buscar custo no workbook: acabamento histórico R$ 0,27,
adesivo R$ 0,16 e resíduo calculado R$ 0,11 para o saquinho. Decomposição
calculada, não vínculo nominal de embalagem na fonte; não escolher outro SKU
por preço coincidente. Rateio da massa e identidade do saquinho pendentes.
Sem aplicação compartilhada ou alteração de regra de custeio nesta etapa.


## Bordinhas — apresentação e preço definidos em 18/10/2026

Usuário informou “100 gramas a cada 6 reais para as bordinhas”. Autoriza usar
pacote de 100 g a R$ 6,00 na revisão de PROD002. Rendimento, embalagem,
adesivo e rateio ainda pendentes. Não interpretar rendimento histórico 12 como
12 pacotes de 100 g, nem converter unidade do SKU por inferência. Preço novo
preparado para atualização rastreável de catálogo/cenário após a revisão;
nenhuma escrita compartilhada nesta etapa.
Depois esclareceu que Bordinhas aproveita massa fora do padrão de brownie
regular para evitar desperdício. Usar rendimento variável medido, sem produção
fixa presumida. Não define custo zero ou critério de rateio do coproduto.

## Embalagem e adesivo dos brownies — confirmação de 18/10/2026

Usuário respondeu “Sim” a uma embalagem e um adesivo por brownie simples ou
recheado, nos dois tamanhos. Abrange PROD003–PROD016, mantendo embalagem
existente e preparando consumo adicional de um INS006 por unidade final.
Não abrange Bordinhas, Bombom ou Kit. Regra física definida explicitamente;
preço do adesivo continua referência histórica até evidência atual. Evitar
somar esse custo novamente à referência que já o contém. Preparação na
reconciliação de custos; sem aplicação compartilhada nesta etapa.


## Mão de obra diária — definição de 18/10/2026

Usuário definiu R$ 150 por dia, com até 12 receitas cortadas, recheadas e
embaladas. Autoriza usar essa referência na revisão de planejamento. Não
informa horas de jornada, produção habitual ou composição dos custos fixos.
R$ 12,50/receita é rateio em capacidade máxima; não é nova tarifa horária.
Sem aplicação compartilhada nesta etapa nem homologação das demais premissas.
Na resposta seguinte, usuário informou produção habitual de “14 ou 16”. Usar
a faixa mais recente na comparação, mantendo diária de R$ 150 como hipótese
informada; 12 permanece referência anterior, não capacidade máxima vigente.
Depois confirmou que a diária já está incluída nos R$ 2.200 fixos. Na revisão,
a mesma MO deve contar uma única vez. Depois informou “150 reais em 4 dias
de produção”; calendário de quatro dias mensais pela pergunta anterior.
Confirmação recebida: “150 reais por cada dia de produção”. MO R$ 600/mês
incluída nos R$ 2.200; demais fixos R$ 1.600. Rateio informativo por volume,
contando MO uma única vez na projeção. Energia depois confirmada também incluída nos fixos (“Sim, está incluso”).
Na projeção com R$ 2.200 integrais, contar essas parcelas uma única vez.
Demais premissas pendentes;
não autoriza mudança silenciosa de custeio de lote/FIFO ou homologação da
projeção.


## Publicação UX — autorização de 18/10/2026

Após dashboard e modal de Produtos implementados e validados, usuário
autorizou revisão final de praticidade e publicação: “depois disso pode
publicar e atualizar tudo no banco e no hml”. Autoriza publicar o pacote
da branch de trabalho somente no `cacau-v1-hml`, com verificação autenticada.
As melhorias não exigem schema, carga ou escrita no banco; conferir os dados
existentes em READ ONLY. Não autoriza produção, alteração de secrets/RBAC,
repetição de importações ou ativação do cenário em rascunho.
Publicação concluída pelo build isolado do commit `339eb80`, versão
`3790b237-6f04-4c9a-aa5b-6c8425d20270`, confirmada a 100%. Dashboard e modal
conferidos na sessão autenticada; banco preservado por leitura antes/depois.
Recibo `evidence/ux-hml-publication-2026-10-18.json`.

Continuidade: após proposta explícita de aplicar o padrão em Categorias e
Locais e publicar no HML, usuário respondeu “Pode seguir”. Autoriza este
incremento de interface e sua conferência autenticada sem cadastros sintéticos
na base compartilhada. Sem migration ou escrita de dados necessária.
Executado do commit `e890e3d`, versão `29df3f6d-48be-4a80-b11c-a3c2b992cd69`
confirmada a 100%; filtros e modais conferidos, banco preservado. Recibo
`evidence/category-location-ux-hml-2026-10-18.json`.

## Mix 100% em rascunho — autorização de 18/10/2026

Ao pedir a correção do mix, usuário esclareceu: “Somente o sistema, como
cenário em rascunho”. Autoriza criar um cenário `draft` com os 17 produtos,
normalização existente e premissas históricas explicitamente ressalvadas.
Preservar workbook e pesos originais; não ativar, inventar consumo/custos,
alterar parâmetros globais ou executar operações financeiras/de estoque.
Payload validado em `SCENARIO-MIX-DRAFT-2026-10-18.md`; criação concluída pela
sessão autenticada do Dono: ID 1/v1/rev1 em `draft`, 17 itens e 10.000
pontos-base, com histórico/auditoria conferidos por leitura independente.
Não repetir criação ou ativar. Recibo `evidence/scenario-mix-draft-execution-2026-10-18.json`.

## Cadastro técnico — autorização de 18 de outubro de 2026

Após apresentação do pacote `1f23276`, usuário autorizou seguir, reconferir a
ficha técnica, receita e workbook disponível, incluir os ovos, realizar ensaio
e prosseguir se tudo estiver correto. Autoriza o plano
`TECHNICAL-CATALOG-EXECUTION-PLAN-2026-10-18.md`: backup atual em branch sem
compute, cópia privada de ensaio e aplicação na original
`br-lingering-wind-acwh5wap` / `neondb` somente após sucesso.
SQL aprovado SHA-256 `01fdc56d23954ef5ba9a92de501cb65834cab2ef36cecb2ee5aeac1d5332a645`.
Inclui Ovos Grandes, receita de sete linhas, dois requisitos/tarifas,
17 perfis de referência, 14 embalagens, 12 recheios, recibo e 43 auditorias.
Não autoriza estoque/compra/lote/venda sintéticos, PLAN históricos, regra nova
para bombom/kit, secrets, endpoints, promoção/restore da original ou deploy.
Aplicação concluída após ensaio e leitura independente: 37 produtos incluindo
Ovos Grandes, receita de sete linhas/8 ovos, dois requisitos/tarifas, 17 perfis,
14 embalagens e 12 recheios, um recibo e 43 auditorias. Referência **consumida**
`TECH-CATALOG-2026-10-18-001`; não repetir. Registros anteriores e schema
preservados; sem fatos operacionais criados. Backup atual sem compute
`br-solitary-unit-ac3lawit` preservado. Quota recusou nova cópia; cópia privada
anterior `br-aged-violet-ac5aap1s` reutilizada somente após equivalência integral
de dados/journal/schema, sem reset ou exclusão. Compute final idle.
Recibo: `evidence/technical-catalog-execution-2026-10-18.json`.

## Aplicação e publicação dos custos exatos — 18 de outubro de 2026

Após a entrega local e apresentação explícita do gate, usuário respondeu
“Aprovado” à aplicação da migration e publicação HML. Autoriza as nove colunas
JSONB de ADR-0002 na original já utilizada, backup/ensaio e deploy somente
em `cacau-v1-hml`. Não autoriza backfill, compras de teste na base compartilhada,
alteração de secrets, DNS, RBAC ou publicação no Worker principal.

## Relatórios em segundo — autorização de 18 de outubro de 2026

Usuário solicitou “coloque a aba de relatórios como a segunda aba na ordem faça
as atualizações necessárias e deixe tudo disponível”. Autoriza a alteração
de ordem e sua publicação no HML já utilizado, `cacau-v1-hml`. Não altera
permissões, dados ou configuração de produção.

## Publicação HML das guias e compras em kg — 18 de outubro de 2026

Após apresentação explícita da publicação pendente, usuário solicitou:
“Pode concluir a tarefa integralmente”. Autorização aplicada exclusivamente
ao deploy HML de `d8369bd`, incluindo a ordem final das guias e o ajuste de
Compras em kg preparados nesta conversa. Versão publicada
`36960752-1cc0-4fee-8db7-76093d96a348`, confirmada a 100%. Não autoriza deploy
de produção, alteração de secrets/DNS/RBAC, compra real ou estoque fictício.

## Cadastro de insumos — autorização de 18 de outubro de 2026

Após a conferência dos 19 insumos físicos, o usuário esclareceu que os itens
em gramas entram em kg e solicitou: “Faça as correções necessárias e inclua
todos os insumos em nosso banco de dados”. Autorização aplicada ao cadastro
`INS001–INS019` na original `br-lingering-wind-acwh5wap` / `neondb`, categoria
`Insumos do workbook`, com dez conversões de compra kg→g e 29 auditorias.
Referência **consumida** `CATALOG-INPUTS-2026-10-18-001`; não repetir.

Saldo permanece derivado dos movimentos, sem entradas fictícias. Energia e
mão de obra foram excluídas do estoque físico conforme as regras existentes.
Não autoriza importação de histórico, saldo inicial, receitas/perfis, produção,
mudança de precisão financeira ou deploy. A correção local de Compras para kg
aguarda autorização específica de publicação HML e homologação humana.

## Original atualizada até 0028 — 17 de outubro de 2026

Usuário aceitou explicitamente o backup em branch no lugar do snapshot novo
recusado pela quota. Plano/valores `0019` e mix novo vazio `0028` já estavam
aprovados. Backup `br-morning-star-ac9j0kkh`, sem compute, e snapshot anterior
preservados; cópia `br-misty-surf-acbrzli5` mantida com compute suspenso/idle.

Preflight revalidou a original `br-lingering-wind-acwh5wap` como `production`,
primary/default, endpoint `ep-[redacted:26398d41]`, baseline exata de 17 recibos
e ausência de aplicação parcial. Lote ensaiado aplicado em transação única:
102 instruções principais mais locks e verificações de preservação/ORM,
148 instruções no total. SHA-256 do lote verificado:
`a6a7e3f77a9a7f48f984c4e61ff819c75d2e3cc8b4bc77fcfc98f542aaa17783`.

Conferência posterior READ ONLY às `2026-10-17T19:43:46.671Z`: **31 hashes e
timestamps idênticos** ao manifesto (29 migrations originais e duas pontes),
38 consultas ORM com LIMIT 0 aprovadas; todos os registros anteriores das
29 tabelas, nove linhas incluindo acessos/auditoria, preservados por digests
antes/depois e guard dentro da transação. Dono e Gerente permanecem ativos.

Catálogo independente da original coincide exatamente com cópia e laboratório:
SHA-256 `6832cef678c0a00c28f926fc75484ad8c6b1dd1e63a4cd29af4ff0dde30c7642`.
São 38 tabelas, 435 colunas, 152 constraints, 112 índices, 21 enums, duas
funções/dois triggers, 37 sequences e zero policies públicas. Configuração
financeira confere com a aprovação; mix novo tem zero linhas. Nenhuma data de
entrega antiga foi inventada e nenhum backfill ou importação foi executado.

Auth G1 mantém seu endpoint; original conserva nome/default/primary. Worker
HML segue em `1ea59a90-c289-4c99-bf8f-a0bbd82d6b37`, 100%, sem novo deploy,
secrets alterados ou flags diagnósticos ativos. Login público renderizado em
navegador anônimo. Usuário orientado a sair/entrar para confirmar o painel;
**a sessão protegida ainda aguarda confirmação humana**. Homologações reais de
venda/produção/FIFO/finanças continuam tarefas separadas.

Recibo final: `evidence/scoped-upgrade-execution-2026-10-17.json`.
A cadeia ativa versionada e seu preflight não foram modificados; a correção
localizada do alvo não encerra a classificação global da cadeia para outras
bases/novas instalações. Não reaplicar o lote nem resetar/apagar backups por
inferência. Em resposta incerta, conferir journal antes de qualquer ação.

## Ensaio externo e desvio de backup — registro anterior resolvido

Usuário aprovou o plano e os valores `0019`/mix novo vazio `0028`. Preflight
READ ONLY confirmou baseline exata `0016`, dois vínculos e sete eventos auth.
Criação do snapshot novo foi recusada: `snapshots limit exceeded` (422).
Snapshot antigo `snap-withered-poetry-achs77uu` permanece intocado.

Preparação reversível alternativa concluída, sem DDL na original: backup
`br-morning-star-ac9j0kkh`, sem compute, ancorado na original em LSN `0/1EA56F0`,
`2026-10-17T19:36:11Z`. Cópia privada derivada `br-misty-surf-acbrzli5`,
endpoint próprio `ep-[redacted:05df6f45]`, recebeu o lote de 102 instruções,
com locks e guards adicionais de preservação na mesma transação. São 148
instruções incluindo conferências; o SQL principal aprovado permanece idêntico.

Ensaio passou: 31 recibos, 38 consultas ORM com LIMIT 0, 29 tabelas antigas e
seus nove registros preservados por SHA-256, incluindo os dois acessos e a
auditoria. Catálogo tem SHA-256
`6832cef678c0a00c28f926fc75484ad8c6b1dd1e63a4cd29af4ff0dde30c7642`,
exatamente o laboratório independente: 38 tabelas, 435 colunas, 152 constraints,
112 índices, 21 enums, duas funções/dois triggers, 37 sequences e zero policies.
Baseline/digests anteriores da cópia coincidem com a original; clone a partir
do backup demonstrado. Nenhuma linha de negócio foi exportada.

Original reconfirmada com 17 recibos; `production` continua primary/default e
os endpoints original/G1 permanecem nas mesmas branches. Nenhum restore,
finalização ou realocação de endpoint foi executado. A tentativa de definir
suspensão automática da cópia foi recusada pela política da conta antes de
criar recursos; a cópia foi criada com os parâmetros permitidos, 0,25 CU.

Solicitado somente aceite da substituição do snapshot novo por backup em
branch preservado, mantendo o snapshot antigo. Aceite recebido posteriormente; a aplicação está registrada no checkpoint
acima. Valores financeiros já aprovados não exigem nova decisão.
Recibo e lote verificado em `evidence/scoped-upgrade-execution-2026-10-17.json`
e `evidence/scoped-upgrade-verified-batch-2026-10-17.json`.

## Atualização delimitada até 0028 — plano para decisão

Após a liberação de acessos, usuário pediu continuidade da correção. Preparação
local concluída em `SCOPED-UPGRADE-0016-0028-PLAN.md`, com lote/hash e testes.
A nova gravação na principal e os valores financeiros iniciais exigem aprovação
específica do plano: snapshot novo, cópia privada com `finalize:false`, ensaio
e aplicação na original somente se passar. Não reaproveitar a autorização
limitada a `0000–0016`; não alterar secrets, endpoints/defaults, identidades
ou fazer backfill. Decisão dos valores `0019` e mix novo vazio `0028` pendente.

## Concessões aprovadas e aplicadas — 17 de outubro de 2026

Após apresentação do SQL e dos quatro ensaios, usuário autorizou explicitamente
criar na original somente os vínculos Dono e Gerente das duas contas indicadas.
Preflight revalidou as duas identidades verificadas e os mesmos papéis ativos
em G1; original `br-lingering-wind-acwh5wap`, endpoint
`ep-[redacted:26398d41]`, `neondb`, tinha zero vínculos e 17 migrations.

Plano `SQL-ACCESS-RECONCILIATION-2026-10-17.sql` executado via MCP numa única
transação. SHA-256 do SQL: `91403fbb43dcb8ec130a64cd9a0bce5864297dc1c7fe219dab36bd3a2684775d`.
Referência **consumida**, não reutilizar:
`access-reconciliation:20261017:300f24ea-2e14-4b1c-9e4c-b791856d1266`.

Verificação em nova transação READ ONLY confirmou exatamente um `owner` ativo,
um `manager` ativo e dois eventos `role_changed/success`, com motivo
`operator_approved_access_reconciliation`, às `2026-10-17T19:19:01.429Z`.
Journal continua com 17 recibos. Nenhuma identidade, senha, secret, schema,
regra RBAC, vínculo de origem ou outra conta foi alterado. O ator de sessão
permanece NULL; aprovação humana administrativa está identificada no metadata,
sem atribuir ao operador uma sessão da aplicação inexistente.

Usuário orientado a sair e entrar novamente no login HML para validar o painel.
Concessão confirmada no banco; acesso pela interface ainda aguarda confirmação.
Diagnósticos temporários permanecem desligados. `0017+` e homologação integral
continuam fora desta concessão. Evidência em
`evidence/access-reconciliation-2026-10-17.json`.

## Reconciliação de vínculos na original — proposta aprovada e aplicada

O diagnóstico autorizado concluiu sem alterar secrets ou contas e foi desligado.
Comprovado Auth em G1 e auditoria SQL na original. Os papéis declarados pelo
usuário já existem ativos em G1; não existem na allowlist do banco original.

Preparado `SQL-ACCESS-RECONCILIATION-2026-10-17.sql`: criar somente dois
vínculos no banco original, para os mesmos UUIDs existentes/verificados:
Dono da conta identificada pelo usuário e Gerente da conta recuperada.
As duas concessões e dois eventos auditáveis pertencem à mesma transação,
com referência nova, sem overwrite e com precondição de allowlist vazia.
Não cria usuários, muda senhas, secrets, origem Auth ou regra RBAC.

Autorização específica concedida depois da proposta, inclusive para o
primeiro vínculo Dono. Aplicação/recibo no registro acima; o diagnóstico
sozinho não autorizava essa gravação. Quatro cenários PostgreSQL descartáveis aprovados.
Antes de executar, revalidar os papéis/verificação na origem e a ausência de
vínculos no alvo. Registrar a decisão humana com a referência real consumida.

## Diagnóstico temporário de destino — autorização de 17 de outubro de 2026

Usuário autorizou publicar e ativar em `cacau-v1-hml` o diagnóstico booleano
revisado em `2a81d4b`, por até 30 minutos, desativando-o após a conferência.
Somente compara o endereço Auth declarado; não revela o secret nem concede
acessos. Não autoriza alterar secrets, origem efetiva, usuários ou migrations.

## Identificação das duas contas — 17 de outubro de 2026

Usuário confirmou a conta de Gerente e identificou sua outra conta como Dono.
Escopo de conciliação restrito a essas duas identidades, sem ampliar permissões
de outras contas ou alterar a política RBAC. Nenhuma identidade encontrada
na original ou cópia; nenhuma concessão executada. E-mails omitidos do Git.

## Solicitação de papel Gerente — 17 de outubro de 2026

Após confirmar a recuperação da senha, o usuário identificou sua conta e
solicitou explicitamente papel **Gerente**. Escopo: localizar essa identidade
existente, confirmar e-mail verificado e conceder somente o papel solicitado,
com vínculo e auditoria na mesma transação. Não inclui criação de identidade,
alteração de senha/verificação, papel Dono, política RBAC ou outras contas.

Consulta direcionada não encontrou a identidade no alvo original. Concessão
não executada; depende da conciliação da conta e do ambiente. E-mail pessoal
omitido deste registro versionado.

## Recuperação de endpoints após restore — 17 de outubro de 2026

Após explicação do incidente e da rejeição automática, o usuário autorizou
explicitamente realocar os endpoints pelo estacionamento, devolver o nome
`production` e default/primary à original `br-lingering-wind-acwh5wap` e
isolar a cópia, conforme `NEON-RESTORE-INCIDENT-2026-10-17.md`.
As três realocações, renomeações e default foram executados e reconfirmados.
Neon Auth e JWKS da original voltaram ao endpoint original. Não restaurar dados
sobre a original, apagar recursos ou ampliar credenciais por essa autorização.

## Baseline até 0016 — autorização de 17 de outubro de 2026

O usuário aprovou o plano `AUTH-BASELINE-0016-EXECUTION-PLAN.md`: snapshot,
cópia privada, ensaio e inicialização canônica da branch original até `0016`
somente se passar. Não inclui `0017–0028`, criação de usuários ou concessão
de Dono. A recuperação da troca acidental de endpoints/nome/default descrita
em `NEON-RESTORE-INCIDENT-2026-10-17.md` exige consentimento explícito após
rejeição automática; nenhuma migration externa foi executada.

## Exceção pontual de catálogo — 17 de outubro de 2026

Após o resultado inicial, o usuário autorizou ampliar somente o inventário de
metadados conforme `SQL-AUTH-BASELINE-INVENTORY-2026-10-17.sql`: relações de
`public`/`drizzle` e labels dos dois enums auth, no mesmo alvo e sob READ ONLY.
Executado sem DDL/DML e sem leitura de dados do provedor/aplicação.
Não autoriza inicializar schema, criar snapshot/branch ou aplicar migrations.

Após proposta do SQL `SQL-AUTH-CATALOG-PREFLIGHT-2026-10-17.sql`, o usuário
autorizou o teste pelo MCP administrativo, em transação READ ONLY, no projeto
`steep-brook-51659857`, branch `br-lingering-wind-acwh5wap`, database `neondb`.
Escopo: presença/schema/colunas das três relações de autenticação e somente
presença do journal. Exceção limitada ao requisito de role não gravável de M45;
não autoriza nova role/grant, escrita, migration, leitura de usuários/negócio
ou inventário ampliado. Executado com `transaction_read_only=on` confirmado.

O usuário autorizou também publicar o diagnóstico sanitizado de falha da
auditoria do reset em `cacau-v1-hml`, após proposta e validação do commit
`6f67aed`. Não autoriza dispensar auditoria, aplicar migrations ou alterar
secrets, credenciais e papéis para contornar a falha.

## Recuperação de senha HML — 17 de outubro de 2026

Após revisão dos dois bloqueios em `HML-PASSWORD-RESET-2026-10-17.md`, o usuário
autorizou explicitamente publicar a correção do callback no Worker
`cacau-v1-hml` e adicionar somente
`https://cacau-v1-hml.naiguelcabral.workers.dev` às origens confiáveis do Neon
Auth do projeto `steep-brook-51659857`, branch
`br-lingering-wind-acwh5wap` / `production`.
Não autoriza wildcard, mudança de secrets, usuários/senhas, RBAC, SMTP,
cadastro ou requisitos de verificação, schema ou dados de negócio.
A solicitação e conclusão de recuperação serão feitas pelo próprio usuário.

## Diagnóstico SQL temporário — 17 de outubro de 2026

O usuário autorizou nesta conversa publicar em `cacau-v1-hml` para testar a
conexão, após proposta explícita de publicação do diagnóstico, ativação
temporária, teste com sessão administrativa existente e desativação ao fim.
Alvo informado: `steep-brook-51659857` / `br-lingering-wind-acwh5wap`.

Na retomada, autorizou explicitamente acrescentar somente
`workers_scripts:write` ao OAuth do Wrangler para essa publicação, após
explicação de que o scope permite modificar Workers acessíveis à conta.
Consentimento oficial concluído pelo usuário e confirmado pela CLI.
Não autoriza permissão de rotas nem modifica o alvo da publicação.

Escopo: publicar o código revisado do diagnóstico em HML; habilitar
temporariamente `SQL_CONNECTION_PROBE_ENABLED`; executar o probe fixo
`SELECT 1` em READ ONLY, com rollback/fechamento; desabilitar o flag e
registrar versões/resultados sanitizados. Não autoriza migrations, reparos,
backfill, mudança de secrets, criação de identidades, RBAC ou deploy do
Worker `cacau-v1`. A autenticação existente permanece obrigatória.

O Codex pode trabalhar de forma autônoma dentro do repositório, mas os itens abaixo são gates obrigatórios.

## Decisões financeiras aprovadas

### G2 — competência, lifecycle, CMV e mix

Aprovado pelo usuário em 11 de setembro de 2026:

1. receita por competência é reconhecida na entrega; caixa permanece uma visão
   separada;
2. fatos originais não são apagados; erro corrige o período original e evento
   posterior pertence à data em que ocorreu;
3. Dono ou Gerente decide entre reembolso e crédito futuro, sempre com registro
   e auditoria;
4. CMV realizado usa FIFO e as alocações de cada item vendido;
5. cancelamento antes da entrega restaura estoque; devolução após a entrega não
   retorna alimento ao estoque vendável;
6. períodos têm fechamento manual; somente Dono corrige período fechado;
7. receita líquida, margem bruta, margem de contribuição, lucro gerencial e
   fluxo de caixa são indicadores distintos;
8. mão de obra e energia diretamente produtivas integram o custo da produção e
   não são descontadas novamente;
9. margem mínima de 70% é alerta configurável, nunca bloqueio de venda;
10. o mix histórico de 103% é normalizado proporcionalmente para 100%,
    preservando os pesos originais.

Aprovado pelo usuário em 14 de setembro de 2026:

11. o resgate de crédito futuro apenas consome o saldo disponível; não produz
    novo efeito em receita nem em caixa.

Esta aprovação autoriza implementação local, testes e migrations aditivas para
revisão. Não autoriza aplicar migration, corrigir dados compartilhados, fazer
backfill, merge ou deploy.

## Aprovação obrigatória

### Produção e infraestrutura

- deploy de produção;
- alteração de Worker/DNS/domínio de produção;
- alteração de secrets;
- alteração do ambiente de produção do Neon;
- promoção de dados entre ambientes.

### Banco e dados

- migration destrutiva;
- `DROP`, `TRUNCATE` ou exclusão em massa;
- backfill de escrita em ambiente compartilhado;
- reprocessamento de importação já aplicada;
- limpeza de dados HML;
- reutilização de referência idempotente consumida;
- correção manual de FIFO/CMV fora de rotina já aprovada.

### Arquitetura

- troca de framework, ORM, banco, hospedagem ou estratégia principal de autenticação;
- inclusão de serviço externo com custo ou dependência operacional relevante;
- mudança de precisão monetária/quantitativa;
- alteração de regra de negócio com impacto financeiro ou de estoque.

### Segurança

- redução de controles de autenticação;
- mudança de RBAC/permissões;
- alteração de política de sessão;
- exposição pública de rota anteriormente protegida.

## Permitido sem aprovação específica

Desde que dentro de uma branch de trabalho e respeitando o restante da governança:

- ler código e documentação versionada, exceto `.env`;
- criar ou editar código;
- criar testes;
- executar testes locais;
- executar lint/build/check;
- gerar migration para revisão sem aplicá-la em ambiente relevante;
- atualizar documentação;
- criar commits locais/descritivos quando o nível de autonomia permitir;
- preparar PR.

## Regra de parada

Ao encontrar qualquer gate desta lista, o agente deve:

1. concluir tudo o que for seguro e reversível antes do gate;
2. registrar o estado atual;
3. explicar exatamente qual decisão é necessária;
4. não contornar o gate por outro caminho técnico.

## Cadastro de produtos de venda — autorização de 17 de outubro de 2026

Usuário solicitou: “Quero que esses produtos sejam listados e constem no banco
de dados que está disponível no momento”, após apresentação dos 17 produtos,
SKUs e preços do workbook disponível. Autorização aplicada exclusivamente ao
catálogo de venda da original `br-lingering-wind-acwh5wap` / `neondb`.

Executado em transação única: 17 produtos finais, quatro categorias da fonte,
recibo `CATALOG-SALES-2026-10-17-001` e 17 auditorias; categoria anterior
preservada. Leitura independente confirmou persistência. Referência consumida,
não repetir. Não autoriza carga de insumos/histórico, estoque, receitas,
produção ou alteração de preços diferente dos valores apresentados.

## Custos exatos — decisão de 18 de outubro de 2026

Usuário determinou entrada dos insumos de massa em kg com o valor total do
produto, tantas casas internas quanto necessárias e apresentação em centavos
com duas casas. Autoriza preparar a alteração da representação de custos,
testes e migration para revisão. ADR-0002 descreve frações exatas, inclusive
dízimas, e projeções de apresentação; o valor lançado permanece a origem.
Não autoriza migration compartilhada, backfill, mudança de fatos ou deploy.
