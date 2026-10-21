// Sem "use client": malha dos municípios do Ceará (API de malhas do IBGE),
// convertida no servidor em caminhos SVG prontos para desenhar. Assim o mapa
// não precisa de nenhuma biblioteca de mapas no navegador.

const MESH_URL =
  "https://servicodados.ibge.gov.br/api/v3/malhas/estados/23?formato=application/vnd.geo%2Bjson&intrarregiao=municipio&qualidade=minima";
const THIRTY_DAYS = 30 * 24 * 60 * 60;

type Ring = [number, number][];

interface Feature {
  properties: { codarea: string };
  geometry: { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
}

export interface MapShape {
  ibge: string;
  d: string;
  cx: number;
  cy: number;
}

export interface StateMap {
  width: number;
  height: number;
  shapes: MapShape[];
}

const WIDTH = 640;
const PADDING = 8;

// Área com sinal (fórmula do laço) e centroide de um anel já projetado.
function ringCentroid(points: [number, number][]): { area: number; x: number; y: number } {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let index = 0; index < points.length; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[(index + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  area /= 2;
  return area === 0 ? { area: 0, x: points[0][0], y: points[0][1] } : { area, x: x / (6 * area), y: y / (6 * area) };
}

let cached: { at: number; promise: Promise<StateMap> } | null = null;

export function loadCearaMap(): Promise<StateMap> {
  if (cached && Date.now() - cached.at < THIRTY_DAYS * 1000) return cached.promise;
  const promise = (async () => {
    const response = await fetch(MESH_URL, { next: { revalidate: THIRTY_DAYS }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`IBGE respondeu ${response.status}`);
    const features = ((await response.json()) as { features: Feature[] }).features;
    const polygons = (feature: Feature): Ring[][] =>
      feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;

    // Projeção equirretangular com correção pela latitude média: suficiente
    // para um estado do tamanho do Ceará.
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const feature of features) {
      for (const polygon of polygons(feature)) {
        for (const [lon, lat] of polygon[0]) {
          minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        }
      }
    }
    const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const scale = (WIDTH - PADDING * 2) / ((maxLon - minLon) * kx);
    const height = Math.round((maxLat - minLat) * scale + PADDING * 2);
    const project = ([lon, lat]: [number, number]): [number, number] => [
      PADDING + (lon - minLon) * kx * scale,
      PADDING + (maxLat - lat) * scale,
    ];
    const fmt = (value: number) => Math.round(value * 10) / 10;

    const shapes = features.map((feature) => {
      let d = "";
      let best = { area: 0, x: 0, y: 0 };
      for (const polygon of polygons(feature)) {
        polygon.forEach((ring, ringIndex) => {
          const points = ring.map(project);
          d += `M${points.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join("L")}Z`;
          if (ringIndex === 0) {
            const centroid = ringCentroid(points);
            if (Math.abs(centroid.area) > Math.abs(best.area)) best = centroid;
          }
        });
      }
      return { ibge: feature.properties.codarea, d, cx: fmt(best.x), cy: fmt(best.y) };
    });
    return { width: WIDTH, height, shapes };
  })();
  cached = { at: Date.now(), promise };
  promise.catch(() => {
    if (cached?.promise === promise) cached = null;
  });
  return promise;
}
