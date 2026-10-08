# Smoke público local isolado

A27 prepara Playwright somente para a spec `auth-public-routes.spec.ts`:
redirecionamento do visitante, login público, formulário de recuperação e
redefinição sem token. Não envia credenciais, OTP ou reset, não chama HML e
não executa os cenários de estoque/produção/vendas.

Com árvore limpa e dependências locais instaladas:

```bash
bash scripts/test-public-smoke-isolated.sh
```

Para Brave já instalado, fornecer somente o caminho público do executável:

```bash
CACAU_SMOKE_BROWSER_PATH=/snap/bin/brave bash scripts/test-public-smoke-isolated.sh
```

O runner valida caminhos, recusa symlinks versionados e usa archive HEAD em
diretório temporário privado. O ambiente é limpo, com chave pública sintética,
home/config novos e carregamento de arquivos secretos desativado. A config
usa `127.0.0.1:3459`, recusa servidor existente e bloqueia service workers.
No browser só GET/HEAD para essa origem são permitidos; tráfego externo e
mutações são abortados. Trace, vídeo e screenshots estão desativados; arquivos
temporários são removidos ao terminar.

Não executar a configuração dedicada diretamente no checkout: a variável de
isolamento é interna ao runner. Se socket/browser for bloqueado pelo sandbox,
solicitar elevação somente para este comando. Se não puder ser autorizada,
registrar `BROWSER_HOST_REQUIRED` e continuar outros pacotes. Nunca usar acesso
total como solução. PASS local não homologa login, sessão ou HML.
