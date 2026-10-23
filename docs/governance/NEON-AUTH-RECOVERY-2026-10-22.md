# Recuperação da conexão Neon e do login — 22/10/2026

## Resultado e escopo

Reparo de configuração aplicado somente ao Worker `cacau-v1-hml`, após o
relato de que todos os usuários estavam sem conseguir entrar e autorização
expressa para executar os procedimentos necessários à correção. Última versão
confirmada `997f47bb-6be0-4a78-b1fe-f46ea1fef512`, deployment
`41ec1f4b-91be-4be6-947e-b5979b697d99`, 100% desde
23/10/2026 00:36:05 UTC (22/10, 21:36 Brasília).

A consulta de sessão com token deliberadamente inválido passou de HTTP 500
para HTTP 200 na tela de login após reconstruir `NEON_AUTH_BASE_URL` a partir
dos metadados atuais do Neon. Isso comprova recuperação desse caminho de
comunicação/rejeição de sessão, sem conceder acesso. Entrada com senha real
e aceite por perfil foram solicitados ao usuário; continuam sem confirmação
neste checkpoint. Não declarar H01–H03 concluídos com esse teste.

## Diagnóstico somente de leitura

- Projeto `steep-brook-51659857`, PostgreSQL 17, três computes ativos.
- Banco operacional: `production/br-lingering-wind-acwh5wap`, `neondb`.
  `SELECT 1` aprovado; 38 tabelas em `public`, 36 recibos Drizzle e nenhum
  cooldown de login ativo. A classificação original de produção permanece;
  não há autorização implícita para alterar seus dados ou schema.
- Identidades: `g1-auth-hml/br-patient-lake-ac2t0cvq`, `neondb`, Better Auth.
  Cinco usuários, quatro verificados, nenhum banido e cinco contas de
  credencial. Existiam 21 sessões ainda não expiradas na consulta inicial;
  essa contagem não comprova que navegadores conseguem utilizá-las.
- Os quatro vínculos de `app_user_access` foram comparados em memória com as
  identidades do provedor: um Dono, dois Gerentes e um Funcionário. Cada um
  corresponde a exatamente uma identidade verificada, não banida, com
  credencial presente. A quinta identidade não recebe concessão por inferência.
  IDs, e-mails, fingerprints e hashes de senha não entram nesta evidência.
- Origem pública HML e localhost já estavam autorizados no provedor.
- Os endpoints do provedor `/ok` e `/get-session`, sem credenciais,
  responderam HTTP 200 antes do reparo.
- Auditoria operacional de Auth nas 24 horas iniciais: quatro falhas de
  login classificadas `provider_unavailable`. Não são evidência de senha
  incorreta. Logs HML nas três horas consultadas: oito eventos sanitizados
  `auth.session.provider`, stage `unexpected`, na versão `d15a362b`.

## Divergência e reparo

O histórico do Cloudflare registra atualizações manuais de `DATABASE_URL`
às 23:28/23:51 UTC e de `NEON_AUTH_BASE_URL` às 23:52 UTC de 22/10; em seguida,
o secret de banco foi removido e recriado como variável comum. Esses são
metadados observados; o conteúdo antigo do secret Auth não foi recuperado.

1. O destino da variável de banco foi confrontado em memória com os
   identificadores Neon. Continuava apontando à base operacional esperada,
   com pooling. Um PUT direto como secret foi recusado com erro 10053 por
   conflito com a variável existente; nenhuma alteração ocorreu nessa tentativa.
2. PATCH único de settings converteu `DATABASE_URL` de `plain_text` para
   `secret_text`, reutilizando o mesmo valor em memória e herdando todos os
   demais bindings. Não houve troca do banco, role ou senha. Observabilidade
   preservada. Versão intermediária `7e3004d2-6265-4f1c-8fab-90cc5abca031`.
3. A CLI Neon consultou explicitamente `g1-auth-hml`; o endpoint foi validado
   por origem HTTPS, formato e disponibilidade. A URL foi transmitida por
   stdin ao Wrangler para substituir apenas `NEON_AUTH_BASE_URL` no HML.
   Execução fora do checkout, com configuração temporária pública e sem
   carregamento de arquivos locais de ambiente. Valores privados não foram
   impressos, versionados ou gravados no script de reparo.
4. Readback confirmou os cinco secrets obrigatórios, limiter 20/60s e callback
   esperado. A publicação resultante foi relida em 100%.

Após converter apenas o binding do banco, o teste com token inválido ainda
retornava 500. Após reconstruir o apontamento de Auth, retornou 200. Essa
comparação delimita o efeito do segundo reparo. O valor antigo do endpoint
e o motivo exato da exceção upstream continuam desconhecidos; não atribuir
o incidente a senha, indisponibilidade geral do Neon ou perda de usuários.

## Verificações e preservação

- HML público: raiz 307 para login; `/login` 200.
- Sessão inválida: 500 antes, 200 após o reparo; sem sessão autorizada.
- 25 testes Node aprovados: configuração, SDK de sessão, adapter e principal,
  incluindo falha fechada, revogação, erros HTTP/transporte e sanitização.
- Consulta inicial pós-reparo de logs, de 00:36:05 a 00:36:55 UTC: nenhum
  evento `auth.session.provider`. Janela curta; não atesta estabilidade futura.
- Sem alteração de fonte da aplicação, migration, SQL de escrita, cadastro,
  senha, papel, cookie secret, DNS ou Worker principal. Sem envio de e-mail,
  reset de senha, limpeza de sessões ou fatos operacionais fictícios.
- Build, lint e suíte completa não repetidos: este pacote registra reparo
  remoto de configuração e documentação; não contém mudança de bundle.
- Uso Codex: não disponível para esta execução.

Recibo: [metadados sanitizados](../../evidence/neon-auth-recovery-2026-10-22.json).
Os gates de autenticação ampliada, recuperação, ambientes e produção continuam
no [roadmap único](ROADMAP-CODEX.md).
