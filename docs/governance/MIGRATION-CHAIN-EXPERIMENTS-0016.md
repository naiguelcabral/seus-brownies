# Experimentos da cadeia a partir da 0016

Tarefa [#36](https://github.com/naiguelcabral/seus-brownies/issues/36), 9 de outubro de 2026.
**Aplicação HML e substituição ativa não autorizadas.** Este pacote constrói candidatas
somente em diretórios temporários. Nenhum SQL, journal ou snapshot em `drizzle/` é alterado.

## Origem e reprodução

Origem imutável: `1e5bd557a1bd57c89f65fe03fa013eb0f8af6d70`.
CI pós-merge da main: [37944960379](https://github.com/naiguelcabral/seus-brownies/actions/runs/37944960379), verde no mesmo SHA.
O manifesto `test/fixtures/migration-chain-source-manifest.json` fixa os hashes dos
29 SQLs, journal e todos os snapshots existentes. Os bytes antigos permanecem no
[commit de origem](https://github.com/naiguelcabral/seus-brownies/tree/1e5bd557a1bd57c89f65fe03fa013eb0f8af6d70/drizzle).
A geração recusa drift desse histórico. Cada execução publica manifesto candidato,
histórico efetivamente aplicado e catálogo real no artefato sintético da CI.

Executar pelo workflow `Migration chain disposable PostgreSQL 17`. Ele cria um
serviço efêmero PostgreSQL 17, sem secrets e sem DSN externa. O runner fixa host
loopback, porta 5433, usuário/banco exclusivos de fixture e verifica a versão.
Cria bancos novos e exige ausência de tabelas antes dos testes; não limpa bancos existentes.
Não lê `.env`, `DATABASE_URL`, Neon ou Worker. Com o serviço equivalente disponível:

```sh
node scripts/test-migration-chain-disposable.mjs --ack-disposable-postgres17
```

## Comparação das candidatas

| Estratégia            | Construção temporária                                                                                      | Histórico final | Consequência                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Substituição          | Troca as três referências `unit` por `measurement_unit` na 0017; preserva os demais SQLs e timestamps      | 29 registros    | Menor mudança e preferência inicial; só elegível após comprovar ausência de 0017+ em todas as bases compartilhadas                                                |
| Compatibilidade       | Renomeia a coluna antes da 0017, reproduz SQLs antigos, renomeia de volta e reescreve o corpo da função    | 31 registros    | Preserva bytes antigos, mas acrescenta dois passos, estado temporário e retirada obrigatória; o protocolo deve permanecer numa transação                          |
| Nova linha desde 0016 | Consolida os SQLs manuais e DML corrigidos de 0017–0028 em uma migration, liga o snapshot final ao da 0016 | 18 registros    | Funciona como replay consolidado candidato; não equivale a gerar apenas um diff de schema. Exige seleção inequívoca da linha e tratamento de histórico divergente |

Uma 0029 isolada não contorna a falha da 0017. A compatibilidade ingênua que apenas
renomeia de volta é testada como negativa: a criação passa, mas o corpo PL/pgSQL
continua referindo `unit` e a atualização falha com `42703`.

## Provas e limites

Estado inicial: implementação pronta, execução PostgreSQL na CI pendente.
Não considerar um teste aprovado antes da conclusão verde no SHA correspondente.

São seis caminhos de sucesso (três estratégias, upgrade de 0016 e instalação vazia),
seis falhas injetadas no último SQL com rollback completo (`22012`), duas
reproduções da falha original (`42703`), compatibilidade ingênua negativa e
0028 com mix preexistente (`23502`). O migrador utilizado é o oficial do Drizzle.
Os hashes/timestamps são conferidos explicitamente: o migrador sozinho não verifica
hashes das linhas antigas. Reaplicação deve preservar histórico, dados e catálogo.

O coletor independente consulta `pg_catalog` em transação read-only; inclui tipos,
defaults, nulabilidade, constraints SQL, índices, enums ordenados, funções com
corpos, triggers, sequências e políticas. Não copia snapshots. As seis execuções
devem produzir catálogo equivalente. Desabilitar um trigger mantendo seu nome
deve ser detectado. Invariantes exercitadas: produto usado/não usado, mudança de
tipo/unidade, idempotência, precisão monetária, constraint FIFO e fatos imutáveis.
Dados são exclusivamente sintéticos; isso não prova preservação de todos os casos reais.

## Inventário externo e gates

O arquivo `test/fixtures/migration-chain-shared-inventory.json` registra apenas
metadados dos dois projetos Neon e cinco branches encontrados. Todos os históricos,
catálogos e conexões read-only continuam **não comprovados**. `archived` não prova
ausência de migrations. O nome `neondb_owner` e permissão de API ADMIN não provam
um papel PostgreSQL não gravável. Não houve consulta SQL externa nem criação de role/branch.
Também falta confirmar o alvo efetivo do Worker e completar eventuais bases fora
dos projetos inventariados. Os testes locais não fecham esse gate.

`0019`: os valores financeiros semeados pelo SQL original são conferidos exatamente
em fixtures, mas sua política real ainda exige decisão explícita.
`0028`: instalação com mix vazio pode passar; mix populado deve falhar e reverter sem
inventar nomes. Política de nomes históricos e janela de escrita continuam separadas.

A substituição permanece uma preferência condicionada, e não uma aprovação. A PR
separada entrega a correção candidata e provas; a alteração do caminho ativo só
poderá ser preparada depois da comprovação externa e revisão dos gates de dados.
