# Atualização de segurança publicada no piloto — 29/10/2026

Publicação autorizada por “Pode publicar a versão atualizada no piloto” e
retomada por “Vamos seguir”. Após renovação confirmada de capacidade (99%
restante) e `LIGARTUDO --prepare-only`, a PR #91 foi revisada e integrada
normalmente, preservando os commits e as proteções da main.

## Versão publicada

Fonte `91299ef04e45663f36f8ce203a2949407a2fadfb`, merge da PR #91 às
08:23:51 UTC. Inclui Better Auth 1.7.10, renderer 2.2.0 sem deepmerge e o
patch Seroval 1.6.11. Nenhuma versão TanStack foi alterada pelo último patch.

Build/deploy pelo `scripts/build-pilot-isolated.sh`, com archive do HEAD
limpo, ambiente isolado e chave pública própria do piloto conferida.
Worker `cacau-v1-piloto`, deployment `adb8bdfb-354c-4d0a-9adb-b36147e43d4c`,
versão `16a49edf-073c-4613-a995-d07a8542040f`, **100%**, publicado às
08:28:02 UTC (05:28:02 Brasília). Substitui a versão `0cdcdb1d`.

[Abrir piloto](https://cacau-v1-piloto.naiguelcabral.workers.dev/).

## Evidências

- 642 testes Node, incluindo oito regressões de dependências, qualidade e
  build isolado da candidata aprovados; auditoria online de dependências
  repetida na retomada com zero vulnerabilidades.
- Main publicada com [CI](https://github.com/naiguelcabral/seus-brownies/actions/runs/40841832422),
  [negócio/navegador](https://github.com/naiguelcabral/seus-brownies/actions/runs/40841832400)
  e [CodeQL](https://github.com/naiguelcabral/seus-brownies/actions/runs/40841832545)
  aprovados. Três análises reais do SHA sem resultados/erros/avisos e zero
  alertas CodeQL abertos.
- Leitura remota confirmou seis nomes de secrets, três namespaces/limites,
  callback, flag de exigência, compatibility date/flags e observabilidade
  idênticos antes/depois. Valores de secrets não foram consultados.
- Smoke HTTP às 08:31:34 UTC: raiz/acessos redirecionam ao login; compras e
  produção normalizam `page=1` antes do redirecionamento ao login. Login e
  redefinição retornam 200; no-store, no-referrer, HSTS, nosniff, DENY e CSP
  Report-Only conferidos. Oito GETs, nenhuma credencial ou requisição mutável.
  A primeira expectativa do script desconsiderava a normalização de busca;
  foi corrigida para verificar também o segundo salto e a proteção anônima.
- Navegador abriu o painel com sessão autenticada já existente, faixa do
  piloto e registros esperados; zero mensagens de console no nível error.
  O agente não efetuou login, logout, reset, desafio ou escrita operacional.
- Contagens antes (08:24:56 UTC) e depois (08:30:05 UTC): três compras, sete
  itens, sete movimentos, zero lotes de produção, vendas ou eventos
  financeiros. Essa comparação não atesta identidade de todos os campos.

[Recibo sanitizado](../../evidence/pilot-security-publication-2026-10-29.json)
e [smoke HTTP](../../evidence/pilot-security-http-smoke-2026-10-29.json).

## Continuidade

Publicação concluída; não repetir deploy, importações ou referências consumidas.
A sessão autenticada está acessível no navegador controlável. A preparação
dos 24 brownies de brigadeiro continua separada; não há venda definida e
nenhum fato de produção foi registrado por esta publicação. PR #88 continua
documentação em draft, sem integração por este recibo.

O peer herdado da UI, Dependabot alerts desativados e a versão/configuração
interna não atestada do Auth gerenciado permanecem nos limites da
[revisão](SECURITY-ALERT-REVIEW-2026-10-28.md). O patch npm não atualiza o
servidor gerenciado. Aceite completo I05, RPO/RTO/retenção e liberação I04
permanecem pendentes. HML anterior e produção não foram alterados.
