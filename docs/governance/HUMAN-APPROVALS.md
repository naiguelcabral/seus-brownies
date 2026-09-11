# Ações que exigem aprovação humana — Cacau v1

O Codex pode trabalhar de forma autônoma dentro do repositório, mas os itens abaixo são gates obrigatórios.

## Decisões financeiras aprovadas

### G2 — competência, lifecycle, CMV e mix

Aprovado pelo usuário em 11 de setembro de 2026:

1. receita por competência é reconhecida na entrega; caixa permanece uma visão
   separada;
2. fatos originais não são apagados; erro corrige o período original e evento
   posterior pertence à data em que ocorreu;
3. Dono ou Gerente decide entre reembolso e crédito futuro, sempre com registro
   e auditoria;
4. CMV realizado usa FIFO e as alocações de cada item vendido;
5. cancelamento antes da entrega restaura estoque; devolução após a entrega não
   retorna alimento ao estoque vendável;
6. períodos têm fechamento manual; somente Dono corrige período fechado;
7. receita líquida, margem bruta, margem de contribuição, lucro gerencial e
   fluxo de caixa são indicadores distintos;
8. mão de obra e energia diretamente produtivas integram o custo da produção e
   não são descontadas novamente;
9. margem mínima de 70% é alerta configurável, nunca bloqueio de venda;
10. o mix histórico de 103% é normalizado proporcionalmente para 100%,
    preservando os pesos originais.

Esta aprovação autoriza implementação local, testes e migrations aditivas para
revisão. Não autoriza aplicar migration, corrigir dados compartilhados, fazer
backfill, merge ou deploy.

## Aprovação obrigatória

### Produção e infraestrutura

- deploy de produção;
- alteração de Worker/DNS/domínio de produção;
- alteração de secrets;
- alteração do ambiente de produção do Neon;
- promoção de dados entre ambientes.

### Banco e dados

- migration destrutiva;
- `DROP`, `TRUNCATE` ou exclusão em massa;
- backfill de escrita em ambiente compartilhado;
- reprocessamento de importação já aplicada;
- limpeza de dados HML;
- reutilização de referência idempotente consumida;
- correção manual de FIFO/CMV fora de rotina já aprovada.

### Arquitetura

- troca de framework, ORM, banco, hospedagem ou estratégia principal de autenticação;
- inclusão de serviço externo com custo ou dependência operacional relevante;
- mudança de precisão monetária/quantitativa;
- alteração de regra de negócio com impacto financeiro ou de estoque.

### Segurança

- redução de controles de autenticação;
- mudança de RBAC/permissões;
- alteração de política de sessão;
- exposição pública de rota anteriormente protegida.

## Permitido sem aprovação específica

Desde que dentro de uma branch de trabalho e respeitando o restante da governança:

- ler código e documentação versionada, exceto `.env`;
- criar ou editar código;
- criar testes;
- executar testes locais;
- executar lint/build/check;
- gerar migration para revisão sem aplicá-la em ambiente relevante;
- atualizar documentação;
- criar commits locais/descritivos quando o nível de autonomia permitir;
- preparar PR.

## Regra de parada

Ao encontrar qualquer gate desta lista, o agente deve:

1. concluir tudo o que for seguro e reversível antes do gate;
2. registrar o estado atual;
3. explicar exatamente qual decisão é necessária;
4. não contornar o gate por outro caminho técnico.
