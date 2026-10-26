# Aprovação de cadastros — candidata de 26/10/2026

## Configuração e publicação executadas — 26/10/2026

Diretórios restritos e bindings preparados nos alvos Auth do HML e do piloto, conforme [recibo de configuração](PILOT-CONFIGURATION-2026-10-26.md). #77/#78 integradas; o código descrito abaixo está publicado no piloto `d4138431`, fonte `53e410e`. A aplicação do HML anterior não foi republicada. [Publicação e limites de aceite](PILOT-PUBLICATION-2026-10-26.md). Não reaplicar a proposta SQL nem recriar roles/secrets já conferidos.

## Escopo

Continuidade autorizada pelo Dono nas cinco etapas. Implementação preparada
para a primeira liberação de Funcionário por Dono/Gerente. Não altera vínculo
existente, não promove, não reativa e não aprova o próprio acesso. A permissão
`access:approve` é separada de `access:manage`; papéis legados não recebem a
nova delegação. Administração de outros papéis permanece com o Dono.

`/acessos` permite procurar um e-mail, conferir o cadastro e informar o motivo.
Nome, e-mail confirmado, ausência de bloqueio e identidade são consultados
no servidor, na fonte real do provedor. A revisão inclui ID/nome/e-mail/estado/
atualização: se o cadastro mudar entre exibição e aprovação, a gravação falha.
Não existe listagem pública de identidades nem aprovação por e-mail/flag do
navegador. O formulário atual exige nome e e-mail; não inventa documentos ou
campos adicionais de cadastro.

## Transação e sessão

A gravação bloqueia a referência e o destinatário, revalida o vínculo/papel
do aprovador sob lock, confere também sua situação atual no provedor e persiste
vínculo + `role_changed` na mesma transação.
Evento identifica ator real, alvo, motivo, estado anterior/posterior,
referência UUID e UTC. Falha de auditoria desfaz a concessão. Referência
consumida por outra operação conflita; repetição idêntica não duplica escrita.
Não há backfill de autoria histórica. O fluxo nunca atualiza ou remove Donos.

O resolver compara a criação da sessão no provedor com `role_updated_at`
existente. Sessões anteriores à concessão/mudança deixam de autorizar o Cacau;
a pessoa deve sair e entrar novamente. Timestamp ausente/inválido falha
fechado. Isso também se aplica a vínculos antigos cuja mudança seja posterior
à sessão. A aplicação não declara revogação global de tokens do provedor.

## Identidade na conclusão do reset

O retorno instalado de `resetPassword` não contém usuário. A candidata
consulta uma função restrita no banco do provedor antes de consumir o token.
Ela retorna somente o ID associado a uma verificação não expirada e inequívoca.
A intenção registra o alvo, sem ator presumido; somente sucesso do provedor
permite registrar esse ID como ator. A consulta não retorna token, senha ou
registro de verificação, e esses valores não entram na auditoria. Sem identidade confiável,
o provedor não é chamado para mudar a senha.

Não existe transação distribuída entre Auth e banco operacional. O contrato
anterior de intenção/resultado permanece: falha de auditoria final mantém a
intenção pendente e não reporta sucesso. A prova real de reset/OTP/revogação
continua em H01–H03.

## Configuração necessária antes de publicar

As identidades estão em `g1-auth-hml/br-patient-lake-ac2t0cvq`, projeto
`steep-brook-51659857`; a base operacional continua na branch original,
classificada separadamente. Não consultar `neon_auth` na base operacional por
suposição nem trocar o `DATABASE_URL` existente para implementar a aprovação.

O novo secret `AUTH_DIRECTORY_DATABASE_URL` deve usar uma role exclusiva no
alvo Auth correto. A proposta [SQL](../../scripts/auth-directory-role.proposed.sql)
concede só seis colunas de `neon_auth.user` e execução da função de identidade
do reset. Não concede leitura de `account`, `session` ou `verification`,
escrita, DDL, propriedade ou administração. Usa função `SECURITY DEFINER` com
search_path fixo e tabelas qualificadas, sem execução por PUBLIC.

SHA-256 da proposta: `e6cca8f6bc209a9de410b26dfd23cf2fb201de785fa837edcd2ced925544f160`.
Ela cria role **NOLOGIN**, sem senha. Ativação, credencial, binding e leitura de
volta são passos posteriores, após revisão concreta e autorização aplicável.
Não aplicar esse SQL à base operacional nem repetir em alvo já preparado.
Campos/tipos do provedor foram conferidos por catálogo somente de leitura.

O acesso ao diretório abre no máximo uma conexão por consulta, com timeouts
de 5 s, transação somente de leitura e fechamento aguardado. O pool operacional
por Server Function permanece limitado. Nenhuma credencial é lida de arquivo.
O manifesto exige o novo nome de secret; o HML publicado ainda conserva seus
cinco bindings anteriores. **Não publicar esta candidata antes de preparar e
conferir o diretório: o reset falha fechado se esse recurso estiver ausente.**

## Validação e limites

626 testes Node e 19 cenários PostgreSQL 17 passaram na preparação. O laboratório
usa bancos separados para operação e diretório, role limitada por coluna,
concorrência/replay, revogação do aprovador, negações e rollback tardio.
Consulta de reset desconhecida/expirada/ambígua e tentativa de injeção também
falham fechadas. A proposta SQL é exercitada com nomes de alvo/role sintéticos.
O laboratório conectado aprovou 13 cenários de UI/HTTP/PostgreSQL, incluindo
aprovação pelo Gerente em 320px, vínculo/auditoria persistidos e nova sessão
do destinatário. Build isolado, lint, tipos, formato e Knip aprovados; os
quatro achados conhecidos permanecem sem novas tolerâncias. A suíte Node
final também passou com todos os novos arquivos versionados: 626 testes.
Na PR #77, HEAD `e006d35`, os 12 checks passaram. Três análises CodeQL da
candidata de merge `de76d675` não tiveram resultados, erros ou avisos; zero
alertas abertos. Reconferir o HEAD final antes da integração. Não confundir
candidata validada com entrega publicada ou aceite real. Nenhum acesso real
foi concedido nesta preparação.

Reversão de código: versão HML anterior validada; vínculos/eventos já gravados
devem ser preservados. Desativar a nova role/binding exige procedimento próprio;
não apagar concessões, logs ou dados para reverter a interface.
