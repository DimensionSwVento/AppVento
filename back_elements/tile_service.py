"""
Capa de aplicación.
Responsabilidad: traducir requests HTTP a Query objects y formatear QueryResult
al shape que espera el router. No tiene lógica espacial ni de variables.
"""
from __future__ import annotations
from typing import Optional

from shared.config import PARQUET_PATH
from infrastructure.data.parquet_reader import read_parquet, get_variable_label
from infrastructure.spatial.tile_index import init_tile_index, is_index_ready
from infrastructure.spatial import tile_index as _idx

from domain.models.hexagon import TileHex, HexDetail
from domain.query_engine.models import Query, QueryResult, TileXYZ
from domain.query_engine import engine


# ── Warmup ────────────────────────────────────────────────────────────────────

def warmup() -> dict:
    hexagons, variable_names, parsed_at = read_parquet(PARQUET_PATH)
    init_tile_index(hexagons, variable_names)

    categories = extract_categories(variable_names)
    ranges     = {v: _idx.get_variable_range(v) for v in variable_names
                  if _idx.get_variable_range(v) is not None}

    return {
        "status":        "ready",
        "count":         len(hexagons),
        "variableNames": variable_names,
        "categories":    categories,
        "ranges":        ranges,
        "parsedAt":      parsed_at,
    }


def extract_categories(variable_names: list[str]) -> list[str]:
    """Extrae prefijos de categoría únicos (ej: TEC, SOE, REG)."""
    return sorted({v.split("_")[0] for v in variable_names if "_" in v and len(v.split("_")[0]) <= 3})


# ── Tile ──────────────────────────────────────────────────────────────────────

def get_tile(z: int, x: int, y: int, var_name: Optional[str] = None) -> list[TileHex]:
    query = Query(
        type="tile",
        geometry=TileXYZ(z=z, x=x, y=y),
        variable=var_name,
        mode="raw",
    )
    results = engine.execute(query)
    return [_to_tile_hex(r) for r in results]


def _to_tile_hex(r: QueryResult) -> TileHex:
    return TileHex(h=r.h3_index, s=r.score, t=r.tipo_celda,
                   la=r.lat, ln=r.lng, v=r.value)


# ── Area heatmap ──────────────────────────────────────────────────────────────

def get_area_heatmap(
    polygon: Optional[list],
    var: str,
    resolution: int = 8,
    hexes: Optional[list[str]] = None,
) -> list[dict]:
    """
    Dos modos:
    - hexes: lookup directo por h3_index (más eficiente, evita construir polígono en el cliente)
    - polygon: spatial resolver vía h3.polygon_to_cells
    """
    if hexes:
        return _heatmap_from_hexes(hexes, var)

    query = Query(
        type="area",
        geometry=polygon,
        variable=var,
        resolution=resolution,
        mode="normalized",
    )
    results = engine.execute(query)
    return [{"h": r.h3_index, "value": r.value_norm} for r in results]


def _heatmap_from_hexes(hexes: list[str], var: str) -> list[dict]:
    """Lookup directo en el índice para una lista de h3_indexes."""
    from domain.query_engine.variable_engine import resolve_value

    available = _idx.get_available_variables()
    var_range = _idx.get_variable_range(var)
    lookup    = _idx._hex_lookup or {}

    result = []
    for h in hexes:
        hx = lookup.get(h)
        if not hx:
            continue
        _, value_norm = resolve_value(hx, var, available, var_range, "normalized")
        result.append({"h": h, "value": value_norm})
    return result


# ── Detail ────────────────────────────────────────────────────────────────────

def get_detail(h3_index: str) -> Optional[HexDetail]:
    return _idx.get_hex_detail(h3_index)


# ── Variables ─────────────────────────────────────────────────────────────────

def get_variables() -> dict:
    vars_ = _idx.get_available_variables()
    return {
        "variables": [
            {
                "name":  v,
                "label": get_variable_label(v),
                "range": _idx.get_variable_range(v),
            }
            for v in vars_
        ]
    }


# ── Counts ────────────────────────────────────────────────────────────────────

def get_counts(zoom: int, selected: list[str], var_name: Optional[str] = None) -> dict:
    return _idx.get_global_counts(zoom, selected, var_name)


# ── Estado ────────────────────────────────────────────────────────────────────

def index_ready() -> bool:
    return is_index_ready()
