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
`scripts/git-sensitive-paths.py` bloqueia, no checkpoint local e nos scripts
isolados de CI, credencial real no `.env.example` e formato de senha/chave
Neon em qualquer arquivo versionado.

### Identificadores públicos — decisão de 22/10/2026

O repositório é público e permanece assim.

- **IDs de endpoint e hostnames Neon** são a parte roteável de uma conexão e
  passam a ser versionados só como hash: SHA-256 no mapa de destinos HML e
  `ep-[redacted:<8 hex>]` em documentos e evidências. Os gates comparam
  hashes, e nenhuma evidência nova deve gravar o valor em texto puro.
- **IDs de projeto/branch/conta** só funcionam com uma chave da API e ficam
  como referência de auditoria. A **URL do HML** é o próprio site público.
- **SQL de importação com receitas e preços** continua como evidência
  histórica; novas evidências não devem incluir dados comerciais
  dispensáveis ao gate.
- Os valores originais continuam no histórico do Git. A proteção real é a
  credencial: qualquer credencial que chegue ao repositório deve ser
  rotacionada imediatamente, e a reescrita de histórico só deve ser feita
  por decisão própria.

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

## Autenticação — controles obrigatórios

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

### Aprovação de cadastros — decisão de 26/10/2026

O Dono conserva todas as permissões funcionais. O Gerente poderá aprovar
cadastros validados por uma permissão específica de aprovação, separada de
`access:manage`, que também protege configurações e diagnóstico administrativo.
A candidata S02/A04 implementa a primeira liberação de Funcionário, com
consulta restrita à fonte do provedor, transação auditada e nova sessão após
mudança de papel. Configuração, integração/publicação e aceite real permanecem
separados; [procedimento](REGISTRATION-APPROVAL-2026-10-26.md) e permissões em
[AUTHORIZATION-MATRIX.md](AUTHORIZATION-MATRIX.md).

Para implementar a liberação com menor privilégio:

- exigir sessão verificada e vínculo ativo do aprovador, revalidando sua
  autorização no servidor no momento da gravação;
- confirmar a identidade e o e-mail verificado do destinatário em fonte
  confiável do provedor e validar os campos obrigatórios do cadastro;
  e-mail, papel ou indicador de validação enviados pelo navegador não bastam;
- limitar o Gerente à primeira liberação como Funcionário (`employee`), sem
  autoaprovação, promoção, alteração de vínculo existente ou reativação de
  acesso revogado/inativo; concessões de Gerente/Dono ficam com o Dono;
- aplicar autorização e proteção CSRF em toda chamada mutável, inclusive
  chamada direta, sem conceder acesso pelo simples cadastro no provedor;
- persistir concessão e auditoria na mesma transação, com ator e destinatário
  confiáveis, estado anterior/posterior, motivo, UTC e referência inédita;
  tratar repetição e concorrência sem ampliar ou duplicar a concessão;
- preservar revogação/rotação de sessão nas mudanças de privilégio e impedir
  remoção ou rebaixamento do último Dono ativo.

Os controles de segurança, estoque e dinheiro também se aplicam ao Dono.
Esta decisão não concede acesso a nenhuma conta nem autoriza SQL compartilhado.

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
