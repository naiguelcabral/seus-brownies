# Preparação da ficha técnica — O01 a O04

Estado: **prévia reconciliada, não executável**, 18/10/2026.
Base: `b7da33e`, branch `feat/input-catalog-kg-purchases`.

## Conferência realizada

Consulta à original `steep-brook-51659857` / `br-lingering-wind-acwh5wap` /
`neondb`, em transação explicitamente READ ONLY. Conferidos 36 SKUs ativos,
tipos e unidades. Receita, itens, perfis, componentes, requisitos, tarifas,
movimentos e lotes continuam com zero registros. A primeira consulta usou
`type` em vez de `product_type`, foi rejeitada em leitura e foi corrigida;
não houve escrita nem aplicação parcial.

Fontes: manifesto `data/receita-base-vinculos.json` **v4**, prévia versionada
de produção e leitura atual do catálogo. A prévia antiga menciona manifesto
v3; para recheios prevalece a decisão explícita preservada no manifesto v4.
O workbook não foi reaberto/revalidado nesta preparação.

Evidências:

- `evidence/technical-catalog-preflight-2026-10-18.json`: catálogo e contagens.
- `evidence/technical-catalog-candidate-2026-10-18.json`: candidato somente
  para revisão, com hash SHA-256 do manifesto e referências de origem.

## Escopo candidato

| Cadastro | Quantidade | Fonte/regra |
| --- | ---: | --- |
| Novo insumo | 1 | `HIS-OVOS-GRANDES`, Ovos Grandes, ingrediente em unidades; sem preço/saldo inicial |
| Receita-base versionada | 1 | `RECIPE-BASE-001` |
| Linhas físicas | 7 | Açúcar 500 g; farinha 240 g; ovos 8 un; óleo massa 200 ml; chocolate 300 g; óleo untar 15 ml; papel manteiga 0,8 m |
| Requisitos operacionais | 2 | Energia 1 kWh e mão de obra 2 horas por receita |
| Tarifas | 2 | Energia R$ 0,85/kWh; trabalho R$ 12,50/h, vigência documentada 01/01/2026 |
| Perfis de referência | 17 | Rendimentos da prévia, sem criar lotes ou realizado |
| Vínculos de embalagem | 14 | Regras explícitas do manifesto, uma embalagem por brownie correspondente |
| Componentes de recheio | 12 | 20 g para 5×5 e 40 g para 7×7; decisão já registrada |

O óleo permanece em ml, o papel em m e os ovos em unidades. Compra de massa
em kg não autoriza converter essas unidades físicas em massa.

Bombom unitário e kit têm rendimentos de referência 77 e 19,25; os dois não
possuem regra explícita de embalagem no manifesto. Não inferir cobertura,
adesivo, montagem de kit ou gramagem do chocolate INS019. Os perfis são
referências candidatas, não fichas completas homologadas desses dois produtos.
Bordinhas permanece coproduto, nunca perda automática.

## O que falta antes de aplicar

1. Revalidar a fonte permitida e seus hashes, preservando os arquivos de
   ambiente e os recibos consumidos. Repetir preflight na base-alvo.
2. Gerar SQL exclusivo de cadastro técnico. O importador antigo inclui
   **17 PLAN históricos** e não deve ser executado com `--confirm` para este
   escopo. Ele também tem uma etapa separada de componentes de perfil.
3. Validar nomes/unidades/atividade por SKU; rejeitar receita/perfil/tarifa
   duplicados, hash divergente, aplicação parcial e referência já consumida.
4. Preservar custos históricos fracionários como metadados brutos de origem;
   não arredondá-los para inventar custo realizado ou saldo. Tarifa vigente
   e custo de insumo comprado são fontes distintas desses valores históricos.
5. Persistir cadastro, vínculos, recibo e auditorias na mesma transação, com
   motivo/ator/origem; conservar os 36 produtos e as evidências anteriores.
6. Ensaiar sucesso, rejeição de repetição/conflito e rollback tardio em
   PostgreSQL 17 descartável. Conferir que movimentos, compras, lotes,
   vendas, perdas e camadas FIFO continuam vazios.
7. Apresentar SQL e resultados para a autorização específica de escrita;
   backup e conferência independente precedem qualquer aplicação real.

Referência proposta `TECH-CATALOG-2026-10-18-001` **não aplicada nesta etapa**;
sua disponibilidade precisa de guard no futuro lote. Nenhuma autorização de
cadastro técnico real é inferida da aprovação anterior de migration/deploy P0.

## Próximo passo exato

Usar o candidato versionado para construir e testar o lote separado de
cadastros. Não executar o importador completo, não criar estoque e não
homologar produção com a ficha ainda ausente. Depois do cadastro aprovado,
preparar estoque rastreável e QA isolado para compra → produção → venda.
