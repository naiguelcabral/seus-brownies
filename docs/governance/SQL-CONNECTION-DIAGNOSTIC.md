# Diagnóstico SQL do Worker

## Autorização de execução — 17 de outubro de 2026

O usuário autorizou publicar em `cacau-v1-hml` para testar a conexão, conforme
escopo registrado em `HUMAN-APPROVALS.md`. A publicação começa com o flag
desativado; ativação temporária somente para o teste autenticado e
desativação ao fim. Isso não autoriza alterar schema ou dados.

Pré-publicação revalidada nesta execução: 474 testes, typecheck, lint,
formatação e `git diff --check` aprovados. A chave pública Turnstile HML foi
obtida da listagem oficial de widgets, sem acesso ao segredo. A alteração
local preexistente em `.env.example` fica fora do commit e da publicação;
um checkout temporário limpo do commit revisado será usado para o build.

## Preparação original

Implementação local em 17 de outubro de 2026. Não publicada nem executada
contra banco externo. Não fecha os gates de acesso não gravável, migrations,
destino, abrangência, backup/restauração ou homologação.

## Escopo

Página `/diagnostico-conexao`, acionada manualmente. Server Function POST
`checkSqlConnection`, protegida pelo CSRF global e pela permissão existente
`access:manage` (Dono e admin legado). Nenhum papel/permissão foi ampliado.
Resposta sem cache; nenhuma consulta automática ao abrir a página.

O flag de runtime `SQL_CONNECTION_PROBE_ENABLED` precisa ser exatamente `true`.
Ausente/desativado, rejeita antes de resolver o principal ou abrir conexão.
Não foi adicionado à configuração de deploy. A autenticação normal resolve
sessão Neon Auth e lê `app_user_access`; se esse schema/vínculo não funcionar,
o diagnóstico permanece fechado. Não fornece acesso anônimo de recuperação.

Cliente `pg` por operação, com o mesmo `DATABASE_URL` do runtime usado pela
aplicação, sem carregar arquivos de ambiente. Timeouts de conexão, consulta
e statement de 5 segundos. Não muda TLS, role, URL ou configuração persistida.

Sequência: conectar → `BEGIN READ ONLY` →
`SELECT 1 AS connection_ok, current_setting('transaction_read_only') AS read_only`
→ `ROLLBACK` → fechar cliente. Sucesso exige valor 1, READ ONLY `on`, rollback
e fechamento bem-sucedidos. Não lê tabelas de negócio ou journal, não recebe
SQL nem conexão do navegador. Retorna apenas `ok`, status fixo e UTC de início;
não retorna erros do driver, usuário, host, banco ou segredo.

READ ONLY nesta transação não comprova role incapaz de escrita. O teste
confirma somente conexão/autenticação/execução SQL pelo Worker. Não identifica
sozinho projeto/branch/endpoint e não comprova schema ou integridade.

## Procedimento após aprovação específica

1. Revisar o diff completo: o deploy publica a aplicação, não só o diagnóstico.
   O alvo declarado é production de `steep-brook-51659857`, ainda protegido.
   Não usar coletor HML nem reclassificar para viabilizar o teste.
2. Aprovar publicação em `cacau-v1-hml`, ativação temporária do flag e execução
   deste teste mínimo contra o destino declarado. Sem migrations ou reparos.
3. Registrar versão/deployment ativos e atestar em privado o destino do secret.
   A entrada do flag também pode gerar versão: conferir a versão final.
4. Autenticar usuário já autorizado; acessar `/diagnostico-conexao` e clicar
   uma vez em “Verificar conexão”. Registrar status/UTC e conferir novamente
   a versão ativa/tráfego, evitando atribuir resultado a versão concorrente.
5. Se falhar, manter estado não comprovado, sem expor logs/DSN ou abrir permissões.
6. Desativar/remover o flag após o teste mediante a mesma autorização temporária.
   Registrar versão final e conclusão sanitizada; não publicar credenciais.

Deploy, alteração do flag e execução externa não foram realizados nesta tarefa.

## Verificação local

474 testes da suíte geral aprovados fora do sandbox (a primeira execução
restrita encontrou falhas de permissão em subprocessos/sockets). Typecheck,
lint sem avisos, check de formatação e build HML isolado aprovados. Build com
chave pública sintética e fontes sem arquivos de ambiente/credenciais; avisos
de sourcemap/desempenho do bundler não impediram o build.
