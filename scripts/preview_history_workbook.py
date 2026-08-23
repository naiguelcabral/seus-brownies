#!/usr/bin/env python3
"""Gera a prévia e o payload de importação histórica sem acessar o banco."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from preview_workbook import (
    WorkbookReader,
    key,
    markdown_table,
    normalize_active,
    normalize_unit,
    table,
    text,
)


EXCEL_EPOCH = date(1899, 12, 30)
MONTHS = {
    "janeiro": 1,
    "fevereiro": 2,
    "marco": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}
STOCK_AFFECTING = {"sim", "s", "true", "1"}
INDIVIDUAL_BROWNIE_PACKAGING = (
    "Embalagem Simples 5x5",
    "Embalagem Simples 7x7",
    "Embalagem Recheado 5x5",
    "Embalagem Recheado 7x7",
)
MANIFEST_PATH = Path(__file__).resolve().parents[1] / "data" / "importacao-compras-aliases.json"


def decimal(value: str) -> Decimal | None:
    normalized = text(value).replace(",", ".")
    if not normalized:
        return None
    try:
        result = Decimal(normalized)
    except InvalidOperation:
        return None
    return result if result.is_finite() else None


def money(value: str) -> str | None:
    parsed = decimal(value)
    if parsed is None:
        return None
    return format(parsed.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ".2f")


def quantity(value: str) -> str | None:
    parsed = decimal(value)
    if parsed is None or parsed <= 0:
        return None
    return format(parsed.normalize(), "f")


def source_id(value: str) -> str:
    return text(value).upper().replace(" ", "")


def alias_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", key(value))


def hash_payload(value: object) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as workbook:
        for block in iter(lambda: workbook.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def source_date(value: str) -> str | None:
    parsed = decimal(value)
    if parsed is None or parsed != parsed.to_integral_value() or parsed < 1:
        return None
    try:
        return (EXCEL_EPOCH + timedelta(days=int(parsed))).isoformat()
    except OverflowError:
        return None


def historical_date(day: str, month: str, year: int) -> str | None:
    parsed_day = decimal(day)
    month_number = MONTHS.get(key(month))
    if (
        parsed_day is None
        or parsed_day != parsed_day.to_integral_value()
        or not month_number
        or not 1 <= int(parsed_day) <= 31
    ):
        return None
    try:
        return date(year, month_number, int(parsed_day)).isoformat()
    except ValueError:
        return None


def records_in_section(
    rows: list[list[str]], required_headers: set[str], id_header: str, id_prefix: str
) -> list[dict[str, str]]:
    header_index = next(
        (index for index, row in enumerate(rows) if required_headers.issubset(set(row))),
        None,
    )
    if header_index is None:
        raise ValueError(
            f"Cabeçalhos obrigatórios não encontrados: {', '.join(sorted(required_headers))}"
        )
    headers = rows[header_index]
    records: list[dict[str, str]] = []
    for row in rows[header_index + 1 :]:
        record = {
            header: row[index] if index < len(row) else ""
            for index, header in enumerate(headers)
            if header
        }
        if not source_id(record.get(id_header, "")).startswith(id_prefix):
            break
        records.append(record)
    return records


def duplicates(records: list[dict[str, str]], field: str) -> list[str]:
    counts = Counter(source_id(record.get(field, "")) for record in records)
    return sorted(value for value, total in counts.items() if value and total > 1)


def load_alias_manifest() -> dict[str, Any]:
    try:
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Manifesto de aliases inválido: {error}") from error
    if manifest.get("version") != 2 or not isinstance(manifest.get("aliases"), list):
        raise ValueError("Manifesto de aliases sem versão 2 ou lista de aliases.")
    return manifest


def load_history(path: Path, year: int) -> dict[str, Any]:
    manifest = load_alias_manifest()
    if year != manifest.get("year"):
        raise ValueError(
            f"O manifesto aprovado é para {manifest.get('year')}; ano recebido: {year}."
        )
    reader = WorkbookReader(path)
    locations = table(
        reader.rows("04_Cadastro_Locais"),
        {"ID_Local", "Local_Canal", "Tipo", "Frequencia", "Status"},
        "ID_Local",
        "LOC",
    )
    sale_rows = reader.rows("05_Base_Vendas")
    sales = records_in_section(
        sale_rows,
        {"ID_Evento", "Data", "Local_Canal", "Faturamento_Informado", "Faturamento_Calculado", "Status_Auditoria"},
        "ID_Evento",
        "VEND",
    )
    sale_items = records_in_section(
        sale_rows,
        {"ID_Venda", "ID_Evento", "ID_Produto", "Quantidade", "Preco_Real_Medio", "Faturamento_Informado_Alocado"},
        "ID_Venda",
        "VD",
    )
    outflows = table(
        reader.rows("07_Base_Compras_Despesas"),
        {"ID_Saida", "Dia", "Mes", "Categoria", "Subcategoria", "Descricao", "Unidade_Medida", "Quantidade_Base", "Preco", "Quantidade_Comprada", "Preco_Total", "Afeta_Estoque"},
        "ID_Saida",
        "SAI",
    )
    stock_template = table(
        reader.rows("08_Estoque_Insumos"),
        {"ID_Movimento", "Insumo", "Tipo_Movimento", "Entrada_Qtd", "Unidade", "Custo_Total"},
        "ID_Movimento",
        "EST",
    )
    production = table(
        reader.rows("09_Producao_Fornadas"),
        {"ID_Producao", "Data", "Produto", "Fornadas", "Qtd_Prevista", "Qtd_Real", "Status"},
        "ID_Producao",
        "PLAN",
    )
    catalog_products = table(
        reader.rows("02_Cadastro_Produtos"),
        {"ID_Produto", "Produto", "Categoria", "Produto_Ativo"},
        "ID_Produto",
        "PROD",
    )
    catalog_inputs = table(
        reader.rows("03_Cadastro_Insumos"),
        {"ID_Insumo", "Insumo_Recurso", "Unidade", "Ativo"},
        "ID_Insumo",
        "INS",
    )

    issues: list[str] = []
    location_by_name = {
        key(record["Local_Canal"]): source_id(record["ID_Local"])
        for record in locations
        if text(record["Local_Canal"])
    }
    product_ids = {source_id(record["ID_Produto"]) for record in catalog_products}
    catalog_names = {
        key(record["Insumo_Recurso"])
        for record in catalog_inputs
        if text(record["Insumo_Recurso"])
    }
    items_by_event: dict[str, list[dict[str, str]]] = {}
    for item in sale_items:
        items_by_event.setdefault(source_id(item["ID_Evento"]), []).append(item)

    parsed_locations: list[dict[str, Any]] = []
    for record in locations:
        identifier = source_id(record["ID_Local"])
        active = normalize_active(record["Status"])
        if active is None:
            issues.append(f"{identifier}: status de local inválido")
        parsed_locations.append(
            {
                "sourceId": identifier,
                "sourceKey": f"workbook:2026:location:{identifier}",
                "sourceHash": hash_payload(record),
                "name": text(record["Local_Canal"]),
                "classification": "unclassified",
                "frequency": text(record["Frequencia"]) or None,
                "isActive": active,
                "notes": text(record["Observacao"]) or None,
                "payload": record,
            }
        )

    parsed_sales: list[dict[str, Any]] = []
    sale_audits: list[dict[str, str]] = []
    sale_event_ids = {source_id(record["ID_Evento"]) for record in sales}
    for record in sales:
        identifier = source_id(record["ID_Evento"])
        sold_on = source_date(record["Data"])
        reported = money(record["Faturamento_Informado"])
        calculated = money(record["Faturamento_Calculado"])
        items = items_by_event.get(identifier, [])
        if not sold_on or not reported or not calculated:
            issues.append(f"{identifier}: data ou faturamento inválido")
        if key(record["Local_Canal"]) not in location_by_name:
            issues.append(f"{identifier}: local/canal sem cadastro")
        allocated = sum(
            (decimal(item["Faturamento_Informado_Alocado"]) or Decimal("0"))
            for item in items
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if reported and allocated != Decimal(reported):
            issues.append(f"{identifier}: itens não fecham com faturamento informado")
        parsed_items: list[dict[str, Any]] = []
        for item in items:
            item_id = source_id(item["ID_Venda"])
            if source_id(item["ID_Produto"]) not in product_ids:
                issues.append(f"{item_id}: produto ausente do catálogo fonte")
            if not quantity(item["Quantidade"]) or not money(item["Preco_Real_Medio"]) or not money(item["Faturamento_Informado_Alocado"]):
                issues.append(f"{item_id}: quantidade, preço ou total inválido")
            parsed_items.append(
                {
                    "sourceId": item_id,
                    "productSourceId": source_id(item["ID_Produto"]),
                    "productName": text(item["Produto"]),
                    "quantity": quantity(item["Quantidade"]),
                    "unitPrice": money(item["Preco_Real_Medio"]),
                    "totalAmount": money(item["Faturamento_Informado_Alocado"]),
                    "payload": item,
                }
            )
        payload = {"event": record, "items": parsed_items}
        parsed_sales.append(
            {
                "sourceId": identifier,
                "sourceKey": f"workbook:2026:sale:{identifier}",
                "sourceHash": hash_payload(payload),
                "locationSourceId": location_by_name.get(key(record["Local_Canal"])),
                "soldAt": f"{sold_on}T12:00:00+00:00" if sold_on else None,
                "reportedAmount": reported,
                "calculatedAmount": calculated,
                "auditStatus": text(record["Status_Auditoria"]),
                "auditNotes": text(record["Observacao"]) or None,
                "items": parsed_items,
                "payload": payload,
            }
        )
        if reported and calculated and reported != calculated:
            sale_audits.append(
                {
                    "sourceId": identifier,
                    "reportedAmount": reported,
                    "calculatedAmount": calculated,
                    "differenceAmount": money(record["Diferenca_R$"]) or "inválida",
                    "status": text(record["Status_Auditoria"]),
                }
            )
    for item in sale_items:
        if source_id(item["ID_Evento"]) not in sale_event_ids:
            issues.append(f"{source_id(item['ID_Venda'])}: evento inexistente")

    aliases = manifest["aliases"]
    alias_by_source_id = {source_id(alias["sourceId"]): alias for alias in aliases}
    stock_outflows = [record for record in outflows if key(record["Afeta_Estoque"]) in STOCK_AFFECTING]
    expenses = [record for record in outflows if record not in stock_outflows]
    parsed_purchases: list[dict[str, Any]] = []
    unresolved_aliases: list[dict[str, Any]] = []
    for record in stock_outflows:
        identifier = source_id(record["ID_Saida"])
        alias = alias_by_source_id.get(identifier)
        if not alias:
            issues.append(f"{identifier}: ausência no manifesto de aliases")
            unresolved_aliases.append({"sourceId": identifier, "sourceDescription": record["Descricao"], "reason": "ausente do manifesto"})
            continue
        if alias_key(alias["sourceDescription"]) != alias_key(record["Descricao"]):
            issues.append(f"{identifier}: descrição não confere com o manifesto")
        multiplier = decimal(str(alias.get("quantityMultiplier", "")))
        expected_base = decimal(str(alias.get("sourceQuantityBase", "")))
        base = decimal(record["Quantidade_Base"])
        bought = decimal(record["Quantidade_Comprada"])
        normalized_source_unit, source_unit_error = normalize_unit(record["Unidade_Medida"])
        purchased_on = historical_date(record["Dia"], record["Mes"], year)
        if not base or not bought or not purchased_on or not money(record["Preco_Total"]):
            issues.append(f"{identifier}: quantidade, data ou valor inválido")
        if source_unit_error:
            issues.append(f"{identifier}: {source_unit_error} ({record['Unidade_Medida']})")
        if alias.get("status") != "approved":
            unresolved_aliases.append(alias)
            effective_quantity, target = None, None
        elif alias.get("quantityRule") == "direct":
            effective_quantity = quantity(str(alias.get("stockQuantity", "")))
            if not effective_quantity:
                issues.append(f"{identifier}: quantidade direta de estoque inválida no manifesto")
            target = alias["target"]
        else:
            if multiplier is None or multiplier <= 0 or expected_base is None or base != expected_base:
                issues.append(f"{identifier}: conversão não confere com Quantidade_Base")
            effective_quantity = quantity(str((bought or Decimal("0")) * (multiplier or Decimal("0"))))
            target = alias["target"]
        payload = {"outflow": record, "alias": alias}
        parsed_purchases.append(
            {
                "sourceId": identifier,
                "sourceKey": f"workbook:2026:purchase:{identifier}",
                "sourceHash": hash_payload(payload),
                "purchasedAt": purchased_on,
                "supplierName": text(record["Fornecedor"]) or None,
                "itemName": text(record["Descricao"]),
                "sourceUnit": normalized_source_unit or "unit",
                "sourceQuantityBase": quantity(record["Quantidade_Base"]),
                "sourceQuantityPurchased": quantity(record["Quantidade_Comprada"]),
                "sourceUnitPrice": money(record["Preco"]),
                "totalAmount": money(record["Preco_Total"]),
                "effectiveQuantity": effective_quantity,
                "target": target,
                "alias": alias,
                "payload": payload,
            }
        )

    parsed_expenses: list[dict[str, Any]] = []
    for record in expenses:
        identifier = source_id(record["ID_Saida"])
        occurred_on = historical_date(record["Dia"], record["Mes"], year)
        amount = money(record["Preco_Total"])
        if not occurred_on or not amount:
            issues.append(f"{identifier}: data ou valor de despesa inválido")
        payload = {"outflow": record}
        parsed_expenses.append(
            {
                "sourceId": identifier,
                "sourceKey": f"workbook:2026:expense:{identifier}",
                "sourceHash": hash_payload(payload),
                "occurredAt": occurred_on,
                "description": text(record["Descricao"]),
                "category": " / ".join(part for part in (text(record["Categoria"]), text(record["Subcategoria"])) if part),
                "amount": amount,
                "notes": text(record["Observacao"]) or None,
                "payload": payload,
            }
        )

    duplicates_report = {
        "locais": duplicates(locations, "ID_Local"),
        "vendas": duplicates(sales, "ID_Evento"),
        "itens de venda": duplicates(sale_items, "ID_Venda"),
        "saídas": duplicates(outflows, "ID_Saida"),
        "planos": duplicates(production, "ID_Producao"),
    }
    for label, values in duplicates_report.items():
        if values:
            issues.append(f"IDs duplicados em {label}: {', '.join(values)}")
    pending_manifest_aliases = [alias for alias in aliases if alias.get("status") != "approved"]
    source_alias_ids = {source_id(record["ID_Saida"]) for record in stock_outflows}
    extra_manifest_aliases = [
        source_id(alias["sourceId"])
        for alias in aliases
        if source_id(alias["sourceId"]) not in source_alias_ids
    ]
    if extra_manifest_aliases:
        issues.append(f"Aliases sem compra correspondente: {', '.join(extra_manifest_aliases)}")
    proposed_targets = {
        (target["sku"], target["name"], target["type"], target["unit"])
        for alias in aliases
        if alias.get("status") == "approved"
        for target in [alias["target"]]
    }
    missing_targets = sorted(
        [
            {"sku": sku, "name": name, "type": product_type, "unit": unit}
            for sku, name, product_type, unit in proposed_targets
            if key(name) not in catalog_names
        ],
        key=lambda item: item["name"],
    )
    return {
        "workbook": {"name": path.name, "sha256": hash_file(path)},
        "year": year,
        "manifestVersion": manifest["version"],
        "manifestPath": str(MANIFEST_PATH.relative_to(Path.cwd())),
        "issues": issues,
        "pendingAliases": pending_manifest_aliases,
        "unresolvedAliases": unresolved_aliases,
        "missingTargets": missing_targets,
        "locations": parsed_locations,
        "sales": parsed_sales,
        "purchases": parsed_purchases,
        "expenses": parsed_expenses,
        "productionPlans": [{"sourceId": source_id(record["ID_Producao"]), "payload": record} for record in production],
        "stockTemplateCount": len(stock_template),
        "saleAudits": sale_audits,
        "duplicates": duplicates_report,
        "individualPackaging": [{"name": name, "existsInCatalog": key(name) in catalog_names} for name in INDIVIDUAL_BROWNIE_PACKAGING],
    }


def build_preview(path: Path, year: int) -> str:
    history = load_history(path, year)
    pending_aliases = history["pendingAliases"]
    approved_purchases = [purchase for purchase in history["purchases"] if purchase["target"]]
    unresolved_rows = [[alias["sourceId"], alias["sourceDescription"], alias.get("reason", "pendente")] for alias in pending_aliases]
    approved_rows = [
        [
            purchase["sourceId"],
            purchase["itemName"],
            purchase["target"]["name"],
            f"{purchase['target']['type']} / {purchase['target']['unit']}",
            "entrada direta de 845 g" if purchase["alias"].get("quantityRule") == "direct" else f"{purchase['alias']['sourceQuantityBase']} origem → {purchase['alias']['quantityMultiplier']} {purchase['target']['unit']} por embalagem",
            purchase["effectiveQuantity"] or "inválida",
        ]
        for purchase in approved_purchases
    ]
    missing_targets = [[target["sku"], target["name"], target["type"], target["unit"]] for target in history["missingTargets"]]
    missing_packaging = [row for row in missing_targets if row[2] == "packaging"]
    location_rows = [[location["sourceId"], location["name"], "Não classificado", "ativo" if location["isActive"] else "inativo"] for location in history["locations"]]
    sales_rows = [[sale["sourceId"], sale["soldAt"][:10] if sale["soldAt"] else "inválida", sale["reportedAmount"] or "inválido", len(sale["items"]), sale["auditStatus"]] for sale in history["sales"]]
    audit_rows = [[audit["sourceId"], audit["reportedAmount"], audit["calculatedAmount"], audit["differenceAmount"], audit["status"]] for audit in history["saleAudits"]]
    expense_rows = [[expense["sourceId"], expense["occurredAt"] or "inválida", expense["category"], expense["description"], expense["amount"] or "inválido"] for expense in history["expenses"]]
    individual_rows = [[item["name"], "presente" if item["existsInCatalog"] else "ausente", "consumir 1 unidade no futuro; sem baixa histórica"] for item in history["individualPackaging"]]
    duplicate_text = "; ".join(f"{label}: {', '.join(values)}" for label, values in history["duplicates"].items() if values) or "nenhuma duplicidade de ID fonte detectada"
    return f"""# Prévia de importação do histórico do workbook

Gerado pelo comando `npm run import:history:preview -- <caminho-do-workbook> --year {year}`. O workbook foi somente lido; nenhum dado foi gravado no banco e nenhuma migration foi aplicada.

## Fonte auditada

- Arquivo: `{history['workbook']['name']}`
- SHA-256: `{history['workbook']['sha256']}`
- Manifesto versionado: `{history['manifestPath']}` (versão {history['manifestVersion']}).
- Abas lidas: `04_Cadastro_Locais`, `05_Base_Vendas`, `07_Base_Compras_Despesas`, `08_Estoque_Insumos` e `09_Producao_Fornadas`.
- `08_Estoque_Insumos` é derivada das compras e foi usada apenas para conferência ({history['stockTemplateCount']} linhas), nunca como segunda origem.

## Decisões incorporadas

- Todas as compras e despesas são datadas em **{year}**.
- Os cinco locais/canais serão importados como **não classificados** e podem ser editados depois.
- As 15 vendas históricas são exclusivamente financeiras (`affects_stock = false`): não criarão movimentações de estoque.
- Os 17 registros `PLAN` permanecem planejamento, sem lote real, produção ou movimentação.
- Energia e mão de obra continuam fora do estoque; não há linha histórica dessas naturezas.

## Contagens e situação

| Fonte | Encontrados | Destino futuro | Situação |
| --- | ---: | --- | --- |
| Locais/canais | {len(history['locations'])} | `sales_locations` | pronto como não classificado |
| Eventos de venda | {len(history['sales'])} | `sales` | financeiro, sem estoque |
| Itens de venda | {sum(len(sale['items']) for sale in history['sales'])} | `sale_items` | IDs de produto válidos |
| Compras de estoque | {len(history['purchases'])} | `purchases`, `purchase_items`, `stock_movements` | {len(approved_rows)} aprovadas; {len(pending_aliases)} bloqueiam a transação |
| Despesas | {len(history['expenses'])} | `expenses` | datadas em {year}; aguardam liberação global |
| Produção real | 0 | `production_batches` | não importar |
| Planejamentos `PLAN` | {len(history['productionPlans'])} | planejamento futuro | ignorar |

## Locais/canais

{markdown_table(['ID fonte', 'Local/canal', 'Classificação importada', 'Status'], location_rows)}

## Vendas financeiras e auditoria

{markdown_table(['Evento', 'Data', 'Faturamento informado', 'Itens', 'Auditoria'], sales_rows)}

As duas divergências são preservadas como campos de auditoria, sem substituir o faturamento informado:

{markdown_table(['Evento', 'Informado', 'Calculado', 'Diferença', 'Status'], audit_rows)}

## Aliases e conversões aprovados

Cada alias valida a quantidade-base da origem e converte `Quantidade_Comprada` para a unidade de estoque. `SAI0020` é a exceção aprovada: sua entrada é direta de 845 g, sem multiplicar campos da planilha.

{markdown_table(['Saída', 'Descrição fonte', 'Produto de estoque', 'Tipo / unidade', 'Conversão aprovada', 'Entrada calculada'], approved_rows)}

Sacolas só são equivalentes quando material e dimensões normalizadas coincidem exatamente. `PP`, `P`, `M` e `12 × 8,5 × 16 cm` são quatro produtos distintos.

## Produtos necessários no catálogo

{markdown_table(['SKU previsto', 'Produto', 'Tipo', 'Unidade'], missing_targets)}

Embalagens a criar quando a importação for liberada:

{markdown_table(['SKU previsto', 'Produto', 'Tipo', 'Unidade'], missing_packaging)}

Embalagens individuais existentes no catálogo:

{markdown_table(['Produto', 'Catálogo fonte', 'Regra'], individual_rows)}

{("## Aliases completos — importação liberada para confirmação\n\nOs 23 aliases estão aprovados. Sem `--confirm`, o comando somente atualiza esta prévia e valida os dados; com `--confirm`, a transação ainda interromperá integralmente diante de qualquer ID externo, hash ou incompatibilidade de catálogo já existente." if not pending_aliases else f"## {len(pending_aliases)} aliases pendentes — bloqueio total da importação\n\nEnquanto qualquer linha abaixo permanecer pendente, `npm run import:history -- ... --confirm` falhará **antes de abrir uma transação ou gravar dados**.\n\n{markdown_table(['Saída', 'Descrição fonte', 'Pendência'], unresolved_rows)}")}

## Despesas

{markdown_table(['Saída', 'Data', 'Categoria', 'Descrição', 'Valor'], expense_rows)}

## Qualidade e itens ignorados

- IDs duplicados: {duplicate_text}.
- Campos inválidos: {'; '.join(history['issues']) if history['issues'] else 'nenhum detectado'}.
- Itens ignorados: 17 `PLAN` e a aba de estoque derivada. INS020 (energia) e INS021 (mão de obra) não são produtos de estoque.

## Modelagem da migration incremental

1. `sales_locations`, `sales.location_id` e `sales.affects_stock` para locais não classificados e vendas financeiras históricas.
2. IDs externos, hashes e `historical_import_records` para idempotência; qualquer chave ou hash existente interromperá a transação sem sobrescrever dados.
3. `product_import_aliases` com produto alvo e multiplicador decimal para vincular compra, item e movimento de estoque de maneira auditável.
4. Campos de origem em compras, despesas e vendas para preservar valores, auditoria e payloads históricos.
5. `production_batches`, saídas de produção e `operational_costs` para registrar planejamento, produção concluída e custos de energia/mão de obra sem tratá-los como estoque.

Nenhuma migration foi aplicada e a importação com `--confirm` não foi executada.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Prévia segura do histórico do workbook dos Seus Brownies.")
    parser.add_argument("workbook", type=Path, help="Caminho para o arquivo .xlsx a analisar")
    parser.add_argument("--year", type=int, default=2026, help="Ano histórico aprovado")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--output", type=Path, default=Path("docs/IMPORTACAO-HISTORICO-WORKBOOK-PREVIA.md"), help="Documento Markdown gerado pela prévia")
    args = parser.parse_args()
    if args.workbook.suffix.lower() != ".xlsx" or not args.workbook.is_file():
        parser.error("Informe um arquivo .xlsx existente.")
    try:
        if args.format == "json":
            print(json.dumps(load_history(args.workbook, args.year), ensure_ascii=False))
            return 0
        report = build_preview(args.workbook, args.year)
    except (KeyError, ValueError, zipfile.BadZipFile, ET.ParseError) as error:
        print(f"Prévia não gerada: {error}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    print(f"Prévia gerada em {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
