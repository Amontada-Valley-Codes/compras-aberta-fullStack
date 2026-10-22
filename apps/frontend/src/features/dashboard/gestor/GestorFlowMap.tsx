"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { count, money, percent } from "@/features/public-data/format";

export interface MapCity {
  ibge: string;
  name: string;
  d: string;
  cx: number;
  cy: number;
  value: number;
  suppliers: number;
}

export interface OutsideState {
  uf: string;
  value: number;
  suppliers: number;
}

// Cor pelo valor recebido (escala logarítmica: poucas cidades concentram
// quase tudo, e numa escala linear as demais ficariam todas iguais).
function fillFor(value: number, max: number): string {
  if (value <= 0) return "var(--gs-map-empty)";
  const t = Math.log1p(value) / Math.log1p(max);
  const from = [191, 219, 254];
  const to = [17, 22, 155];
  const mix = from.map((channel, index) => Math.round(channel + (to[index] - channel) * t));
  return `rgb(${mix.join(",")})`;
}

// Arco do município de origem até a cidade do fornecedor.
function arc(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bend = 0.25;
  return `M${x1} ${y1}Q${mx - dy * bend} ${my + dx * bend} ${x2} ${y2}`;
}

export function GestorFlowMap({
  width,
  height,
  cities,
  originIbge,
  flows,
  outside,
  total,
  municipalityName,
}: {
  width: number;
  height: number;
  cities: MapCity[];
  originIbge: string;
  flows: string[];
  outside: OutsideState[];
  total: number;
  municipalityName: string;
}) {
  const [hover, setHover] = useState<{ ibge: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const byIbge = useMemo(() => new Map(cities.map((city) => [city.ibge, city])), [cities]);
  const origin = byIbge.get(originIbge);
  const max = Math.max(1, ...cities.map((city) => city.value));
  const flowCities = flows.map((ibge) => byIbge.get(ibge)).filter((city): city is MapCity => Boolean(city));
  const maxFlow = Math.max(1, ...flowCities.map((city) => city.value));
  const ranking = [...cities].filter((city) => city.value > 0).sort((a, b) => b.value - a.value);
  const hovered = hover ? byIbge.get(hover.ibge) : null;

  // Passar o mouse num item da lista mostra a dica sobre a cidade no mapa.
  const showCity = (city: MapCity) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const box = svg.parentElement?.getBoundingClientRect();
    if (!box) return;
    setHover({ ibge: city.ibge, x: rect.left - box.left + (city.cx / width) * rect.width, y: rect.top - box.top + (city.cy / height) * rect.height });
  };

  const track = (ibge: string) => (event: MouseEvent<SVGPathElement>) => {
    const box = event.currentTarget.ownerSVGElement?.parentElement?.getBoundingClientRect();
    if (!box) return;
    setHover({ ibge, x: event.clientX - box.left, y: event.clientY - box.top });
  };

  return (
    <div className="gs-map-layout">
      <div className="gs-map-canvas" onMouseLeave={() => setHover(null)}>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Mapa do Ceará com o valor que a prefeitura de ${municipalityName} pagou a fornecedores de cada município`}>
          <g className="gs-map-cities">
            {cities.map((city) => (
              <path
                key={city.ibge}
                d={city.d}
                fill={city.ibge === originIbge ? "var(--gs-map-origin)" : fillFor(city.value, max)}
                className={hover?.ibge === city.ibge ? "is-hover" : undefined}
                onMouseMove={track(city.ibge)}
              />
            ))}
          </g>
          {origin && (
            <g className="gs-map-flows" aria-hidden="true">
              {flowCities.map((city, index) => (
                <path
                  key={city.ibge}
                  d={arc(origin.cx, origin.cy, city.cx, city.cy)}
                  strokeWidth={1.2 + 6 * Math.sqrt(city.value / maxFlow)}
                  className={hover?.ibge === city.ibge ? "is-hover" : undefined}
                  style={{ animationDelay: `${index * 0.12}s` }}
                />
              ))}
              {flowCities.map((city) => (
                <circle key={city.ibge} cx={city.cx} cy={city.cy} r={2 + 5 * Math.sqrt(city.value / maxFlow)} />
              ))}
              <circle className="gs-map-origin-dot" cx={origin.cx} cy={origin.cy} r={6} />
            </g>
          )}
        </svg>
        {hovered && hover && (
          <div className="gs-map-tooltip" style={{ left: hover.x, top: hover.y }} role="status">
            <b>{hovered.name}{hovered.ibge === originIbge ? " (sua cidade)" : ""}</b>
            {hovered.value > 0 ? (
              <span>{money(hovered.value)} • {percent((hovered.value / Math.max(1, total)) * 100)} do total<br />{count(hovered.suppliers)} {hovered.suppliers === 1 ? "fornecedor" : "fornecedores"}</span>
            ) : (
              <span>Nenhum fornecedor desta cidade</span>
            )}
          </div>
        )}
        <div className="gs-map-legend" aria-hidden="true">
          <span><i className="is-origin" /> {municipalityName}</span>
          <span><i className="is-scale" /> Menos → mais valor recebido</span>
          <span><i className="is-flow" /> Fluxo para as 12 cidades que mais receberam</span>
        </div>
      </div>

      <aside className="gs-map-side">
        <h3>Cidades que mais receberam</h3>
        <ol className="gs-map-ranking">
          {ranking.slice(0, 10).map((city) => (
            <li
              key={city.ibge}
              className={`${city.ibge === originIbge ? "is-origin" : ""} ${hover?.ibge === city.ibge ? "is-hover" : ""}`}
              onMouseEnter={() => showCity(city)}
              onMouseLeave={() => setHover(null)}
            >
              <span>{city.name}</span>
              <b>{money(city.value)}</b>
              <small>{percent((city.value / Math.max(1, total)) * 100)} • {count(city.suppliers)} {city.suppliers === 1 ? "fornecedor" : "fornecedores"}</small>
            </li>
          ))}
        </ol>
        {outside.length > 0 && (
          <>
            <h3>Fora do Ceará</h3>
            <ul className="gs-map-outside">
              {outside.map((state) => (
                <li key={state.uf}>
                  <span>{state.uf}</span>
                  <b>{money(state.value)}</b>
                  <small>{count(state.suppliers)} {state.suppliers === 1 ? "fornecedor" : "fornecedores"}</small>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
