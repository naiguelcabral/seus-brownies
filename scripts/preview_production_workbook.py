#!/usr/bin/env python3
"""Gera uma prévia somente leitura de fichas técnicas e produção do workbook."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from preview_workbook import WorkbookReader, key, markdown_table, normalize_unit, table, text


WORKSPACE = Path(__file__).resolve().parents[1]
ALIAS_MANIFEST = WORKSPACE / "data" / "importacao-compras-aliases.json"
RECIPE_MANIFEST = WORKSPACE / "data" / "receita-base-vinculos.json"
OUTPUT = Path("docs/IMPORTACAO-PRODUCAO-WORKBOOK-PREVIA.md")
OPERATIONAL_IDS = {"INS020": "energy", "INS021": "labor"}
INDIVIDUAL_PACKAGING = {
    "PROD003": "INS009",
    "PROD004": "INS009",
    "PROD005": "INS009",
    "PROD006": "INS009",
    "PROD007": "INS009",
    "PROD008": "INS009",
    "PROD009": "INS010",
    "PROD010": "INS010",
    "PROD011": "INS010",
    "PROD012": "INS010",
    "PROD013": "INS010",
    "PROD014": "INS010",
    "PROD015": "INS007",
    "PROD016": "INS008",
}
PACKAGING_IDS = {"INS005", "INS006", "INS007", "INS008", "INS009", "INS010", "INS011", "INS012"}


def decimal(value: object) -> Decimal | None:
    normalized = text(value).replace(",", ".")
    if not normalized:
        return None
    try:
        result = Decimal(normalized)
    except InvalidOperation:
        return None
    return result if result.is_finite() else None


def display_decimal(value: Decimal | None, places: str = "0.###") -> str:
    if value is None:
        return "inválido"
    if places == "0.00":
        return format(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), ".2f")
    return format(value.normalize(), "f")


def materially_different(left: Decimal, right: Decimal) -> bool:
    """Ignores only floating-point residue already persisted by the source workbook."""
    return abs(left - right) > Decimal("0.000001")


def hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as workbook:
        for block in iter(lambda: workbook.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def records_from_header(rows: list[list[str]], headers: set[str]) -> list[dict[str, str]]:
    header_index = next((index for index, row in enumerate(rows) if headers.issubset(set(row))), None)
    if header_index is None:
        raise ValueError(f"Cabeçalhos obrigatórios não encontrados: {', '.join(sorted(headers))}")
    row_headers = rows[header_index]
    records: list[dict[str, str]] = []
    for row in rows[header_index + 1 :]:
        values = {
            header: row[index] if index < len(row) else ""
            for index, header in enumerate(row_headers)
            if header
        }
        if not any(values.values()):
            break
        records.append(values)
    return records


def duplicates(values: list[str]) -> list[str]:
    return sorted(item for item, count in Counter(values).items() if item and count > 1)


def load_aliases() -> list[dict[str, Any]]:
    manifest = json.loads(ALIAS_MANIFEST.read_text(encoding="utf-8"))
    aliases = manifest.get("aliases")
    if manifest.get("version") != 2 or not isinstance(aliases, list):
        raise ValueError("Manifesto de aliases de compra inválido ou fora da revisão 2.")
    return aliases


def load_recipe_manifest() -> dict[str, Any]:
    manifest = json.loads(RECIPE_MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("version") != 4:
        raise ValueError("Manifesto de vínculos técnicos da receita-base inválido.")
    return manifest


def source_rows_by_id(rows: list[tuple[int, list[str]]], id_header: str, id_prefix: str) -> dict[str, int]:
    """Returns the workbook row number for auditable source-cell references."""
    header_index = next((index for index, (_, row) in enumerate(rows) if id_header in row), None)
    if header_index is None:
        raise ValueError(f"Cabeçalho de origem não encontrado: {id_header}")
    id_column = rows[header_index][1].index(id_header)
    result: dict[str, int] = {}
    for row_number, row in rows[header_index + 1 :]:
        identifier = text(row[id_column] if id_column < len(row) else "").upper()
        if not identifier or not identifier.startswith(id_prefix):
            break
        result[identifier] = row_number
    return result


def build_preview(path: Path) -> str:
    reader = WorkbookReader(path)
    product_numbered_rows = reader.numbered_rows("02_Cadastro_Produtos")
    input_numbered_rows = reader.numbered_rows("03_Cadastro_Insumos")
    product_sheet_rows = [row for _, row in product_numbered_rows]
    input_sheet_rows = [row for _, row in input_numbered_rows]
    product_source = table(
        product_sheet_rows,
        {"ID_Produto", "Produto", "Rendimento_Fornada", "Custo_Total_s_MO", "Custo_Total_c_MO", "Produto_Ativo"},
        "ID_Produto",
        "PROD",
    )
    input_source = table(
        input_sheet_rows,
        {"ID_Insumo", "Insumo_Recurso", "Quantidade_Embalagem", "Unidade", "Custo_Unitario_Calculado", "Ativo"},
        "ID_Insumo",
        "INS",
    )
    recipe_source = records_from_header(
        reader.rows("03_Cadastro_Insumos"),
        {"Item_Utilizado", "Consumo_Receita", "Unidade", "Custo_Proporcional"},
    )
    plan_numbered_rows = reader.numbered_rows("09_Producao_Fornadas")
    plan_sheet_rows = [row for _, row in plan_numbered_rows]
    plan_source = table(
        plan_sheet_rows,
        {"ID_Producao", "Data", "Produto", "Fornadas", "Rendimento_Previsto", "Qtd_Prevista", "Qtd_Real", "Perdas_Qtd", "Perdas_%", "Custo_Unitario", "Custo_Estimado", "Status"},
        "ID_Producao",
        "PLAN",
    )
    parameter_rows = reader.rows("01_Parametros")
    parameters = {text(row[0]): text(row[1]) for row in parameter_rows if len(row) > 1 and text(row[0])}
    aliases = load_aliases()
    recipe_manifest = load_recipe_manifest()
    approved_rates = recipe_manifest["recipe"].get("operationalRates", [])
    technical_targets = {
        key(item["sourceName"]): item
        for item in recipe_manifest["recipe"]["physicalItems"]
    }

    issues: list[str] = []
    historical_cost_notes: list[str] = []
    decisions: list[str] = []
    products_by_id = {text(row["ID_Produto"]).upper(): row for row in product_source}
    products_by_name = {key(row["Produto"]): text(row["ID_Produto"]).upper() for row in product_source}
    inputs_by_id = {text(row["ID_Insumo"]).upper(): row for row in input_source}
    inputs_by_name = {key(row["Insumo_Recurso"]): text(row["ID_Insumo"]).upper() for row in input_source}
    product_source_rows = source_rows_by_id(product_numbered_rows, "ID_Produto", "PROD")
    input_source_rows = source_rows_by_id(input_numbered_rows, "ID_Insumo", "INS")
    plan_source_rows = source_rows_by_id(plan_numbered_rows, "ID_Producao", "PLAN")

    for identifier, record in {**products_by_id, **inputs_by_id}.items():
        if not text(record.get("Produto", record.get("Insumo_Recurso", ""))):
            issues.append(f"{identifier}: nome vazio no catálogo-fonte")

    catalog_rows: list[list[str]] = []
    for identifier, product in products_by_id.items():
        catalog_rows.append([
            identifier,
            product["Produto"],
            "produto final",
            "unit",
            display_decimal(decimal(product["Rendimento_Fornada"])),
            display_decimal(decimal(product["Custo_Total_c_MO"]), "0.00"),
        ])

    physical_inputs: dict[str, dict[str, str]] = {}
    physical_catalog_rows: list[list[str]] = []
    operational_rows: list[list[str]] = []
    for identifier, item in inputs_by_id.items():
        normalized_unit, unit_problem = normalize_unit(item["Unidade"])
        if identifier in OPERATIONAL_IDS:
            operational_rows.append([
                identifier,
                item["Insumo_Recurso"],
                OPERATIONAL_IDS[identifier],
                item["Quantidade_Embalagem"],
                item["Unidade"],
                display_decimal(decimal(item["Custo_Unitario_Calculado"]), "0.00"),
            ])
            continue
        if unit_problem:
            issues.append(f"{identifier}: {unit_problem} ({item['Unidade']})")
        physical_inputs[identifier] = item
        physical_catalog_rows.append([
            identifier,
            item["Insumo_Recurso"],
            "packaging" if identifier in PACKAGING_IDS else "ingredient",
            normalized_unit or "pendente",
            display_decimal(decimal(item["Custo_Unitario_Calculado"]), "0.00"),
        ])

    recipe_components: list[dict[str, str]] = []
    recipe_totals: list[dict[str, str]] = []
    operational_recipe: list[list[str]] = []
    unmatched_recipe: list[list[str]] = []
    for row in recipe_source:
        name = text(row["Item_Utilizado"])
        consumption = decimal(row["Consumo_Receita"])
        cost = decimal(row["Custo_Proporcional"])
        unit, unit_problem = normalize_unit(row["Unidade"])
        if "Custo Total" in name:
            recipe_totals.append(row)
            continue
        if "Energia" in name:
            operational_recipe.append([name, display_decimal(consumption), row["Unidade"], display_decimal(cost, "0.00"), "energy"])
            continue
        if "Mão de Obra" in name:
            operational_recipe.append([name, display_decimal(consumption), row["Unidade"], display_decimal(cost, "0.00"), "labor"])
            continue
        if unit_problem:
            issues.append(f"Ficha técnica-base: unidade inválida em {name}: {row['Unidade']}")
        exact_input_id = inputs_by_name.get(key(name))
        technical_link = technical_targets.get(key(name))
        if technical_link:
            recipe_components.append({
                "name": name,
                "inputId": technical_link["productSku"],
                "inputName": technical_link["productName"],
                "consumption": technical_link["quantity"],
                "unit": technical_link["unit"],
                "cost": display_decimal(cost, "0.00"),
                "status": "vínculo técnico aprovado",
            })
        elif exact_input_id and exact_input_id in physical_inputs:
            recipe_components.append({
                "name": name,
                "inputId": exact_input_id,
                "inputName": physical_inputs[exact_input_id]["Insumo_Recurso"],
                "consumption": display_decimal(consumption),
                "unit": unit or "pendente",
                "cost": display_decimal(cost, "0.00"),
                "status": "vínculo exato",
            })
        else:
            unmatched_recipe.append([name, display_decimal(consumption), row["Unidade"], display_decimal(cost, "0.00"), "exige alias explícito; aproximação proibida"])

    for row in recipe_totals:
        if decimal(row["Custo_Proporcional"]) is None:
            issues.append(f"Ficha técnica-base: total inválido em {row['Item_Utilizado']}")

    planned_rows: list[list[str]] = []
    real_rows: list[list[str]] = []
    missing_plan_products: list[str] = []
    total_planned = Decimal("0")
    total_estimated_cost = Decimal("0")
    for row in plan_source:
        identifier = text(row["ID_Producao"]).upper()
        product_id = products_by_name.get(key(row["Produto"]))
        planned_qty = decimal(row["Qtd_Prevista"])
        estimated_cost = decimal(row["Custo_Estimado"])
        if product_id is None:
            missing_plan_products.append(f"{identifier}: {row['Produto']}")
        if planned_qty is not None:
            total_planned += planned_qty
        if estimated_cost is not None:
            total_estimated_cost += estimated_cost
        planned_rows.append([
            identifier,
            product_id or "sem vínculo",
            row["Produto"],
            display_decimal(decimal(row["Fornadas"])),
            display_decimal(decimal(row["Rendimento_Previsto"])),
            display_decimal(planned_qty),
            display_decimal(estimated_cost, "0.00"),
            row["Status"],
        ])
        if text(row["Data"]).lower() not in {"planejamento semanal", ""} and decimal(row["Qtd_Real"]) is not None:
            real_rows.append([identifier, product_id or "sem vínculo", row["Data"], display_decimal(decimal(row["Qtd_Real"])), display_decimal(decimal(row["Perdas_Qtd"])), row["Status"]])

    if not real_rows:
        decisions.append("Não há produção real importável: os 17 registros são `PLAN`, sem data de produção e sem `Qtd_Real`.")
    if all(not text(row["Perdas_Qtd"]) and not text(row["Perdas_%"]) for row in plan_source):
        decisions.append("Não há registros de perdas reais. O modelo futuro deve exigir quantidade, unidade, motivo e vínculo com lote concluído.")

    packaging_rows: list[list[str]] = []
    for product_id, packaging_id in INDIVIDUAL_PACKAGING.items():
        product = products_by_id[product_id]
        packaging = inputs_by_id[packaging_id]
        packaging_rows.append([product_id, product["Produto"], packaging_id, packaging["Insumo_Recurso"], "1 unit por brownie; regra aprovada"])

    profile_rows = [
        [
            identifier,
            product["Produto"],
            product["Tamanho"] or "sem corte informado",
            product["Rendimento_Fornada"],
            "—" if key(product["Recheio"]) in {"", "nenhum"} else product["Recheio"],
            next((row[3] for row in packaging_rows if row[0] == identifier), "sem embalagem individual"),
        ]
        for identifier, product in products_by_id.items()
    ]

    approved_filling_skus = {
        "INS013": "Brigadeiro (Recheio)",
        "INS014": "Doce de Leite (Recheio)",
        "INS015": "Leite Ninho (Recheio)",
        "INS016": "Creme de Avelã (Recheio)",
        "INS017": "Goiabada (Recheio)",
        "INS018": "Maracujá (Recheio)",
    }
    profile_components = recipe_manifest.get("profileAdditionalComponents", [])
    component_by_product = {
        text(component.get("productSourceId")).upper(): component
        for component in profile_components
    }
    filled_product_ids = {
        identifier
        for identifier, product in products_by_id.items()
        if key(product["Recheio"]) not in {"", "nenhum"}
    }
    if set(component_by_product) != filled_product_ids or len(component_by_product) != len(profile_components):
        issues.append("Componentes de recheio não correspondem exatamente aos produtos recheados do catálogo.")
    filling_component_rows: list[list[str]] = []
    filling_quantity_pending: list[str] = []
    for product_id in sorted(filled_product_ids):
        component = component_by_product.get(product_id)
        product = products_by_id[product_id]
        if not component:
            filling_quantity_pending.append(product_id)
            continue
        filling_sku = text(component.get("fillingProductSku")).upper()
        filling = inputs_by_id.get(filling_sku)
        product_row = product_source_rows[product_id]
        source_filling_cell = f"02_Cadastro_Produtos!E{product_row}"
        source = component.get("source", {})
        workbook_reference = source.get("workbookTypeReference", {})
        expected_filling_cell = workbook_reference.get("fillingCell")
        if component.get("productSku") != product_id or expected_filling_cell != source_filling_cell:
            issues.append(f"{product_id}: referência de célula do componente de recheio inválida.")
        if source.get("origin") != "operational_decision" or not text(source.get("decisionId")):
            issues.append(f"{product_id}: origem da decisão operacional inválida.")
        if key(product["Recheio"]) != key(component.get("fillingSource")):
            issues.append(f"{product_id}: recheio da fonte diverge do manifesto técnico.")
        if (
            filling_sku not in approved_filling_skus
            or not filling
            or filling["Insumo_Recurso"] != approved_filling_skus[filling_sku]
            or key(filling["Unidade"]) != "g"
        ):
            issues.append(f"{product_id}: vínculo de recheio não é um dos seis insumos aprovados em gramas.")
        expected_catalog_cells = f"03_Cadastro_Insumos!B{input_source_rows.get(filling_sku, 0)}:E{input_source_rows.get(filling_sku, 0)}"
        if workbook_reference.get("catalogCells") != expected_catalog_cells:
            issues.append(f"{product_id}: referência do catálogo de recheio inválida.")
        quantity = decimal(component.get("quantity"))
        if quantity is None or quantity <= 0:
            issues.append(f"{product_id}: quantidade de recheio inválida no manifesto.")
            quantity_text = "inválida"
        else:
            quantity_text = display_decimal(quantity)
        filling_component_rows.append([
            product_id,
            product["Produto"],
            filling_sku,
            approved_filling_skus.get(filling_sku, "inválido"),
            quantity_text,
            component.get("unit", "pendente"),
            source_filling_cell,
            workbook_reference.get("catalogCells", "pendente"),
            text(source.get("decisionId")) or "pendente",
            component.get("status", "pendente"),
        ])

    alias_rows = [
        [alias["sourceId"], alias["target"]["sku"], alias["target"]["name"], alias["target"]["unit"], alias.get("quantityMultiplier", "sem multiplicador")]
        for alias in aliases
        if alias.get("status") == "approved"
    ]
    alias_targets = {alias["target"]["sku"] for alias in aliases if alias.get("status") == "approved"}
    recipe_catalog_missing = sorted({row[0] for row in unmatched_recipe})
    duplicate_ids = duplicates([*products_by_id, *inputs_by_id, *(text(row["ID_Producao"]).upper() for row in plan_source)])
    duplicate_recipe_names = duplicates([key(row["Item_Utilizado"]) for row in recipe_source])

    energy_reference = decimal(inputs_by_id["INS020"]["Custo_Unitario_Calculado"])
    labor_reference = decimal(inputs_by_id["INS021"]["Custo_Unitario_Calculado"])
    energy_recipe_cost = next((decimal(row[3]) for row in operational_recipe if row[4] == "energy"), None)
    labor_recipe_cost = next((decimal(row[3]) for row in operational_recipe if row[4] == "labor"), None)
    if energy_recipe_cost is not None and energy_reference is not None and materially_different(energy_recipe_cost, energy_reference):
        historical_cost_notes.append(f"Energia: ficha técnica usa R$ {display_decimal(energy_recipe_cost, '0.00')} por 1 kWh; tarifa atual cadastrada é R$ {display_decimal(energy_reference, '0.00')}.")
    expected_labor = (labor_reference or Decimal("0")) * Decimal("2")
    if labor_recipe_cost is not None and materially_different(labor_recipe_cost, expected_labor):
        historical_cost_notes.append(f"Mão de obra: ficha técnica usa R$ {display_decimal(labor_recipe_cost, '0.00')} para 2 h; tarifa atual cadastrada implica R$ {display_decimal(expected_labor, '0.00')}.")

    total_without_labor = next((decimal(row["Custo_Proporcional"]) for row in recipe_totals if "Sem Mão" in row["Item_Utilizado"]), None)
    total_with_labor = next((decimal(row["Custo_Proporcional"]) for row in recipe_totals if "Com Mão" in row["Item_Utilizado"]), None)
    physical_recipe_cost = sum(
        (decimal(row["Custo_Proporcional"]) or Decimal("0"))
        for row in recipe_source
        if "Custo Total" not in text(row["Item_Utilizado"])
        and "Energia" not in text(row["Item_Utilizado"])
        and "Mão de Obra" not in text(row["Item_Utilizado"])
    )
    energy_cost = energy_recipe_cost or Decimal("0")
    labor_cost = labor_recipe_cost or Decimal("0")
    if total_without_labor is not None and materially_different(total_without_labor, physical_recipe_cost + energy_cost):
        issues.append("Custo total sem mão de obra não reconcilia com os componentes da ficha técnica-base.")
    if total_with_labor is not None and total_without_labor is not None and materially_different(total_with_labor, total_without_labor + labor_cost):
        issues.append("Custo total com mão de obra não reconcilia com o custo sem mão de obra e mão de obra.")

    current_rate_rows: list[list[str]] = []
    for rate in approved_rates:
        source_id = text(rate.get("sourceItemId")).upper()
        source = inputs_by_id.get(source_id)
        if not source:
            issues.append(f"Tarifa operacional aprovada sem recurso-fonte: {source_id}")
            continue
        source_unit = key(source["Unidade"])
        expected_source_unit = "kwh" if rate["unit"] == "kWh" else "horas"
        if source_unit != expected_source_unit:
            issues.append(f"Tarifa operacional aprovada com unidade divergente: {source_id}")
        workbook_amount = decimal(source["Custo_Unitario_Calculado"])
        manifest_amount = decimal(rate["unitAmount"])
        if workbook_amount is None or manifest_amount is None or materially_different(workbook_amount, manifest_amount):
            issues.append(f"Tarifa operacional aprovada com valor divergente: {source_id}")
        current_rate_rows.append([
            rate["sourceId"],
            source_id,
            rate["type"],
            rate["unit"],
            f"R$ {display_decimal(manifest_amount, '0.00')}",
            rate["effectiveFrom"],
        ])

    return f"""# Prévia de produção, fichas técnicas e custos operacionais

Gerado em modo somente leitura por `npm run production:preview -- <caminho-do-workbook>`. O workbook não foi alterado, nenhuma migration foi criada, nenhuma conexão com o Neon foi aberta e nenhum dado foi importado.

## Fonte e limite de reconciliação

- Arquivo: `{path.name}`
- SHA-256: `{hash_file(path)}`
- Abas analisadas: `01_Parametros`, `02_Cadastro_Produtos`, `03_Cadastro_Insumos` e `09_Producao_Fornadas`.
- O cruzamento usa os IDs e nomes normalizados do catálogo-fonte que originou o catálogo já importado (17 produtos finais e 19 itens físicos), o manifesto de 23 aliases de compra e `data/receita-base-vinculos.json` (versão 3). Como esta prévia é offline, uma futura importação deve repetir a conferência por SKU no banco e interromper diante de divergência.

## Classificação estrita dos dados

| Classe | Origem | Encontrados | Tratamento nesta prévia |
| --- | --- | ---: | --- |
| Ficha técnica | `03_Cadastro_Insumos` | 1 receita-base / {len(recipe_components) + len(unmatched_recipe)} componentes | não é movimentação de estoque |
| Planejamento | `09_Producao_Fornadas` | {len(plan_source)} `PLAN` | não importar como produção real |
| Produção real | `09_Producao_Fornadas` | {len(real_rows)} | exige data, quantidade real e confirmação |
| Perdas | `09_Producao_Fornadas` | 0 | não há dado histórico para importar |
| Custos operacionais | `03_Cadastro_Insumos` | 2 recursos / 2 linhas na receita | energia e mão de obra, fora do estoque |
| Movimento de estoque | — | 0 | só poderá nascer de lote concluído e confirmado |

## Produtos finais e custos de referência

Os cartões dos 17 produtos preservam rendimento e custo unitário calculado; não constituem, sozinhos, fichas técnicas completas por produto.

{markdown_table(['ID', 'Produto', 'Classe', 'Unidade', 'Rendimento/fornada', 'Custo unitário c/MO'], catalog_rows)}

## Insumos e embalagens físicos de referência

{markdown_table(['ID', 'Item', 'Tipo', 'Unidade', 'Custo unitário fonte'], physical_catalog_rows)}

## Ficha técnica-base detectada

Fonte: bloco `Ficha Técnica - Receita Base` da aba `03_Cadastro_Insumos`. Os vínculos abaixo são somente por igualdade normalizada de nome; não há aproximação sem alias explícito.

{markdown_table(['Item fonte', 'ID vinculado', 'Item de catálogo', 'Consumo', 'Unidade', 'Custo proporcional', 'Situação'], [[item['name'], item['inputId'], item['inputName'], item['consumption'], item['unit'], item['cost'], item['status']] for item in recipe_components])}

Itens sem vínculo explícito:

{markdown_table(['Item fonte', 'Consumo', 'Unidade', 'Custo proporcional', 'Pendência'], unmatched_recipe)}

Totais preservados na fonte: sem mão de obra R$ {display_decimal(total_without_labor, '0.00')}; com mão de obra R$ {display_decimal(total_with_labor, '0.00')}.

## Embalagens individuais aprovadas

{markdown_table(['Produto final', 'Produto', 'Embalagem', 'Item', 'Consumo futuro'], packaging_rows)}

Essas regras consomem uma unidade por brownie compatível apenas quando existir lote real confirmado. Não geram baixa histórica nem baixas a partir de vendas.

## Perfis de produção extraídos

Os 17 perfis usam a única receita-base e preservam corte, rendimento e recheio da fonte. Os componentes adicionais de recheio pertencem ao perfil, não à receita-base.

{markdown_table(['Produto', 'Nome', 'Corte/tamanho', 'Rendimento esperado', 'Recheio', 'Embalagem individual'], profile_rows)}

### Componentes adicionais de recheio por perfil

O tipo de recheio está explicitamente registrado em `02_Cadastro_Produtos!E7:E18` e foi vinculado estritamente aos seis insumos abaixo. As quantidades foram definidas pela decisão operacional aprovada `OPDEC-PROFILE-FILLINGS-2026-001`: 20 g para os brownies 5×5 e 40 g para os 7×7. Elas **não** foram extraídas do workbook e não foram inferidas de preço, custo ou rendimento.

{markdown_table(['SKU final', 'Produto', 'SKU recheio', 'Recheio de estoque', 'Quantidade', 'Unidade', 'Tipo na fonte', 'Cadastro do insumo', 'Origem da quantidade', 'Situação'], filling_component_rows)}

Pendência de quantidade: {', '.join(filling_quantity_pending) if filling_quantity_pending else 'nenhuma; as 12 regras foram aprovadas como decisão operacional'}. Esses componentes permanecem sem consumo, lote concluído ou movimento de estoque nesta etapa.

### Bordinhas: saída planejada, não perda

`Bordinhas` aparece como produto final próprio (`PROD002`, `02_Cadastro_Produtos!A{product_source_rows['PROD002']}:F{product_source_rows['PROD002']}`) e como saída planejada (`PLAN002`, `09_Producao_Fornadas!A{plan_source_rows['PLAN002']}:M{plan_source_rows['PLAN002']}`). A fonte não o registra em `Perdas_Qtd` ou `Perdas_%`; portanto, ele deve ser tratado como coproduto do lote, nunca como perda. O workbook não contém, contudo, uma chave que relacione esse coproduto a uma fornada específica, o que deverá ser modelado na próxima etapa.

## Planejamentos e produção realizada

{markdown_table(['Plano', 'ID do produto', 'Produto', 'Fornadas', 'Rendimento previsto', 'Quantidade prevista', 'Custo estimado', 'Status'], planned_rows)}

Total planejado: {display_decimal(total_planned)} unidades; custo estimado preservado: R$ {display_decimal(total_estimated_cost, '0.00')}. Produção real detectada: {len(real_rows)}.

## Custos operacionais, fora do estoque

{markdown_table(['ID', 'Recurso cadastrado', 'Tipo', 'Base', 'Unidade', 'Custo unitário'], operational_rows)}

{markdown_table(['Linha da ficha', 'Consumo', 'Unidade', 'Custo na ficha', 'Tipo'], operational_recipe)}

Energia e mão de obra são custos operacionais: nunca são produtos, itens de receita físicos ou movimentações de estoque.

### Tarifas operacionais vigentes aprovadas

{markdown_table(['ID de origem', 'Recurso fonte', 'Tipo', 'Unidade', 'Valor unitário', 'Vigente desde'], current_rate_rows)}

As tarifas acima serão importadas junto da receita, em uma única transação, com ID, hash e payload de origem. `historicalCost` das linhas da ficha (energia R$ {display_decimal(energy_recipe_cost, '0.00')} e mão de obra R$ {display_decimal(labor_recipe_cost, '0.00')}) continua sendo apenas referência histórica auditável. Um lote concluído futuro deverá selecionar a tarifa do mesmo tipo cuja vigência seja a mais recente até a data do lote e registrar a tarifa selecionada no custo operacional.

O parâmetro `Custos_Fixos_Mensais` é R$ {display_decimal(decimal(parameters.get('Custos_Fixos_Mensais')), '0.00')}; a fonte não define rateio desse valor para fichas ou lotes.

## Aliases e conversões de compras já aprovados

O manifesto `data/importacao-compras-aliases.json` contém {len(alias_rows)} aliases aprovados e {len(alias_targets)} SKUs-alvo. Os sete vínculos técnicos da ficha-base ficam no manifesto versionado `data/receita-base-vinculos.json`; nenhum vínculo usa semelhança de nome.

{markdown_table(['ID de saída', 'SKU alvo', 'Produto alvo', 'Unidade alvo', 'Multiplicador'], alias_rows)}

## Inconsistências, duplicidades e decisões pendentes

- IDs duplicados entre catálogo e planejamentos: {', '.join(duplicate_ids) if duplicate_ids else 'nenhum'}.
- Nomes duplicados no bloco de ficha técnica: {', '.join(duplicate_recipe_names) if duplicate_recipe_names else 'nenhum'}.
- Itens de ficha sem vínculo físico explícito: {', '.join(recipe_catalog_missing) if recipe_catalog_missing else 'nenhum; os sete vínculos estão aprovados no manifesto técnico'}.
- Campos/inconsistências: {'; '.join(issues) if issues else 'nenhum'}.
- Diferenças históricas de custo, preservadas apenas para auditoria: {'; '.join(historical_cost_notes) if historical_cost_notes else 'nenhuma'}.
- Produção/perdas: {'; '.join(decisions) if decisions else 'sem pendência adicional'}.
- Os vínculos técnicos aprovados são auditáveis no manifesto; a prévia não usa aproximação de nomes.
- Os custos históricos de energia e mão de obra ficam como metadados; novos lotes concluídos usarão as tarifas operacionais atuais cadastradas.
- Cada perfil é único por par `versão da receita + produto final`; o mesmo produto poderá ter perfil novo quando a receita-base ganhar nova versão.
- As 12 linhas recheadas possuem vínculo técnico estrito com os seis insumos de recheio, mas a quantidade explícita não consta no workbook analisado; a pendência está preservada por SKU e referência de célula no manifesto, sem consumo inventado.

## O que poderá ser importado após aprovação

1. Ficha técnica-base, seus sete itens físicos e dois requisitos operacionais; custos históricos permanecem em metadados de auditoria.
2. Regras de embalagem individual já aprovadas para os 14 brownies mapeados, aplicáveis apenas em lote real concluído.
3. Os 12 vínculos de recheio estão mapeados, mas ainda não são importáveis como consumo por faltar a quantidade explícita na fonte.
4. Os 17 `PLAN` podem ser mantidos como planejamentos, sem produção, consumo, perda ou estoque.
5. Não há lote real, perda ou custo operacional histórico pronto para importar sem decisão adicional.

## Modelagem incremental preparada (ainda não aplicada)

1. `recipe_versions` e `recipe_items`: ficha técnica versionada, produto final, rendimento esperado, insumo físico, quantidade decimal, unidade, custo de referência e origem auditável.
2. `production_profile_components`: componentes adicionais de recheio por perfil, com `product_id`, quantidade decimal, unidade, base por unidade de saída, ID/hash/payload de origem. Os 12 recheios aprovados têm origem na decisão operacional `OPDEC-PROFILE-FILLINGS-2026-001`, não no workbook. A embalagem compatível já é requisito do perfil e será baixada no lote concluído futuro.
3. `production_batches` e `production_batch_outputs`: lote com data, receita/versionamento, quantidade planejada, quantidade produzida, status e confirmação. As saídas devem identificar produto principal ou `co_product`; `Bordinhas` é saída `co_product`, não perda.
4. `production_batch_consumptions` e `production_batch_losses`: em lote concluído, registrar o consumo efetivo de massa-base, recheio e embalagem com a regra de cálculo auditável, e registrar perdas separadamente. As respectivas movimentações de estoque devem ser criadas na mesma transação.
5. `operational_cost_rates`: tarifas versionadas por tipo, unidade e data de vigência, com ID/hash/payload da fonte. `operational_costs` referencia a tarifa efetivamente usada no lote, sem `product_id` ou movimento de estoque.
6. `production_profiles`: unicidade composta por `recipe_version_id + product_id`; o produto pode ter outro perfil em uma versão futura da receita-base.
7. IDs externos e hashes por receita, tarifa, item, componente, lote, saída, perda e custo impedem reimportação; o importador usa uma única transação e exige `--confirm`.

Nenhuma migration foi aplicada, nenhuma alteração foi feita no banco e nenhum dado foi importado.
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Prévia segura de produção e fichas técnicas do workbook.")
    parser.add_argument("workbook", type=Path, help="Caminho para o workbook .xlsx")
    parser.add_argument("--output", type=Path, default=OUTPUT, help="Relatório Markdown a gerar")
    args = parser.parse_args()
    if args.workbook.suffix.lower() != ".xlsx" or not args.workbook.is_file():
        parser.error("Informe um arquivo .xlsx existente.")
    try:
        report = build_preview(args.workbook)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report, encoding="utf-8")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Erro na prévia de produção: {error}", file=__import__("sys").stderr)
        return 1
    print(f"Prévia gerada em {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
