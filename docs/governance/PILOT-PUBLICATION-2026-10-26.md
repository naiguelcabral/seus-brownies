# Publicação do piloto — 26/10/2026

O piloto está disponível em [Entrar no piloto](https://cacau-v1-piloto.naiguelcabral.workers.dev/login), com faixa **Ambiente de teste · Piloto com notas históricas**. Publicação autorizada pelo pedido de configuração e retomada do usuário. O aceite autenticado e o ensaio das notas são os próximos passos da pessoa operadora.

## Código, publicação e configuração

- HEAD do build: `53e410e8d007787fd42d21ea6c215a5d965e10b7`, merge da PR #78; #77 integrada anteriormente em `c6ff2b6`. Build por archive do HEAD limpo e ambiente vazio, usando somente a site key pública própria do piloto.
- Comando autorizado: `PILOT_DEPLOY=1 VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFm9r4Dfh7tXmljE bash scripts/build-pilot-isolated.sh`. Concluído sem erro; startup informado pelo Wrangler: 9 ms.
- Worker `cacau-v1-piloto`, deployment `e80c16d8-4f70-44c0-9416-139c95288b0e`, versão `d4138431-6f2e-47b7-8de4-c92379452227`, **100%**, em 26/10/2026 21:39:05 UTC (18:39:05 Brasília).
- Seis nomes de secrets relidos como `secret_text`: `DATABASE_URL`, `AUTH_DIRECTORY_DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `TURNSTILE_SECRET_KEY`, `AUTH_LOGIN_HASH_PEPPER`. Valores não foram consultados nesta conferência.
- Callback HTTPS próprio e três namespaces distintos relidos: `2026102601` (20/60s), `2026102602` (60/60s), `2026102603` (600/60s). Flag de exigência verdadeira. Logs persistidos, invocation logs e redação de query habilitados; traces/issues desabilitados.
- Operação em `br-blue-shadow-ackpk8ex` e Auth em `br-orange-shadow-acp4523g`, no projeto `steep-brook-51659857`. As cópias preservam o retrato do histórico e das identidades, com credenciais de runtime próprias. Configuração em [PILOT-CONFIGURATION-2026-10-26.md](PILOT-CONFIGURATION-2026-10-26.md); não equivalem a uma base vazia ou anonimizada.

## Verificação concluída

Main do código publicado: [CI 40376184239](https://github.com/naiguelcabral/seus-brownies/actions/runs/40376184239), [negócio/navegador 40376184254](https://github.com/naiguelcabral/seus-brownies/actions/runs/40376184254) e [CodeQL 40376184401](https://github.com/naiguelcabral/seus-brownies/actions/runs/40376184401) aprovados. Três análises reais do SHA publicado sem resultados, erros ou avisos, zero alertas abertos. Preparação local anterior: 627 testes Node, cinco contratos de configuração, lint, tipos, formato, Knip e build piloto aprovados, sem novas tolerâncias.

Smoke público repetido às 21:54 UTC: raiz 307 para login; login e reset 200; no-store/no-referrer e headers de proteção conferidos. Em 1280/375/320px, faixa visível, botões em linhas separadas, dois acessos ao fluxo de recuperação e ausência de overflow/erro de página. Chave pública própria localizada no cliente publicado. GET/HEAD somente, solicitações mutáveis bloqueadas, nenhuma credencial usada.

Prova A05 do piloto: GET com marcador sintético na query final em 21:47:54 UTC; evento do mesmo Ray ID `a50ca98208afa5e7` e versão publicada localizado. URL armazenada `/login/redefinir-senha` sem query; prefixo do marcador ausente de todo o evento. Consulta temporária (`dry=true`), sem persistir payload ou headers. A prova cobre essa requisição correlacionada; não certifica todos os logs ou tokens reais.

[Recibo JSON sanitizado](../../evidence/pilot-publication-2026-10-26.json).

## Limites e sequência de uso

1. Entrar no endereço do piloto com a própria credencial e confirmar o perfil. Senha, OTP e desafio ficam com a pessoa; não enviar esses valores ao agente. Login/logout, reset real, replay de Turnstile e permissões com sessões reais continuam sem aceite nesta publicação.
2. Conferir compras existentes antes de cada nota antiga: a cópia contém histórico. A referência da nota é texto livre e não impede duplicação por uma operação nova. Usar a data original, unidades e total efetivo por item, conforme o [roteiro e recibo](RECOVERY-PILOT-PROPOSAL-2026-10-26.md).
3. Executar produção, venda, recebimento e entrega somente com suas próprias fontes e sequência. Registrar divergência antes de corrigir; uma compra antiga não recompõe automaticamente custos históricos.

HML anterior permaneceu no deployment `0785e592-e769-450a-b569-68ba0391eed1`, versão `8475bc61-c2c0-49f8-9fa6-de1785948ee0`, em 100%, antes e depois desta publicação. Não houve outra publicação, nova concessão, migration, limpeza, importação ou fato de negócio nesta retomada. RPO/RTO/retenção, sustentação, aceite I05 e liberação I04 continuam separados. A URL pública e o smoke não liberam produção.
