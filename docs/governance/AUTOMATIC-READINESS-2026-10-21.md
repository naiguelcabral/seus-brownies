# Validação automática de segurança e recuperação — 21/10/2026

Execução autorizada por “Pode seguir realizando as tarefas de forma automática”,
após apresentação de S03, I02, T02, H06, G01 e proposta G03. O acompanhamento
permanece no [roadmap](ROADMAP-CODEX.md). Sem merge, deploy ou SQL compartilhado.

## Segurança

Auditoria inicial identificou launch-editor 2.14.1 transitivo de
@tanstack/devtools-vite → @tanstack/devtools-bundler-core. Três advisories:
[escape de porcentagem](https://github.com/advisories/GHSA-698v-4r3x-3vcv),
[argumentos de editor](https://github.com/advisories/GHSA-r825-w8mm-5pxw) e
[bypass de existência no Windows](https://github.com/advisories/GHSA-587h-7wmj-h5pm).
Patch publicado 2.14.2; override exato e lockfile alteram somente esse nó
(versão/resolução/integridade e requisito shell-quote; versão de shell-quote
permanece 1.12.0). Nenhuma atualização de Auth/framework/runtime. Teste de
segurança impede voltar a versões vulneráveis. npm ci e nova auditoria:
zero vulnerabilidades; avisos de peers Better Auth preexistentes preservados.

CodeQL da main b82e044: análises 1993629049, 1993627128 e 1993626413, com
103/50/23 regras, zero resultados/erros/avisos. API ainda apresenta cinco
alertas abertos da categoria antiga `.github/workflows/codeql.yml:analyze`,
última instância 82011f4. Conferência contra o código atual:

| Alertas | Regra/local | Correção presente |
| --- | --- | --- |
| #11 | js/insecure-temporary-file, runner da cadeia | Diretório mkdtemp, arquivos exclusivos com flag wx e modo 0600 |
| #6/#7/#8 | js/file-system-race, testes de memória | readPrivateFile verifica fstat e lê pelo mesmo descritor O_NOFOLLOW, sem reabrir caminho |
| #1 | js/incomplete-sanitization, contrato de auth HML | Lista exata das URLs extraídas e origem conferida com new URL, sem regex construída a partir da URL |

Triagem técnica concluída, sem fechar/dispensar alerta manualmente. A categoria
atual `/language:*` não encerra automaticamente os resultados da categoria
anterior. A CI/CodeQL da nova candidata devem ser conferidos antes do aceite;
tratamento administrativo dos alertas antigos continua explícito.

## Recuperação externa

Google Drive privado localizado pela skill de Drive; dump e manifesto
baixados por referência autenticada, sem base64 ou publicação do conteúdo.
Links assinados não entram no Git. A primeira referência expirou; download
com referências renovadas passou. Arquivos privados 0600 em backups-local/.

Dump de 224555 bytes, SHA-256
`0bd53e39fb98df6b1edf2da4f191bc2dc0b0603ce334e68fe787204ce55126e6`, igual
ao manifesto. Restore em container PostgreSQL 17 novo, `--network none`, sem
porta publicada. Conferidos 38 tabelas, 36 recibos/hash/timestamps exatos,
nove seções do catálogo independente e constraints validadas. Catálogo
`eaf0bdbe68314126ae27af14c1b01f5a7ecd5fd77859290a9b5e90d6fdcc17ec`, igual
à referência 0033. Registrados digests agregados por tabela, sem conteúdo de
linhas. [Recibo](../../evidence/offsite-restore-2026-10-21.json).

O helper antigo retorna offsite_bytes_restored:false por ser genérico para
restore local; a comprovação de proveniência e a inspeção adicional desta
execução estão no recibo novo, com offsite_bytes_restored:true. O download foi
efetivo, não substituído pelo arquivo local anterior. Sem alteração da origem.
Auth gerenciado excluído. Retenção, responsáveis, RPO/RTO e recuperação de
Auth permanecem pendentes; o ensaio não mede o RTO de produção.

## Ambientes, QA e governança

[Inventário](../../evidence/environment-metadata-2026-10-21.json) somente de
metadados Neon; [procedimento T02](MIGRATION-OPERATOR-PROCEDURE.md) preparado,
sem nova classificação de ambiente ou autorização de migration. Testes de
readiness continuam negando alvos desconhecidos/production e evidência inválida.

Teste adicional de produto: viewport 320×568, redução de movimento, abertura
com Enter, contenção de Shift+Tab, Escape/retorno de foco e ausência de
overflow horizontal. Dados sintéticos e rede restrita ao laboratório local;
não declara auditoria WCAG completa ou aceite de celular físico.

[Proposta G03](MAIN-PROTECTION-PROPOSAL.md) e payload prontos para decisão
administrativa. Fila do controlador reconciliada como espelho do roadmap,
sem pacotes ready nem ativação de autonomia/recorrência. Documentos de
ambientes, resiliência, QA e paridade distinguem os checkpoints atuais dos
registros históricos.

## Verificações e limites

560 testes Node, lint, typecheck, Oxfmt e Knip (quatro contextuais, zero novos)
aprovados; instalação limpa npm ci e npm audit com zero vulnerabilidades.
Execução restrita de alguns testes falhou por spawnSync git EPERM; repetição
autorizada no host passou sem alterar testes. Build HML isolado em 2bcb597
aprovado com chave pública sintética, sem deploy. 40 casos de navegador
isolado aprovados em 33,7s, incluindo o novo caso de teclado/320px.
Checks remotos serão registrados no checkpoint final desta evidência.

Ainda humanos: H01–H03, H06 físico/uso diário, políticas I02/I03, G03 aplicado,
aplicações compartilhadas T02, piloto I05 e produção I04. Nenhuma permissão,
política de sessão, regra financeira/estoque, dado compartilhado ou secret foi
alterado. Downloads/backups privados não são anexados à PR.
