"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "../../Utils/apis/apiUrl";

// mapa de labels legibles — mismo que en parseH3Parquet pero client-side
const VARIABLE_LABELS: Record<string, string> = {
  "001_velocidad_de_viento": "Velocidad de Viento",
  "004_densidad_energ": "Densidad Energética Eólica",
  "009_profundidad_roca": "Profundidad de Roca",
  "soc_022_sr": "Zona Reserva Campesina",
  "soc_025_er": "Cigarrillos Ilegales",
};

const VARIABLE_UNITS: Record<string, string> = {
  "001_velocidad_de_viento": "m/s",
  "004_densidad_energ": "W/m²",
  "009_profundidad_roca": "",
  "soc_022_sr": "ha",
  "soc_025_er": "%",
};

function getLabel(colName: string): string {
  for (const [prefix, label] of Object.entries(VARIABLE_LABELS)) {
    if (colName.startsWith(prefix)) return label;
  }
  return colName.split("/")[0].replace(/_/g, " ");
}

function getUnit(colName: string): string {
  for (const [prefix, unit] of Object.entries(VARIABLE_UNITS)) {
    if (colName.startsWith(prefix)) return unit;
  }
  return "";
}

interface HexDetail {
  h3_index: string;
  score_general: number;
  tipo_celda: string;
  variables: Record<string, string | number | null>;
}

interface HexPopupProps {
  h3Index: string;
  x: number;  // posición en pantalla
  y: number;
  onClose: () => void;
}

export default function HexPopup({ h3Index, x, y, onClose }: HexPopupProps) {
  const [detail, setDetail] = useState<HexDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Reset del estado cuando cambia el hex — patrón "adjust state during
  // render" (evita setState síncrono dentro del effect de fetch).
  const [currentIndex, setCurrentIndex] = useState(h3Index);
  if (currentIndex !== h3Index) {
    setCurrentIndex(h3Index);
    setLoading(true);
    setDetail(null);
  }

  useEffect(() => {
    fetch(`${API_BASE}/api/tiles/detail/${h3Index}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [h3Index]);

  // cerrar con click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.getElementById("hex-popup");
      if (el && !el.contains(e.target as Node)) onClose();
    };
    // defer para no capturar el click que abrió el popup
    const timer = setTimeout(() => document.addEventListener("click", handler), 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [onClose]);

  // posicionar sin salirse de la pantalla
  const popupStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x + 10, window.innerWidth - 320),
    top: Math.min(y - 10, window.innerHeight - 400),
    zIndex: 50,
  };

  return (
    <div id="hex-popup" style={popupStyle} className="w-[300px] rounded-lg bg-gray-900/95 text-white shadow-xl border border-gray-700">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="text-xs text-gray-400 font-mono">{h3Index}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
      </div>

      {loading ? (
        <div className="px-3 py-4 text-center text-gray-400 text-sm">Cargando...</div>
      ) : !detail ? (
        <div className="px-3 py-4 text-center text-gray-400 text-sm">Sin datos</div>
      ) : (
        <div className="px-3 py-2 space-y-2">
          {/* score general */}
          {detail.score_general > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Score General</span>
              <span className="text-sm font-bold text-blue-400">{(detail.score_general * 100).toFixed(0)}%</span>
            </div>
          )}

          {/* variables */}
          {Object.entries(detail.variables).map(([col, val]) => {
            if (val === null || val === undefined) return null;
            const label = getLabel(col);
            const unit = getUnit(col);
            const displayVal = typeof val === "number" ? val.toFixed(2) : val;

            return (
              <div key={col} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-white">
                  {displayVal} {unit && <span className="text-gray-500">{unit}</span>}
                </span>
              </div>
            );
          })}

          {/* tipo celda */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-700">
            <span className="text-xs text-gray-400">Tipo</span>
            <span className="text-xs text-gray-300">{detail.tipo_celda}</span>
          </div>
        </div>
      )}
    </div>
  );
}
