# Decisão humana — migration 0019

Estado: `pending-human`. Responsável pela decisão: Dono; operador técnico e
revisor financeiro: `PENDING-HUMAN`. Nenhum valor é escolhido nesta tarefa.
O SQL publicado é imutável; qualquer mudança depende do desenho corretivo
aprovado depois do inventário global e da preservação das evidências.

## Fatos do SQL e decisões necessárias

`0019_short_ulik.sql` cria `management_settings` e insere singleton id=1,
versão=1. Os números abaixo são **observação do SQL, não aprovação**:

| Campo                      | Literal publicado | Precisão versionada | Valor exato aprovado / fonte / vigência |
| -------------------------- | ----------------- | ------------------- | --------------------------------------- |
| monthly_profit_goal        | 10000.00          | numeric(12,2)       | `PENDING-HUMAN`                         |
| fixed_monthly_costs        | 2200.00           | numeric(12,2)       | `PENDING-HUMAN`                         |
| sales_days_per_month       | 20                | integer             | `PENDING-HUMAN`                         |
| weeks_per_month            | 4.00              | numeric(5,2)        | `PENDING-HUMAN`                         |
| normal_revenue_tolerance   | 0.0300            | numeric(6,4)        | `PENDING-HUMAN`                         |
| critical_revenue_tolerance | 0.0800            | numeric(6,4)        | `PENDING-HUMAN`                         |
| minimum_product_margin     | 0.7000            | numeric(6,4)        | `PENDING-HUMAN`                         |
| fee_tax_reserve_rate       | 0.0000            | numeric(6,4)        | `PENDING-HUMAN`                         |

Todos esses campos são NOT NULL; não inserir zero para representar desconhecido.
O SQL também adiciona `sale_items.reported_amount` numeric(12,2) anulável e
`sales.adjustment_kind` NOT NULL default `none`, enum none/discount/combo/gift/
manual_adjustment; motivo anulável. Default `none` não reconstrói a natureza
real de ajustes antigos. O INSERT não tem ON CONFLICT: reaplicação fora do
migrador não é idempotente. O migrador não valida sozinho hashes históricos.

## Opções e efeitos

| Opção                                               | Efeito                                                       | Condição                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Aceitar os valores publicados para uso prospectivo  | configura novos cálculos; preserva fatos passados            | todos os números, fontes, unidade e início explicitamente aprovados                                   |
| Escolher outros valores oficialmente aprovados      | requer desenho corretivo auditável; não editar SQL publicado | decisão com números exatos, fonte e vigência; não executar atualização aqui                           |
| Revisar histórico com plano separado                | risco de relatórios distintos e períodos fechados            | backfill/fatos compensatórios aprovados por registro, idempotência e reconciliação                    |
| Manter configuração desconhecida e bloquear recurso | evita fabricar números; código pode exigir campos NOT NULL   | projeto futuro de configuração ausente/nullable ou fluxo de aprovação; sem schema change nesta tarefa |

Recomendação técnica: preferir vigência explícita e efeito prospectivo,
preservar fatos originais, versionar parâmetros e testar reconciliação de
competência/caixa. Isso é recomendação, não aceite do Dono. Regras já aprovadas
em HUMAN-APPROVALS.md (competência na entrega, caixa separado, créditos e
reversões auditados, margem como alerta) não aprovam automaticamente estes
parâmetros nem aplicação retroativa.

## Formulário obrigatório

- Valores exatos de **todos** os campos, unidade monetária (não presumir BRL),
  escala, arredondamento e unidade das taxas (fração/%/bps): `PENDING-HUMAN`.
- Fonte oficial versionada, hash/ID e responsável pela fonte: `PENDING-HUMAN`.
- Vigência/data, timezone, versão e término/substituição: `PENDING-HUMAN`.
- Escopo prospectivo versus histórico por campo e período: `PENDING-HUMAN`.
- Tratamento de registros anteriores, `reported_amount` nulo e `none` default:
  `PENDING-HUMAN`.
- Competência versus caixa, créditos emitidos/resgatados, reversões, correções
  e períodos fechados: confirmar preservação das regras canônicas e detalhar
  impacto dos parâmetros: `PENDING-HUMAN`.
- Idempotência, chave/referência de decisão, conflitos com singleton existente
  e tratamento de reaplicação: `PENDING-HUMAN`.
- Valores ausentes/nulos: bloquear configuração ou desenhar mudança futura;
  não substituir por número inventado: `PENDING-HUMAN`.
- Contagens de settings/vendas/itens e evidência de histórico relevante,
  sem linhas de negócio públicas: `PENDING-HUMAN`.
- Plano de auditoria da aprovação, retenção, revisor e evidência de testes:
  `PENDING-HUMAN`.
- Dono aprovador, UTC, motivo, versão exata e **aceite explícito**: `PENDING-HUMAN`.

## Gate

Só `verified` com valores exatos, fonte, unidade/precisão, vigência, escopo
histórico, responsável e aceite explícito. Decisão incompleta permanece
`pending-human`; implementação/aplicação/backfill exigem autorização separada.
