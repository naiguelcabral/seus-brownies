#!/usr/bin/env python3
"""Builds an auditable, database-free payload for profile component synchronization."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from preview_workbook import WorkbookReader, key, table, text


WORKSPACE = Path(__file__).resolve().parents[1]
MANIFEST_PATH = WORKSPACE / "data" / "receita-base-vinculos.json"
APPROVED_FILLINGS = {
    "INS013": "Brigadeiro (Recheio)",
    "INS014": "Doce de Leite (Recheio)",
    "INS015": "Leite Ninho (Recheio)",
    "INS016": "Creme de Avelã (Recheio)",
    "INS017": "Goiabada (Recheio)",
    "INS018": "Maracujá (Recheio)",
}


def number(value: object) -> str | None:
    try:
        parsed = Decimal(text(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return None
    if not parsed.is_finite():
        return None
    return format(parsed.normalize(), "f")


def digest(value: object) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_manifest() -> dict[str, Any]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest.get("version") != 4:
        raise ValueError("Manifesto de receita-base fora da versão 4.")
    return manifest


def build_payload(path: Path) -> dict[str, Any]:
    manifest = load_manifest()
    reader = WorkbookReader(path)
    product_rows = table(
        reader.rows("02_Cadastro_Produtos"),
        {"ID_Produto", "Produto", "Recheio", "Produto_Ativo"},
        "ID_Produto",
        "PROD",
    )
    input_rows = table(
        reader.rows("03_Cadastro_Insumos"),
        {"ID_Insumo", "Insumo_Recurso", "Unidade", "Ativo"},
        "ID_Insumo",
        "INS",
    )
    products = {text(row["ID_Produto"]).upper(): row for row in product_rows}
    inputs = {text(row["ID_Insumo"]).upper(): row for row in input_rows}
    recipe_id = text(manifest["recipe"]["externalId"])
    issues: list[str] = []
    components: list[dict[str, Any]] = []
    seen_source_ids: set[str] = set()
    seen_product_ids: set[str] = set()

    for component in manifest.get("profileAdditionalComponents", []):
        source_id = text(component.get("sourceId"))
        product_id = text(component.get("productSourceId")).upper()
        filling_sku = text(component.get("fillingProductSku")).upper()
        product = products.get(product_id)
        filling = inputs.get(filling_sku)
        quantity = number(component.get("quantity"))
        source = component.get("source", {})

        if not source_id or source_id in seen_source_ids:
            issues.append(f"Componente de perfil: sourceId ausente ou duplicado ({source_id or 'vazio'}).")
        seen_source_ids.add(source_id)
        if not product_id or product_id in seen_product_ids:
            issues.append(f"Componente de perfil: produto ausente ou duplicado ({product_id or 'vazio'}).")
        seen_product_ids.add(product_id)
        if not product or component.get("productSku") != product_id:
            issues.append(f"{source_id}: produto final inexistente ou SKU divergente.")
            continue
        if key(product["Recheio"]) != key(component.get("fillingSource")):
            issues.append(f"{source_id}: recheio diverge da célula de produto do workbook.")
        if (
            filling_sku not in APPROVED_FILLINGS
            or not filling
            or filling["Insumo_Recurso"] != APPROVED_FILLINGS[filling_sku]
            or key(filling["Unidade"]) != "g"
        ):
            issues.append(f"{source_id}: insumo de recheio inválido ou fora dos seis vínculos aprovados.")
        expected_quantity = "20" if product_id in {f"PROD{index:03d}" for index in range(3, 9)} else "40"
        if quantity != expected_quantity or component.get("unit") != "g":
            issues.append(f"{source_id}: quantidade/unidade diverge da decisão operacional aprovada.")
        if component.get("role") != "filling" or component.get("quantityBasis") != "per_finished_unit":
            issues.append(f"{source_id}: papel ou base de quantidade inválidos.")
        if (
            source.get("origin") != "operational_decision"
            or source.get("decisionId") != "OPDEC-PROFILE-FILLINGS-2026-001"
            or "não extraída do workbook" not in text(source.get("decision")).lower()
        ):
            issues.append(f"{source_id}: origem auditável da decisão operacional inválida.")

        source_payload = {
            "sourceId": source_id,
            "profileSourceId": f"{recipe_id}:{product_id}",
            "productSku": product_id,
            "productName": product["Produto"],
            "fillingProductSku": filling_sku,
            "fillingProductName": APPROVED_FILLINGS.get(filling_sku),
            "role": component.get("role"),
            "quantity": quantity,
            "unit": component.get("unit"),
            "quantityBasis": component.get("quantityBasis"),
            "source": source,
        }
        components.append({
            **source_payload,
            "sourceHash": digest(source_payload),
        })

    expected_profiles = {f"PROD{index:03d}" for index in range(3, 15)}
    if seen_product_ids != expected_profiles or len(components) != 12:
        issues.append("São exigidos exatamente 12 componentes: PROD003 a PROD014, um por perfil recheado.")
    return {"issues": issues, "components": components}


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida componentes de perfil sem acessar o banco.")
    parser.add_argument("workbook", type=Path)
    args = parser.parse_args()
    if args.workbook.suffix.lower() != ".xlsx" or not args.workbook.is_file():
        parser.error("Informe um arquivo .xlsx existente.")
    try:
        print(json.dumps(build_payload(args.workbook), ensure_ascii=False))
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Erro no payload de componentes de perfil: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
