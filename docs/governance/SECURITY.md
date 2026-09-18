# Política de segurança — Cacau v1

## Objetivo

Definir controles obrigatórios para desenvolvimento humano e por agentes.

## Segredos

É proibido ao agente:

- ler `.env`;
- exibir valores de variáveis sensíveis;
- versionar `.env`;
- copiar tokens, senhas, URLs privadas ou chaves para documentação, logs ou commits;
- alterar secrets de produção sem aprovação humana explícita.

Arquivos de exemplo podem conter apenas nomes de variáveis e valores fictícios.

## Banco de dados

Sem aprovação humana explícita, o agente não pode:

- executar `DROP DATABASE`, `DROP TABLE` ou truncamentos destrutivos;
- apagar dados HML/auditáveis;
- alterar dados de produção;
- executar backfill de escrita em ambiente compartilhado;
- repetir importações já marcadas como aplicadas;
- reutilizar referências idempotentes consumidas;
- executar migration destrutiva.

Migrations devem ser revisadas antes da aplicação em ambiente com dados relevantes.

## Produção e deploy

Sem aprovação humana explícita, o agente não pode:

- executar deploy de produção;
- modificar DNS, domínio, Worker de produção ou secrets;
- alterar configuração de produção do Neon;
- promover ambiente de desenvolvimento para produção.

Build local e inspeção de configuração versionada são permitidos.

## Autenticação futura

Requisitos mínimos:

- sessão segura com cookie HttpOnly, Secure e SameSite adequado;
- proteção CSRF para operações mutáveis quando aplicável;
- limite de até 5 tentativas consecutivas de autenticação antes de controle adicional;
- rate limiting em login, recuperação e endpoints sensíveis;
- resposta de recuperação de senha sem enumeração de usuários;
- rotação de sessão em mudança de privilégio;
- registro auditável de eventos de autenticação;
- RBAC aplicado no servidor, nunca apenas escondendo elementos da UI;
- CAPTCHA/desafio adicional em fluxo suspeito ou repetitivo quando adotado.
- Neon Auth Beta pode permitir cadastro público de identidade. Uma sessão Neon
  não concede acesso ao Cacau: todo principal precisa de e-mail verificado
  quando exigido, vínculo ativo em `app_user_access`, papel canônico válido e
  autorização explícita na Server Function. Ausência, inativação ou papel
  inválido falham fechados.

## Auditoria

Operações críticas devem permitir responder:

- quem executou;
- o que foi executado;
- quando;
- qual entidade foi afetada;
- qual era o estado anterior, quando relevante;
- qual é o estado posterior;
- qual referência/idempotency key originou o evento.

## Integridade financeira e de estoque

- Não usar `number`/float como armazenamento persistido para dinheiro.
- Não permitir estoque negativo por fluxo operacional normal.
- Não concluir o mesmo lote duas vezes.
- Não baixar estoque duas vezes pela mesma operação idempotente.
- Não editar saldo diretamente para ocultar inconsistência.
- Ajustes devem possuir motivo e trilha auditável.

## Dependências

Atualizações de dependências que alterem major version, runtime, framework, ORM, banco, autenticação ou deployment exigem revisão humana antes de merge.

## Resposta a falhas

Se um teste de segurança, integridade de estoque, idempotência, money precision ou lifecycle falhar, a tarefa deve ser considerada bloqueada até correção. Não remover ou enfraquecer o teste para obter sucesso artificial.
