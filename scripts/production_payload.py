#!/usr/bin/env python3
"""Extrai um payload auditável de receita, perfis e planos sem acessar o banco."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from preview_workbook import WorkbookReader, key, normalize_unit, table, text


WORKSPACE = Path(__file__).resolve().parents[1]
MANIFEST_PATH = WORKSPACE / "data" / "receita-base-vinculos.json"


def decimal(value: object) -> Decimal | None:
    try:
        result = Decimal(text(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return None
    return result if result.is_finite() else None


def number(value: object) -> str | None:
    parsed = decimal(value)
    return format(parsed.normalize(), "f") if parsed is not None else None


def digest(value: object) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def recipe_rows(rows: list[list[str]]) -> dict[str, dict[str, str]]:
    headers = {"Item_Utilizado", "Consumo_Receita", "Unidade", "Custo_Proporcional"}
    header_index = next((index for index, row in enumerate(rows) if headers.issubset(set(row))), None)
    if header_index is None:
        raise ValueError("Bloco de ficha técnica-base não encontrado.")
    row_headers = rows[header_index]
    result: dict[str, dict[str, str]] = {}
    for row in rows[header_index + 1 :]:
        record = {header: row[index] if index < len(row) else "" for index, header in enumerate(row_headers) if header}
        if not any(record.values()):
            break
        result[key(record["Item_Utilizado"])] = record
    return result


def load_manifest() -> dict[str, Any]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("version") != 4:
        raise ValueError("Manifesto de receita-base fora da versão 4.")
    return manifest


def build_payload(path: Path) -> dict[str, Any]:
    manifest = load_manifest()
    reader = WorkbookReader(path)
    products = table(
        reader.rows("02_Cadastro_Produtos"),
        {"ID_Produto", "Produto", "Tamanho", "Recheio", "Rendimento_Fornada", "Produto_Ativo"},
        "ID_Produto",
        "PROD",
    )
    inputs = table(
        reader.rows("03_Cadastro_Insumos"),
        {"ID_Insumo", "Insumo_Recurso", "Unidade", "Custo_Unitario_Calculado", "Ativo"},
        "ID_Insumo",
        "INS",
    )
    plans = table(
        reader.rows("09_Producao_Fornadas"),
        {"ID_Producao", "Data", "Produto", "Fornadas", "Rendimento_Previsto", "Qtd_Prevista", "Qtd_Real", "Perdas_Qtd", "Perdas_%", "Custo_Unitario", "Custo_Estimado", "Status", "Observacao"},
        "ID_Producao",
        "PLAN",
    )
    source_recipe = recipe_rows(reader.rows("03_Cadastro_Insumos"))
    issues: list[str] = []
    recipe = manifest["recipe"]
    inputs_by_id = {text(item["ID_Insumo"]).upper(): item for item in inputs}
    recipe_items: list[dict[str, Any]] = []
    for item in recipe["physicalItems"]:
        source = source_recipe.get(key(item["sourceName"]))
        if not source:
            issues.append(f"Ficha técnica: linha ausente para {item['sourceName']}")
            continue
        source_unit, _ = normalize_unit(source["Unidade"])
        if number(source["Consumo_Receita"]) != number(item["quantity"]) or source_unit != item["unit"]:
            issues.append(f"Ficha técnica: quantidade/unidade divergente em {item['sourceName']}")
        if number(source["Custo_Proporcional"]) != number(item["historicalCost"]):
            issues.append(f"Ficha técnica: custo histórico divergente em {item['sourceName']}")
        recipe_items.append({**item, "source": source})
    operational: list[dict[str, Any]] = []
    for requirement in recipe["operationalRequirements"]:
        source = source_recipe.get(key(requirement["sourceName"]))
        if not source:
            issues.append(f"Requisito operacional: linha ausente para {requirement['sourceName']}")
            continue
        if number(source["Consumo_Receita"]) != number(requirement["quantity"]):
            issues.append(f"Requisito operacional: quantidade divergente em {requirement['sourceName']}")
        if number(source["Custo_Proporcional"]) != number(requirement["historicalCost"]):
            issues.append(f"Requisito operacional: custo histórico divergente em {requirement['sourceName']}")
        operational.append({**requirement, "source": source})
    rates: list[dict[str, Any]] = []
    for rate in recipe["operationalRates"]:
        source = inputs_by_id.get(rate["sourceItemId"])
        if not source:
            issues.append(f"Tarifa operacional: item ausente {rate['sourceItemId']}")
            continue
        source_unit = key(source["Unidade"])
        expected_unit = "kwh" if rate["unit"] == "kWh" else "horas"
        if source_unit != expected_unit:
            issues.append(f"Tarifa operacional: unidade divergente em {rate['sourceItemId']}")
        if number(source["Custo_Unitario_Calculado"]) != number(rate["unitAmount"]):
            issues.append(f"Tarifa operacional: valor divergente em {rate['sourceItemId']}")
        payload = {**rate, "source": source}
        rates.append({
            **rate,
            "sourceKey": f"workbook:operational-rate:{rate['sourceId']}",
            "sourceHash": digest(payload),
            "source": payload,
        })
    expected_source_names = {key(item["sourceName"]) for item in recipe["physicalItems"]}
    found_physical = {name for name in source_recipe if "custo total" not in name and "energia" not in name and "mao de obra" not in name}
    extra_source = sorted(found_physical - expected_source_names)
    if extra_source:
        issues.append(f"Ficha técnica: linhas físicas sem manifesto: {', '.join(extra_source)}")

    packaging_by_product: dict[str, dict[str, str]] = {}
    for rule in manifest["individualPackagingRules"]:
        for product_id in rule["productSourceIds"]:
            if product_id in packaging_by_product:
                issues.append(f"Embalagem individual duplicada para {product_id}")
            packaging_by_product[product_id] = rule
    profile_rows: list[dict[str, Any]] = []
    product_by_name: dict[str, str] = {}
    for product in products:
        source_id = text(product["ID_Produto"]).upper()
        product_by_name[key(product["Produto"])] = source_id
        expected_yield = number(product["Rendimento_Fornada"])
        if not expected_yield:
            issues.append(f"{source_id}: rendimento esperado inválido")
        filling = text(product["Recheio"])
        profile = {
            "sourceId": f"{recipe['externalId']}:{source_id}",
            "sourceProductId": source_id,
            "sourceKey": f"workbook:production-profile:{recipe['externalId']}:{source_id}",
            "productSku": source_id,
            "productName": text(product["Produto"]),
            "cutSize": text(product["Tamanho"]) or None,
            "filling": None if key(filling) in {"", "nenhum"} else filling,
            "expectedYield": expected_yield,
            "packagingSku": packaging_by_product.get(source_id, {}).get("packagingSku"),
            "packagingQuantity": packaging_by_product.get(source_id, {}).get("quantity"),
            "source": product,
        }
        profile["sourceHash"] = digest(profile)
        profile_rows.append(profile)
    if len(profile_rows) != 17:
        issues.append(f"Perfis: esperados 17 produtos finais, encontrados {len(profile_rows)}")

    profile_by_id = {profile["sourceId"]: profile for profile in profile_rows}
    planned_batches: list[dict[str, Any]] = []
    for plan in plans:
        source_id = text(plan["ID_Producao"]).upper()
        product_id = product_by_name.get(key(plan["Produto"]))
        profile_source_id = f"{recipe['externalId']}:{product_id}" if product_id else None
        if not product_id or profile_source_id not in profile_by_id:
            issues.append(f"{source_id}: produto sem perfil exato")
            continue
        if key(plan["Status"]) != "planejado" or key(plan["Data"]) != "planejamento semanal":
            issues.append(f"{source_id}: não é um planejamento semanal válido")
        if text(plan["Qtd_Real"]) or text(plan["Perdas_Qtd"]) or text(plan["Perdas_%"]):
            issues.append(f"{source_id}: planejamento contém produção ou perda real")
        batch = {
            "sourceId": source_id,
            "sourceKey": f"workbook:production-plan:{source_id}",
            "productSku": product_id,
            "profileSourceId": profile_source_id,
            "plannedBatches": number(plan["Fornadas"]),
            "expectedYield": number(plan["Rendimento_Previsto"]),
            "plannedQuantity": number(plan["Qtd_Prevista"]),
            "historicalUnitCost": number(plan["Custo_Unitario"]),
            "historicalEstimatedCost": number(plan["Custo_Estimado"]),
            "notes": text(plan["Observacao"]) or None,
            "source": plan,
        }
        if not all(batch[field] for field in ("plannedBatches", "expectedYield", "plannedQuantity", "historicalUnitCost", "historicalEstimatedCost")):
            issues.append(f"{source_id}: campo numérico de planejamento inválido")
        batch["sourceHash"] = digest(batch)
        planned_batches.append(batch)
    if len(planned_batches) != 17:
        issues.append(f"Planejamentos: esperados 17 PLAN, encontrados {len(planned_batches)}")

    recipe_payload = {"externalId": recipe["externalId"], "name": recipe["name"], "items": recipe_items, "operational": operational}
    return {
        "issues": issues,
        "recipe": {
            "externalId": recipe["externalId"],
            "sourceKey": f"workbook:recipe:{recipe['externalId']}",
            "sourceHash": digest(recipe_payload),
            "name": recipe["name"],
            "items": recipe_items,
            "operational": operational,
            "source": recipe_payload,
        },
        "rates": rates,
        "profiles": profile_rows,
        "plans": planned_batches,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera payload de importação de produção sem acessar o banco.")
    parser.add_argument("workbook", type=Path)
    args = parser.parse_args()
    if args.workbook.suffix.lower() != ".xlsx" or not args.workbook.is_file():
        parser.error("Informe um arquivo .xlsx existente.")
    try:
        print(json.dumps(build_payload(args.workbook), ensure_ascii=False))
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Erro no payload de produção: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
