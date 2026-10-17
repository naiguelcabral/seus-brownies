# Correções de segurança e modernização — 16 de outubro de 2026

## Pacote de segurança

Base local: `23f9d85`, migração TypeScript 7/Oxc. A auditoria inicial tinha
26 entradas afetadas (8 críticas, 7 altas e 11 moderadas), incluindo propagação
de avisos na árvore. O lockfile final retorna zero em todas as severidades.
Isso é evidência da base de advisories consultada, não ausência universal de risco.

Atualizados TanStack Start/Router e ferramentas associadas com versões explícitas,
Cloudflare Vite/Wrangler/Vite, Neon SDK 0.8.0-beta, Drizzle Kit/ORM e React/DOM
19.3.1 com seus tipos. Foram preservados Node 22, TypeScript 7, a estratégia de
autenticação, as regras de sessão e autorização e a cadeia de migrations.

O TanStack corrigido exige `appendResponseHeader` para acrescentar cookies;
o snapshot retornado por `getResponseHeaders` agora é somente leitura.
As telas de erro passaram a aceitar `unknown` e verificar `instanceof Error`.
O estoque exibe `—` quando um limite opcional não está disponível; não inventa
um limite zero. A tabela de motivos de cenários passou a expressar chaves ausentes.

Overrides revisados e exercitados:

- `shell-quote` 1.12.0: corrige a cadeia do launcher de ferramentas.
- `@tailwindcss/typography` → `postcss-selector-parser` 7.1.6: parser de seletores
  corrigido; teste de estrutura de seletor e build CSS aprovados.
- `@esbuild-kit/core-utils` → `esbuild` 0.28.2: elimina a versão antiga do loader
  legado; teste real de transformação TypeScript/BigInt aprovado. O esbuild do
  Drizzle Kit permanece na versão compatível 0.25.12, também corrigida.

O teste de segurança impede o retorno das versões afetadas identificadas, inclusive
em instalações aninhadas. Dependências transitivas removidas são aceitas, enquanto
os pacotes de framework usados pelo projeto precisam continuar presentes.

Validação: instalação limpa, tipos, lint, 456 testes originais e três regressões
de segurança aprovados. Na primeira execução completa o novo teste exigia a
presença de `fast-uri`, já removido pela atualização; a asserção foi corrigida
para validar todas as versões presentes e as três regressões foram repetidas.
Build isolado de HEAD mais diff aprovado, sem credenciais, com chave pública
sintética. Nenhum banco compartilhado, migration, deploy ou login real foi executado.
OTP/reset/login/sessão reais permanecem sujeitos à homologação autorizada.

## Pacote de melhorias

Após o pacote de segurança `201a1ee`, habilitados `exactOptionalPropertyTypes` e
`noUncheckedIndexedAccess` no projeto inteiro, incluindo testes e scripts.
Os 24 e 267 diagnósticos identificados separadamente na análise foram tratados
sem desligar verificações nem adicionar non-null assertions para silenciá-los.

Consultas obrigatórias e acessos que dependem de invariantes usam `requireFirst`
ou `requireDefined`: ausência provoca erro controlado, sem fabricar dinheiro,
quantidades ou linhas. Consultas opcionais de identidade/tentativas retornam
`null` quando não há resultado. Campos opcionais são omitidos quando necessário;
eventos auditáveis mantêm a normalização já existente para `null`. Uma entrada
Zod e props de filtros permitem `undefined` explicitamente onde esse é o contrato.
Ausência de reversões continua significando zero revertido, como os planners
FIFO já tratavam anteriormente.

Regras React adicionais: pureza, imutabilidade, refs e set-state-in-effect.
Datas iniciais de formulários são calculadas em inicializadores de estado;
sentinelas de hidratação usam `useHydrated`. O tema usa `useSyncExternalStore`,
snapshot SSR estável e eventos de armazenamento, sem setState síncrono no efeito.
O rodapé preserva o ano obtido na inicialização do componente. Não foi adicionado
React Compiler nem alterada a política de sessão/autorização.

Regressões adicionais verificam valores obrigatórios sem substituir valores
falsy, rollback antes de escritas para lote ausente e SSR do tema/rodapé sem
navegador. Tipos, lint e check aprovados; 463 testes aprovados e build em fechamento.
Migrations, dados, precisão, referências idempotentes e evidências permanecem
preservados. Homologação real, CI remota, revisão e publicação são etapas separadas.

Referências: [TanStack XSS](https://github.com/advisories/GHSA-qx66-fv34-fjm8),
[esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99),
[parser CSS](https://github.com/advisories/GHSA-rj75-hqrm-r3gf),
[shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv).
