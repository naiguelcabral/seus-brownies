# Componentes físicos de perfil — 18/10/2026

## Escopo implementado localmente

Além de `filling`, fichas podem representar `coating` e `packaging`.
Cobertura/recheio exigem ingrediente, materiais de embalagem exigem embalagem.
A quantidade é por unidade pronta; a base é validada no servidor. O consumo
usa a identidade real do catálogo e a quantidade bruta já utilizada pelo lote.
A embalagem individual existente não pode reaparecer como componente.

Adesivos e cobertura entram no mesmo fluxo transacional de estoque, custo
exato e saídas FIFO; falta de material aborta a conclusão. Não foi alterada
a regra de coprodutos nem presumido rendimento de Bordinhas. Nenhuma ficha
foi cadastrada automaticamente por esta mudança de código.

## Migration e recuperação

DDL gerado em `drizzle/pending-profile-materials/0031_brave_thor.sql`, com
snapshot/journal candidatos isolados. Base: snapshot 0030 de custos exatos.
Duas adições ao enum, sem colunas, backfill ou transformação destrutiva.
Não aplicar a cadeia ativa nem repetir migrations de custos exatos.
Confirmar recibos e identidade do alvo antes de aplicação controlada, com nova
referência, auditoria e commit do enum anterior à escrita dos componentes.
Recuperação preserva o enum e reverte o código; sem remover valores/dados.

## Verificação

Suíte completa: 512 testes passaram antes da inclusão de três casos adicionais
de rejeição transacional. Casos abrangem 50 g de cobertura por unidade,
adesivo por unidade, falta de adesivos, tipos/base incompatíveis, embalagem
duplicada e tentativa de segunda conclusão. Os 20 testes focados finais
passaram. Lint, tipos, Oxfmt e builds isolados CI/HML passaram; Knip manteve
três achados de baseline e zero novos. CI/CodeQL remotos ainda pendentes.
Ensaio PostgreSQL usa somente destino loopback fixo e credenciais sintéticas:

```sh
env -i PATH="$PATH" node scripts/test-profile-materials-disposable.mjs --ack-disposable-postgres17
```

Exige fixture PostgreSQL 17 local na porta 5438 com enum inicial `filling`;
o DDL é executado dentro de transação revertida. Não procura arquivos locais
de ambiente nem acessa Neon. Após iniciar fixture nova PostgreSQL 17 Alpine
e criar o enum inicial, ensaio do SQL exato passou: novos valores visíveis
na transação e enum original preservado após rollback.

## Pendências operacionais

Aplicar migration testada e cadastrar vínculos de adesivo/cobertura aprovados,
com auditoria e sem repetir importações. Atualizar preço/apresentação de
Bordinhas e revisar orçamento de R$ 2.288. Implementar representação de taxas
por pagamento, preservando Pix R$ 0,49/transação e ausência de mix universal.
O custo físico de Bordinhas permanece indefinido e impede ativar o cenário.
HML permanece na versão anterior; nenhuma escrita compartilhada nesta etapa.
