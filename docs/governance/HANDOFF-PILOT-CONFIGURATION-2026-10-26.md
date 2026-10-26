# Retomada da publicação do piloto — 26/10/2026

## Estado confirmado

Usuário autorizou “Pode configurar” para Auth e ambiente isolado de teste com notas históricas. #77 integrada em `c6ff2b6e73e5995fc9a800649bfda2399479fd61`; três workflows da main e três análises CodeQL aprovados, zero alertas. #78 integrada em `53e410e8d007787fd42d21ea6c215a5d965e10b7`, após os 12 checks do HEAD `69e2587f9b2348cf2094f1f4064a2524730b3ce2` aprovados. CodeQL real da candidata `63d7d16be498b9f12cd826890044736009c78e24`: três análises limpas, zero alertas. CI da main pós-#78 ainda não conferida.

Recursos aplicados no [recibo](PILOT-CONFIGURATION-2026-10-26.md): cópias operacionais/Auth, roles restritas, seis secrets próprios do piloto, Turnstile validado com token fictício, origem Auth adicionada. Originais preservadas. HML recebeu somente o novo secret do diretório, sem publicação do novo código. Worker piloto está reservado com resposta 503; não liberar como ambiente pronto.

Código entregue: `env.pilot`, namespaces e callback próprios, build isolado em `scripts/build-pilot-isolated.sh`, faixa de teste e contrato de configuração. 627 testes Node, cinco contratos de configuração, lint, typecheck, formato, Knip (quatro achados conhecidos/zero novos) e build piloto isolado aprovados. Links locais e guarda de caminhos sensíveis aprovados. Nenhum teste enfraquecido.

## Próximo passo exato

Após renovar a cota e cumprir CODEX-USAGE-POLICY, retomar a worktree `/tmp/cacau-pr73-contract-20261026`, branch `codex/isolated-pilot-config-20261026`. Principal preservada em `codex/audit-remediation-20261023`. Consultar Git e GitHub antes de agir; não repetir merges, criação de branches, roles ou secrets.

1. Conferir os três workflows e CodeQL real/alertas da main `53e410e8d007787fd42d21ea6c215a5d965e10b7`. Helper de leitura disponível: `/tmp/cacau-check-codeql-current.py refs/heads/main <sha>`.
2. Publicar somente o piloto autorizado, em branch de trabalho limpa com o código integrado: `PILOT_DEPLOY=1 VITE_TURNSTILE_SITE_KEY=0x4AAAAAAFm9r4Dfh7tXmljE bash scripts/build-pilot-isolated.sh`. O comando recompila via archive/ambiente limpo e usa o perfil criptografado somente no deploy. Não usar deploy raiz ou publicar produção.
3. Reler deployment, versões/percentual, seis nomes de secrets, namespaces/callback, redação de query e destino público. Fazer smoke público de login/reset em desktop/móvel, conferir faixa de teste e site key própria. Atualizar recibo, matriz, status e roteiro antes de entregar a URL.
4. Usuário opera login, senha, OTP e desafio. Auth real, replay de Turnstile, acesso por perfil, celular físico e ensaio com notas continuam sem aceite. Notas já representadas não devem ser relançadas; a cópia tem histórico. Nenhuma limpeza de teste automática.

## Pendências e limites

Publicação/readback/smoke ainda não executados. Não há aceite de produção/I04. RPO/RTO/retenção continuam proposta para decidir depois; agenda de backup não alterada. L02 granular e demais gates de sustentação continuam no roadmap. Não conceder contas nem criar fatos presumidos para preencher testes. Não ler arquivos de ambiente ou expor credenciais.

## Capacidade e checkpoint

Fonte oficial mostrou 5% restante na janela principal; reserva obrigatória de 5%. Reset exibido: 26/10/2026 17:07:07 America/Sao_Paulo (20:07:07 UTC). Encerramento por reserva; confirmar renovação antes de retomar. Não existe retomada automática configurada para esta entrega. Executar DESLIGARTUDO nesta branch após salvar o handoff e conferir seu resultado.
