#!/usr/bin/env python3
"""Gera uma prévia auditável de importação, sem alterar o workbook ou o banco."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"m": MAIN, "r": REL, "pr": PACKAGE_REL}
EXCLUDED_IDS = {
    "INS020": "energia/kWh não é item físico de estoque",
    "INS021": "mão de obra/horas não é item físico de estoque",
}
PACKAGING_KEYWORDS = ("embalagem", "adesivo", "papel manteiga", "caixa", "etiqueta", "fita")
UNIT_MAP = {
    "g": "g",
    "grama": "g",
    "gramas": "g",
    "kg": "kg",
    "quilo": "kg",
    "quilos": "kg",
    "ml": "ml",
    "mililitro": "ml",
    "mililitros": "ml",
    "l": "l",
    "litro": "l",
    "litros": "l",
    "unidade": "unit",
    "unidades": "unit",
    "un": "unit",
    "und": "unit",
}
METER_UNITS = {"m", "metro", "metros"}
ACTIVE_VALUES = {"sim", "s", "ativo", "ativa", "true", "1", "yes"}
INACTIVE_VALUES = {"nao", "n", "inativo", "inativa", "false", "0", "no"}


def text(value: object) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", str(value or "")).strip())


def key(value: object) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFD", text(value).lower())
        if unicodedata.category(character) != "Mn"
    )


def column_index(reference: str) -> int:
    letters = "".join(character for character in reference if character.isalpha())
    result = 0
    for letter in letters:
        result = result * 26 + ord(letter.upper()) - 64
    return result - 1


class WorkbookReader:
    def __init__(self, path: Path):
        self.archive = zipfile.ZipFile(path)
        self.shared_strings = self._shared_strings()
        self.sheets = self._sheet_paths()

    def _shared_strings(self) -> list[str]:
        if "xl/sharedStrings.xml" not in self.archive.namelist():
            return []
        root = ET.fromstring(self.archive.read("xl/sharedStrings.xml"))
        return ["".join(node.text or "" for node in item.iter(f"{{{MAIN}}}t")) for item in root.findall("m:si", NS)]

    def _sheet_paths(self) -> dict[str, str]:
        workbook = ET.fromstring(self.archive.read("xl/workbook.xml"))
        rels = ET.fromstring(self.archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in rels.findall("pr:Relationship", NS)}
        paths: dict[str, str] = {}
        for sheet in workbook.findall("m:sheets/m:sheet", NS):
            rel_id = sheet.attrib[f"{{{REL}}}id"]
            target = targets[rel_id].lstrip("/")
            paths[sheet.attrib["name"]] = target if target.startswith("xl/") else f"xl/{target}"
        return paths

    def rows(self, sheet_name: str) -> list[list[str]]:
        return [values for _, values in self.numbered_rows(sheet_name)]

    def numbered_rows(self, sheet_name: str) -> list[tuple[int, list[str]]]:
        if sheet_name not in self.sheets:
            raise ValueError(f"Aba obrigatória não encontrada: {sheet_name}")
        root = ET.fromstring(self.archive.read(self.sheets[sheet_name]))
        result: list[tuple[int, list[str]]] = []
        for row in root.findall(".//m:sheetData/m:row", NS):
            values: list[str] = []
            for cell in row.findall("m:c", NS):
                index = column_index(cell.attrib["r"])
                while len(values) <= index:
                    values.append("")
                value = cell.find("m:v", NS)
                raw = "" if value is None else value.text or ""
                if cell.attrib.get("t") == "s" and raw:
                    raw = self.shared_strings[int(raw)]
                elif cell.attrib.get("t") == "inlineStr":
                    raw = "".join(node.text or "" for node in cell.iter(f"{{{MAIN}}}t"))
                values[index] = text(raw)
            result.append((int(row.attrib["r"]), values))
        return result


def table(
    rows: list[list[str]], required_headers: set[str], id_header: str, id_prefix: str
) -> list[dict[str, str]]:
    header_index = next(
        (index for index, row in enumerate(rows) if required_headers.issubset(set(row))),
        None,
    )
    if header_index is None:
        raise ValueError(f"Cabeçalhos obrigatórios não encontrados: {', '.join(sorted(required_headers))}")
    headers = rows[header_index]
    records = []
    for row in rows[header_index + 1 :]:
        values = {header: row[index] if index < len(row) else "" for index, header in enumerate(headers) if header}
        identifier = text(values.get(id_header, "")).upper()
        if not identifier or not identifier.startswith(id_prefix):
            break
        records.append(values)
    return records


def normalize_unit(value: str) -> tuple[str | None, str | None]:
    normalized = key(value)
    if normalized in UNIT_MAP:
        return UNIT_MAP[normalized], None
    if normalized in METER_UNITS:
        return "m", None
    return None, "unidade não suportada"


def normalize_active(value: str) -> bool | None:
    normalized = key(value)
    if normalized in ACTIVE_VALUES:
        return True
    if normalized in INACTIVE_VALUES:
        return False
    return None


def valid_money(value: str) -> bool:
    normalized = text(value).replace(",", ".")
    return bool(re.fullmatch(r"\d+(?:\.\d{1,2})?", normalized))


def normalize_money(value: str) -> str | None:
    normalized = text(value).replace(",", ".")
    if not valid_money(normalized):
        return None
    whole, _, decimals = normalized.partition(".")
    return f"{whole}.{decimals.ljust(2, '0')}"


@dataclass
class PreviewItem:
    source_id: str
    sku: str
    name: str
    category: str
    product_type: str
    unit: str | None
    active: bool | None
    note: str


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    if not rows:
        return "Nenhum item."
    safe = lambda value: text(value).replace("|", "\\|")
    return "\n".join([
        f"| {' | '.join(headers)} |",
        f"| {' | '.join(['---'] * len(headers))} |",
        *[f"| {' | '.join(safe(value) for value in row)} |" for row in rows],
    ])


def build_preview(path: Path) -> str:
    reader = WorkbookReader(path)
    product_rows = table(
        reader.rows("02_Cadastro_Produtos"),
        {"ID_Produto", "Produto", "Categoria", "Preco_Praticado", "Produto_Ativo"},
        "ID_Produto",
        "PROD",
    )
    input_rows = table(
        reader.rows("03_Cadastro_Insumos"),
        {"ID_Insumo", "Insumo_Recurso", "Unidade", "Ativo"},
        "ID_Insumo",
        "INS",
    )
    issues: list[str] = []
    ignored: list[list[str]] = []
    pending: list[list[str]] = []
    products: list[PreviewItem] = []
    inputs: list[PreviewItem] = []

    for row in product_rows:
        source_id, name, category = text(row["ID_Produto"]).upper(), text(row["Produto"]), text(row["Categoria"])
        active = normalize_active(row["Produto_Ativo"])
        if not source_id or not name or not category:
            issues.append(f"Produto com campo obrigatório vazio: {source_id or '(sem ID)'}.")
        if active is None:
            issues.append(f"Status inválido em {source_id}: {row['Produto_Ativo'] or '(vazio)'}.")
        if not valid_money(row["Preco_Praticado"]):
            issues.append(f"Preço praticado inválido em {source_id}: {row['Preco_Praticado'] or '(vazio)'}.")
        products.append(PreviewItem(source_id, source_id, name, category, "finished_product", "unit", active, "produto final"))

    for row in input_rows:
        source_id, name = text(row["ID_Insumo"]).upper(), text(row["Insumo_Recurso"])
        active = normalize_active(row["Ativo"])
        if source_id in EXCLUDED_IDS:
            ignored.append([source_id, name, EXCLUDED_IDS[source_id]])
            continue
        unit, unit_issue = normalize_unit(row["Unidade"])
        normalized_name = key(name)
        product_type = "packaging" if any(keyword in normalized_name for keyword in PACKAGING_KEYWORDS) else "ingredient"
        rule = "palavra-chave de embalagem" if product_type == "packaging" else "insumo físico sem palavra-chave de embalagem"
        if not source_id or not name:
            issues.append(f"Insumo com campo obrigatório vazio: {source_id or '(sem ID)'}.")
        if active is None:
            issues.append(f"Status inválido em {source_id}: {row['Ativo'] or '(vazio)'}.")
        if unit_issue:
            pending.append([source_id, name, text(row["Unidade"]), unit_issue])
        inputs.append(PreviewItem(source_id, source_id, name, "Insumos do workbook", product_type, unit, active, rule))

    all_items = products + inputs
    duplicate_skus = [sku for sku, total in Counter(item.sku for item in all_items).items() if sku and total > 1]
    duplicate_names = [name for name, total in Counter(key(item.name) for item in all_items).items() if name and total > 1]
    categories = sorted({item.category for item in products if item.category})
    ready_inputs = [item for item in inputs if item.unit]
    product_map = [
        [
            item.source_id,
            item.sku,
            item.name,
            item.category,
            normalize_money(source["Preco_Praticado"]) or "inválido",
            "ativo" if item.active else "inativo",
        ]
        for item, source in zip(products, product_rows, strict=True)
    ]
    input_map = [[item.source_id, item.name, item.product_type, item.unit or "pendente", "ativo" if item.active else "inativo", item.note] for item in inputs]

    return f"""# Prévia de importação do workbook

Gerado em modo somente leitura pelo comando `npm run import:preview -- <caminho-do-workbook>`. Nenhum dado foi gravado no banco, nenhuma migration foi executada e o workbook não foi alterado.

## Fonte analisada

- Arquivo: `{path.name}`
- Abas: `02_Cadastro_Produtos` e `03_Cadastro_Insumos`

## Contagens

| Grupo | Encontrados | Prontos para futura importação | Pendentes/ignorados |
| --- | ---: | ---: | ---: |
| Categorias de produtos finais | {len(categories)} | {len(categories)} | 0 |
| Produtos finais | {len(products)} | {sum(item.active is not None for item in products)} | {sum(item.active is None for item in products)} |
| Insumos cadastrados | {len(input_rows)} | — | — |
| Insumos físicos | {len(inputs)} | {len(ready_inputs)} | {len(inputs) - len(ready_inputs)} |
| Itens excluídos de estoque | {len(ignored)} | 0 | {len(ignored)} |

## Normalizações e regras auditáveis

- IDs/SKUs: espaços removidos e texto convertido para maiúsculas (`PROD001`, `INS001`).
- Nomes/categorias: Unicode NFC e espaços internos normalizados; a grafia original é preservada.
- Status: `Sim`, `S`, `Ativo`, `true` e `1` viram ativo; `Não`, `N`, `Inativo`, `false` e `0` viram inativo.
- Unidades: `unidade`, `unidades`, `un` e `und` viram `unit`; `g`, `kg`, `ml`, `l` e `m` são preservadas.
- Produtos finais: `Preco_Praticado` é validado como preço de venda de duas casas; a unidade é `unit`.
- Classificação física: `packaging` quando o nome contém uma palavra-chave explícita ({', '.join(PACKAGING_KEYWORDS)}); os demais insumos físicos são `ingredient`.

## Categorias detectadas

{', '.join(categories) if categories else 'Nenhuma categoria válida.'}

## Produtos finais mapeados

{markdown_table(['ID fonte', 'SKU', 'Nome', 'Categoria', 'Preço fonte', 'Status'], product_map)}

## Insumos físicos mapeados

{markdown_table(['ID fonte', 'Nome', 'Tipo', 'Unidade normalizada', 'Status', 'Regra de classificação'], input_map)}

## Itens ignorados de estoque

{markdown_table(['ID', 'Nome', 'Motivo'], ignored)}

## Pendências de unidade / migration

{markdown_table(['ID', 'Nome', 'Unidade fonte', 'Pendência'], pending)}

## Duplicidades e campos inválidos

- SKUs/IDs duplicados: {', '.join(duplicate_skus) if duplicate_skus else 'nenhum'}.
- Nomes duplicados após normalização: {', '.join(duplicate_names) if duplicate_names else 'nenhum'}.
- Campos inválidos: {'; '.join(issues) if issues else 'nenhum detectado'}.

## Limite desta prévia

Esta prévia cobre apenas categorias, produtos finais e insumos físicos. Ela não inclui histórico de vendas, compras, despesas, estoque, produção ou qualquer gravação no banco.
"""


def build_catalog_json(path: Path) -> dict[str, object]:
    reader = WorkbookReader(path)
    product_rows = table(
        reader.rows("02_Cadastro_Produtos"),
        {"ID_Produto", "Produto", "Categoria", "Preco_Praticado", "Produto_Ativo"},
        "ID_Produto",
        "PROD",
    )
    input_rows = table(
        reader.rows("03_Cadastro_Insumos"),
        {"ID_Insumo", "Insumo_Recurso", "Unidade", "Ativo"},
        "ID_Insumo",
        "INS",
    )
    issues: list[str] = []
    pending: list[dict[str, str]] = []
    ignored: list[str] = []
    catalog_products: list[dict[str, object]] = []

    for row in product_rows:
        sku = text(row["ID_Produto"]).upper()
        name, category = text(row["Produto"]), text(row["Categoria"])
        active, sale_price = normalize_active(row["Produto_Ativo"]), normalize_money(row["Preco_Praticado"])
        if not sku or not name or not category or active is None or sale_price is None:
            issues.append(f"Produto inválido: {sku or '(sem ID)'}.")
        catalog_products.append({"sku": sku, "name": name, "category": category, "type": "finished_product", "unit": "unit", "isActive": active, "salePrice": sale_price})

    for row in input_rows:
        sku, name = text(row["ID_Insumo"]).upper(), text(row["Insumo_Recurso"])
        if sku in EXCLUDED_IDS:
            ignored.append(sku)
            continue
        unit, unit_issue = normalize_unit(row["Unidade"])
        active = normalize_active(row["Ativo"])
        product_type = "packaging" if any(keyword in key(name) for keyword in PACKAGING_KEYWORDS) else "ingredient"
        if not sku or not name or active is None:
            issues.append(f"Insumo inválido: {sku or '(sem ID)'}.")
        if unit_issue:
            pending.append({"sku": sku, "reason": unit_issue})
        catalog_products.append({"sku": sku, "name": name, "category": None, "type": product_type, "unit": unit, "isActive": active, "salePrice": None})

    skus = [str(item["sku"]) for item in catalog_products]
    normalized_names = [key(str(item["name"])) for item in catalog_products]
    return {
        "categories": sorted({str(item["category"]) for item in catalog_products if item["category"]}),
        "products": catalog_products,
        "issues": issues,
        "pending": pending,
        "ignored": ignored,
        "duplicateSkus": [sku for sku, total in Counter(skus).items() if sku and total > 1],
        "duplicateNames": [name for name, total in Counter(normalized_names).items() if name and total > 1],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Prévia segura da importação do workbook dos Seus Brownies.")
    parser.add_argument("workbook", type=Path, help="Caminho para o arquivo .xlsx a analisar")
    parser.add_argument("--output", type=Path, default=Path("docs/IMPORTACAO-WORKBOOK-PREVIA.md"), help="Documento Markdown gerado pela prévia")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown", help="Formato da saída; json é usado pelo importador do catálogo")
    args = parser.parse_args()
    if args.workbook.suffix.lower() != ".xlsx" or not args.workbook.is_file():
        parser.error("Informe um arquivo .xlsx existente.")
    try:
        if args.format == "json":
            print(json.dumps(build_catalog_json(args.workbook), ensure_ascii=False))
            return 0
        report = build_preview(args.workbook)
    except (KeyError, ValueError, zipfile.BadZipFile, ET.ParseError) as error:
        print(f"Prévia não gerada: {error}", file=sys.stderr)
        return 1
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    print(f"Prévia gerada em {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
