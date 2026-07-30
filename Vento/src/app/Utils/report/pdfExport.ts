import jsPDF from "jspdf";

/** Datos que consume el generador de PDF nativo del informe. */
export type ReportPdfData = {
  timestamp: string;
  region: string | null;
  coordsText: string;
  areaText: string;
  activeVarsCount: number;
  general: number;
  /** Las 5 dimensiones (label + valor 0–100). */
  bars: { label: string; value: number }[];
  /** 4 ejes puntuables del radar. */
  radarAxes: { label: string; value: number }[];
  informativeRows: {
    id: string;
    label: string;
    unit: string;
    color: string;
    valueText: string;
  }[];
};

const BRAND: [number, number, number] = [22, 81, 112]; // #165170
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Dibuja un radar (spider) nativo en jsPDF (mm). */
function drawRadar(
  doc: jsPDF,
  axes: { label: string; value: number }[],
  cx: number,
  cy: number,
  R: number,
) {
  const n = axes.length;
  const ang = (i: number) => ((-90 + (360 / n) * i) * Math.PI) / 180;
  const pt = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(ang(i)),
    cy + r * Math.sin(ang(i)),
  ];

  // Anillos + ejes
  doc.setDrawColor(220);
  doc.setLineWidth(0.15);
  for (const lv of [0.25, 0.5, 0.75, 1]) {
    for (let i = 0; i < n; i++) {
      const [x1, y1] = pt(i, R * lv);
      const [x2, y2] = pt((i + 1) % n, R * lv);
      doc.line(x1, y1, x2, y2);
    }
  }
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, R);
    doc.line(cx, cy, x, y);
  }

  // Polígono de datos (relleno tinte brand + borde brand)
  const dp = axes.map((a, i) => pt(i, R * clamp01(a.value / 100)));
  doc.setFillColor(204, 225, 238);
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.4);
  const deltas: [number, number][] = [];
  for (let i = 1; i < dp.length; i++) {
    deltas.push([dp[i][0] - dp[i - 1][0], dp[i][1] - dp[i - 1][1]]);
  }
  doc.lines(deltas, dp[0][0], dp[0][1], [1, 1], "FD", true);

  // Etiquetas
  doc.setFontSize(6);
  doc.setTextColor(75);
  axes.forEach((a, i) => {
    const [x, y] = pt(i, R + 4);
    const align = x < cx - 0.5 ? "right" : x > cx + 0.5 ? "left" : "center";
    doc.text(a.label, x, y, { align, baseline: "middle" });
  });
}

/**
 * Genera un PDF NATIVO (texto vectorial, no captura) del informe en A4
 * landscape. Alta resolución a cualquier zoom. Reemplaza el enfoque anterior
 * con html2canvas (que rasterizaba la previsualización → borroso).
 */
export async function generateReportPdf(
  data: ReportPdfData,
  filename: string,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const M = 14; // margen

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 3, "F"); // barra de acento superior

  // PNG (raster) primero: jsPDF.addImage lo maneja de forma fiable (el SVG puede
  // no rasterizar bien). El logo es dark → va sobre el header blanco.
  const logo = await loadImage("/vento_logo.png").then(
    (i) => i ?? loadImage("/vento_logo.svg"),
  );
  let titleX = M;
  if (logo && logo.naturalWidth > 0) {
    const h = 11;
    const w = (logo.naturalWidth / logo.naturalHeight) * h;
    try {
      doc.addImage(logo, "PNG", M, 8, w, h);
      titleX = M + w + 5;
    } catch {
      /* si el formato no es soportado, seguimos sin logo */
    }
  }

  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Análisis preliminar de idoneidad eólica", titleX, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Informe de idoneidad · ${data.timestamp}`, titleX, 18);

  // Logos institucionales (texto — faltan assets ANH/EAFIT/Mavalan)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  doc.text("ANH · EAFIT · Mavalan Software", W - M, 13, { align: "right" });

  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(M, 24, W - M, 24);

  // ── Columna izquierda ───────────────────────────────────
  const LX = M;
  let ly = 34;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("RESULTADO PRELIMINAR", LX, ly);
  ly += 9;
  doc.setFontSize(30);
  doc.setTextColor(...BRAND);
  doc.text(data.general.toFixed(1), LX, ly);
  doc.setFontSize(11);
  doc.setTextColor(150);
  const gw = doc.getTextWidth(data.general.toFixed(1));
  doc.text("/ 100", LX + gw + 3, ly);
  ly += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);
  doc.text(
    doc.splitTextToSize(
      "Promedio agregado de la evaluación de idoneidad para el área seleccionada.",
      120,
    ),
    LX,
    ly,
  );
  ly += 12;

  // Barras por dimensión
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("PUNTAJES DE IDONEIDAD POR DIMENSIÓN", LX, ly);
  ly += 6;
  doc.setFontSize(8);
  for (const b of data.bars) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    doc.text(b.label, LX, ly, { baseline: "middle" });
    const barX = LX + 42;
    const barW = 55;
    doc.setFillColor(228, 228, 228);
    doc.rect(barX, ly - 1, barW, 2, "F");
    doc.setFillColor(...BRAND);
    doc.rect(barX, ly - 1, barW * clamp01(b.value / 100), 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND);
    doc.text(b.value.toFixed(1), barX + barW + 4, ly, { baseline: "middle" });
    ly += 7;
  }

  // Radar DEBAJO de las barras (antes iba a la derecha y se solapaba con las
  // barras/valores y con la columna derecha). Centrado en la columna izquierda.
  ly += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("PERFIL POR DIMENSIÓN", LX, ly);
  drawRadar(doc, data.radarAxes, LX + 46, ly + 34, 24);

  // ── Columna derecha ─────────────────────────────────────
  const RX = 165;
  let ry = 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("RESUMEN DEL ÁREA", RX, ry);
  ry += 7;

  const stats: [string, string][] = [
    ["Región", data.region ?? "—"],
    ["Coordenadas", data.coordsText],
    ["Área total", data.areaText],
    ["Variables activas", String(data.activeVarsCount)],
  ];
  for (const [label, value] of stats) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text(label.toUpperCase(), RX, ry);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(57);
    doc.text(value, RX, ry + 4.5);
    ry += 11;
  }

  if (data.informativeRows.length > 0) {
    ry += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `VARIABLES INFORMATIVAS (${data.informativeRows.length})`,
      RX,
      ry,
    );
    ry += 6;
    doc.setFontSize(8);
    for (const v of data.informativeRows) {
      const rgb = hexToRgb(v.color);
      if (rgb) {
        doc.setFillColor(...rgb);
        doc.circle(RX + 1.2, ry - 1, 1.2, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70);
      doc.text(v.label, RX + 5, ry, { baseline: "middle", maxWidth: 80 });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND);
      doc.text(`${v.valueText} ${v.unit}`, W - M, ry, {
        align: "right",
        baseline: "middle",
      });
      ry += 6;
    }
  }

  // ── Footer ──────────────────────────────────────────────
  doc.setDrawColor(225);
  doc.setLineWidth(0.2);
  doc.line(M, 198, W - M, 198);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(150);
  doc.text(
    "Valores placeholder — el modelo multicriterio y los datos reales se conectan cuando el equipo de investigación los entregue.",
    M,
    202,
  );
  doc.text(
    `Vento · ANH · EAFIT · Mavalan Software · ${data.timestamp}`,
    M,
    205.5,
  );

  doc.save(filename);
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
