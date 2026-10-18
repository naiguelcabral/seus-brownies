# Definition of Done — Cacau v1

Uma tarefa só pode ser marcada como concluída quando todos os itens aplicáveis forem atendidos.

## Código

- Implementação limitada ao escopo da tarefa.
- Sem duplicação desnecessária de lógica.
- Tipagem preservada.
- Sem segredos ou dados sensíveis adicionados ao repositório.

## Banco

Quando houver alteração de schema:

- schema Drizzle atualizado;
- migration versionada gerada/revisada;
- impacto sobre dados existentes documentado;
- nenhuma operação destrutiva aplicada automaticamente;
- plano de rollback ou recuperação descrito quando necessário.

## Testes

- Testes novos ou atualizados para a regra alterada.
- `npm test` aprovado quando aplicável.
- `npm run test:e2e` executado quando o fluxo exige validação E2E e o ambiente está autorizado.
- Casos negativos relevantes cobertos.

## Qualidade

- `npm run lint` aprovado.
- `npm run typecheck` aprovado quando houver alteração TypeScript.
- Build aprovado pelo procedimento isolado aplicável (`build:hml` ou
  `build:ci-isolated`), conforme `DEVELOPMENT-WORKFLOW.md`; não executar o
  build padrão no checkout com arquivos locais de ambiente.
- `npm run check` aprovado quando fizer parte do escopo.
- Nenhum teste removido apenas para fazer a suíte passar.

Para alterações apenas em Markdown, revisão de links e `git diff --check`
substituem verificações de código não afetado. Oxfmt só cobre os formatos e
caminhos definidos nos scripts; não alegar formatação global da documentação.

## Segurança

- Regras de `SECURITY.md` respeitadas.
- Autorização no servidor para fluxos protegidos.
- Nenhum acesso a `.env`.
- Nenhum deploy ou escrita em produção sem aprovação humana.

## Integridade operacional

Quando aplicável:

- operação transacional;
- idempotência preservada;
- estoque não fica negativo;
- dinheiro e quantidades preservam precisão;
- histórico e auditoria não são apagados.

## Documentação

- `PROJECT-STATUS.md` atualizado se o estado entregue mudou.
- `ROADMAP-CODEX.md` atualizado se uma tarefa foi concluída, bloqueada ou replanejada.
- ADR criado quando houver decisão arquitetural relevante.
- Registros históricos específicos preservados.

## Git

- `git diff` revisado.
- Mudanças não relacionadas removidas do escopo.
- Commit descritivo seguindo padrão semântico.
- Push/PR somente conforme nível de autonomia autorizado.

## Resultado final do agente

Ao concluir, o agente deve informar:

1. o que foi alterado;
2. arquivos principais;
3. testes/checks executados e seus resultados;
4. riscos ou pendências;
5. qualquer ação humana necessária.
