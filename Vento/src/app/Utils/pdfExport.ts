// `html2canvas-pro` es un fork drop-in que soporta colores CSS modernos
// (oklch / oklab / color-mix) emitidos por Tailwind v4. Reemplaza al
// `html2canvas` clásico sin cambios de API.
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

/**
 * Renderiza un elemento del DOM a un PDF descargable.
 *
 * El elemento se captura como imagen (html2canvas) y se embebe en un PDF A4
 * (jsPDF). Si el contenido excede una página, se reparte en varias.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  const imgData = canvas.toDataURL("image/png");

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
