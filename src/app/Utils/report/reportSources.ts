/**
 * Fuentes de datos con VERSIÓN y LINK (US06-03, tabla de fuentes del informe).
 *
 * ⚠️ SOLO MODO TEMPLATE / PRUEBA. ⚠️
 * En MODO BACKEND la tabla de fuentes del informe se DERIVA de las variables
 * (`fuente` + `url` de cada variable), que vienen de BD tras la subida de
 * metadatos (`catalog_variable.fuente` / `url_fuente`, InfoVariables). Esta lista
 * hardcoded NO se usa en backend salvo, opcionalmente, para enriquecer la
 * `version` por coincidencia laxa de nombre (`sourceVersion`), que no se almacena
 * por variable. Ver `Report.tsx` (`sourceRows`).
 */
export interface ReportSourceLink {
  fuente: string;
  version: string;
  url: string;
}

export const REPORT_SOURCE_LINKS: ReportSourceLink[] = [
  { fuente: "IDEAM", version: "Atlas de Viento y Energía Eólica 2015", url: "http://atlas.ideam.gov.co/visorAtlasVientos.html" },
  { fuente: "IGAC", version: "Cartografía base / SIG 2023", url: "https://www.igac.gov.co/" },
  { fuente: "INVEMAR", version: "SIGMA — datos marino-costeros 2022", url: "https://www.invemar.org.co/" },
  { fuente: "Instituto Humboldt", version: "BioModelos 2021", url: "http://www.humboldt.org.co/" },
  { fuente: "GBIF", version: "Occurrence Download 2024", url: "https://www.gbif.org/" },
  { fuente: "UNGRD", version: "Atlas de Riesgo 2020", url: "https://portal.gestiondelriesgo.gov.co/" },
  { fuente: "DANE", version: "CNPV 2018 · proyecciones", url: "https://www.dane.gov.co/" },
  { fuente: "NASA POWER", version: "Meteorología v9 2023", url: "https://power.larc.nasa.gov/" },
  { fuente: "NOAA / GEBCO", version: "Batimetría 2023", url: "https://www.gebco.net/" },
];
