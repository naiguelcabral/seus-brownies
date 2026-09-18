# G1 — Runbook de homologação E2E HML não destrutiva

## Finalidade e limite

Este runbook prepara uma futura execução humana autorizada. Não autoriza sua
execução por agente, não cria identidades, vínculos, papéis, dados de negócio,
seeds, migrations ou configuração externa. O único alvo permitido é
`https://cacau-v1-hml.naiguelcabral.workers.dev`; produção não é um alvo
alternativo.

A spec correspondente é `e2e/auth-hml-non-destructive.spec.ts`, executada
somente pela configuração `playwright.auth-hml.config.ts`. Ela recusa iniciar
sem o opt-in exato `CACAU_HML_AUTH_E2E=authorized`, antes de abrir navegador ou
fazer rede. A configuração não inicia servidor local e não lê `.env*` nem
`.dev.vars`.

## Gates humanos obrigatórios

1. Aprovação explícita para a data, a janela e o alvo HML.
2. Confirmação de identidades HML já existentes e autorizadas para Dono,
   e-mail não verificado, sem allowlist, vínculo inativo e papel insuficiente.
   Não criar nem modificar nenhuma delas para preencher a matriz.
3. Confirmação de que a execução não reutilizará OTP, link de reset ou outra
   referência consumível fora da etapa humana aprovada.
4. Operador autorizado para consultar evidência de auditoria sanitizada, sem
   exportar dados ou valores para Git, console, artefatos ou chat.

Credenciais e aliases das identidades ficam fora do Git e são fornecidos ao
processo somente durante o gate humano por canal aprovado. Nunca usar `.env*`,
histórico de shell, logs, traces, screenshots, vídeos ou `storageState`
versionado. A spec desliga trace, screenshot e vídeo.

## Preparação controlada

1. Confirmar branch, árvore limpa e que não há A06 em execução.
2. Confirmar a URL HML canônica visualmente, sem substituir host, esquema ou
   caminho por variável, wildcard ou fallback.
3. Entregar ao processo uma entrada transitória com as cinco identidades
   existentes, sem registrá-la. A entrada deve conter somente os campos
   necessários pelo contrato da spec: `owner`, `noAllowlist`, `inactive`,
   `insufficientRole` e `unverified`, cada uma com e-mail e senha.
4. Definir o opt-in exato apenas após as confirmações anteriores. Sem ele, a
   configuração deve falhar antes da criação de browser/contexto/rede.
5. Antes de executar qualquer caso que envie e-mail, consuma OTP ou altere
   senha, parar: essas etapas são manuais e exigem aprovação específica.

## Matriz da futura execução

| Caso                  | Pré-requisito                                    | Ação autorizada                                                            | Resultado esperado                                                                        | Evidência sanitizada                                                        | Gate                          |
| --------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| Navegação pública     | HML canônica disponível                          | Abrir `/` e `/login`                                                       | `/` redireciona a `/login`; título de login visível                                       | URL/path e status visual, sem cabeçalhos                                    | leitura pública humana        |
| Login Dono            | Dono ativo, verificado e já autorizado           | Entrar com a identidade aprovada                                           | painel operacional acessível                                                              | resultado, horário, `request_id` se exibido                                 | identidade humana             |
| Sessão/cookie         | Login Dono concluído                             | Conferir em memória apenas atributos HttpOnly/Secure/SameSite; nunca valor | cookie de sessão com atributos esperados; recarga preserva sessão                         | nomes/atributos, sem valor                                                  | identidade humana             |
| Logout                | Sessão do Dono ativa                             | Acionar `Sair`, voltar a `/`                                               | retorna a login; sessão não autoriza rota protegida                                       | URL/path e resultado                                                        | identidade humana             |
| OTP/e-mail verificado | Identidade não verificada e caixa autorizada     | Login; operador recebe e informa OTP manualmente                           | fluxo de confirmação; após êxito, estado verificado conforme Neon Auth                    | ação/resultado/hora, sem OTP ou e-mail                                      | identidade e e-mail humanos   |
| Reset de senha        | Identidade exclusiva aprovada e canal de e-mail  | Operador conduz solicitação/link/reset fora da spec                        | resposta não enumerável, token único/expiração e sessões conforme confirmação do provedor | ação/resultado/hora; nunca token, senha, link ou cookie                     | aprovação específica de reset |
| Sem allowlist         | Identidade Neon existente sem vínculo Cacau      | Login                                                                      | acesso operacional negado                                                                 | mensagem/código sanitizado e hora                                           | identidade humana             |
| Vínculo inativo       | Identidade existente com vínculo já inativo      | Login                                                                      | acesso operacional negado                                                                 | mensagem/código sanitizado e hora                                           | identidade humana             |
| E-mail não verificado | Identidade existente sem verificação             | Login sem consumir OTP                                                     | permanece no fluxo de confirmação                                                         | tela/resultado e hora                                                       | identidade humana             |
| Papel insuficiente    | Funcionário ou papel aprovado sem relatório      | Login e abrir `/relatorios`                                                | rota/função protegida não entrega indicadores                                             | URL, resultado sanitizado e hora                                            | identidade humana             |
| Auditoria sanitizada  | Operador com autorização de leitura de evidência | Conferir ações/resultados correlatos                                       | eventos contêm ação, resultado, ator quando disponível, motivo sanitizado e `request_id`  | campos permitidos; nunca credencial, token, cookie, e-mail bruto ou segredo | acesso humano externo         |

## Protocolo de evidência e parada

- Registrar somente caso, resultado, horário, caminho, código/status quando
  visível, e identificador de requisição sanitizado quando disponível.
- Não salvar HAR, trace, vídeo, screenshot, cookie, corpo de request/response,
  cabeçalhos de autorização, e-mail, senha, OTP, token ou link de reset.
- Ao encontrar resultado inesperado, parar o caso, invalidar a sessão pelo
  logout normal quando possível e abrir um registro sanitizado. Não ajustar
  configuração, Worker, banco, Neon, Cloudflare ou RBAC durante a execução.
- A spec não faz cadastro, seed, migration, modificação de vínculo/papel,
  operação de negócio, solicitação real de reset ou consumo de OTP.

## Situação da spec

A spec está **preparada**, mas nenhuma execução HML foi realizada por este
pacote. OTP, reset e auditoria persistida permanecem etapas humanas. A futura
execução deve ocorrer apenas após todos os gates acima e não promove produção.
