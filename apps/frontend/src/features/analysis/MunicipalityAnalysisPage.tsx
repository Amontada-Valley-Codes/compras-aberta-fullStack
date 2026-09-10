"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Database,
  Download,
  ExternalLink,
  FileBarChart,
  Info,
  MapPin,
  RefreshCw,
  Store,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { formatMoney } from "@/lib/mock-data";
import { getAnalysisMock } from "@/lib/analysis-mock";
import {
  NatureValuesChart,
  SectorEvolutionChart,
  SupplierOriginChart,
  TopSuppliersChart,
} from "./AnalysisCharts";

type Props = { initialMunicipality: string; initialCategory: string };

export function MunicipalityAnalysisPage({
  initialMunicipality,
  initialCategory,
}: Props) {
  const [municipality, setMunicipality] = useState(initialMunicipality);
  const [category, setCategory] = useState(initialCategory);
  const [applied, setApplied] = useState({
    municipality: initialMunicipality,
    category: initialCategory,
  });
  const [loading, setLoading] = useState(false);
  const data = getAnalysisMock(applied.municipality, applied.category);

  const updateAnalysis = () => {
    setLoading(true);
    window.setTimeout(() => {
      setApplied({ municipality, category });
      setLoading(false);
      window.history.replaceState(
        null,
        "",
        `/analise?municipio=${encodeURIComponent(municipality)}&categoria=${encodeURIComponent(category)}`,
      );
    }, 650);
  };

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <div className="analysis-container">
          <BrandLogo />
          <nav>
            <Link href="/">Portal público</Link>
            <Link href="/me">Área da microempresa</Link>
          </nav>
        </div>
      </header>

      <main className="analysis-container analysis-main">
        <Link className="analysis-back" href="/">
          <ArrowLeft /> Voltar para a busca
        </Link>
        <section className="analysis-title-row">
          <div>
            <span>PAINEL DE COMPRAS PÚBLICAS</span>
            <h1>Compras públicas em {data.municipality}</h1>
            <p>
              Entenda como os recursos movimentam o setor de{" "}
              <b>{data.category.toLowerCase()}</b> no município.
            </p>
          </div>
          <button className="ds-button secondary">
            <Download /> Exportar relatório
          </button>
        </section>

        <section className="analysis-filters">
          <label>
            <MapPin />
            <span>
              <small>Município</small>
              <select
                value={municipality}
                onChange={(event) => setMunicipality(event.target.value)}
              >
                <option>Amontada</option>
                <option>Itarema</option>
                <option>Itapipoca</option>
                <option>Trairi</option>
              </select>
            </span>
            <ChevronDown />
          </label>
          <label>
            <FileBarChart />
            <span>
              <small>Categoria / natureza</small>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Alimentos</option>
                <option>Tecnologia</option>
                <option>Equipamentos</option>
                <option>Serviços</option>
                <option>Todas as categorias</option>
              </select>
            </span>
            <ChevronDown />
          </label>
          <label>
            <CalendarDays />
            <span>
              <small>Exercício</small>
              <select defaultValue="2026">
                <option>2026</option>
                <option>2025</option>
              </select>
            </span>
            <ChevronDown />
          </label>
          <label>
            <CalendarDays />
            <span>
              <small>Competência</small>
              <select defaultValue="Agosto">
                <option>Agosto</option>
                <option>Julho</option>
                <option>Junho</option>
              </select>
            </span>
            <ChevronDown />
          </label>
          <button
            className="ds-button primary"
            onClick={updateAnalysis}
            disabled={loading}
          >
            {loading ? <RefreshCw className="spin" /> : null}
            {loading ? "Atualizando..." : "Atualizar análise"}
          </button>
        </section>

        <section className="analysis-source-note">
          <Database />
          <p>
            <b>Fonte oficial: API de Dados Abertos do TCE Ceará</b>
            <span>
              Dados demonstrativos inspirados no contrato real da API •
              atualizados em {data.updatedAt}
            </span>
          </p>
          <em>
            <i /> Fonte operacional
          </em>
        </section>

        <section
          className={`analysis-results ${loading ? "is-loading" : ""}`}
          aria-busy={loading}
        >
          <div className="analysis-kpis">
            <AnalysisKpi
              icon={<CircleDollarSign />}
              label="Total empenhado"
              value={formatMoney(data.totalCommitted)}
              detail={`${data.records.toLocaleString("pt-BR")} registros processados`}
            />
            <AnalysisKpi
              icon={<Building2 />}
              label="Compras com fornecedores locais"
              value={formatMoney(data.localValue)}
              detail="Recursos que permanecem no município"
            />
            <AnalysisKpi
              icon={<Store />}
              label="Participação local"
              value={`${data.localPercentage.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`}
              detail="Percentual sobre o valor empenhado"
              accent
            />
            <AnalysisKpi
              icon={<Users />}
              label="Fornecedores distintos"
              value={String(data.suppliers)}
              detail={`${data.localSuppliers} fornecedores locais`}
            />
          </div>

          <section className="analysis-insight">
            <span>
              <Info />
            </span>
            <div>
              <small>LEITURA RÁPIDA</small>
              <p>
                <b>
                  {data.localPercentage.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  % do valor empenhado
                </b>{" "}
                foi destinado a fornecedores de {data.municipality}. O maior
                volume está em <b>{data.natures[0].name.toLowerCase()}</b>.
              </p>
            </div>
            <Link href="/me">
              Encontrar oportunidades <ExternalLink />
            </Link>
          </section>

          <div className="analysis-chart-grid">
            <AnalysisChartCard
              title="Evolução do valor do seu setor"
              description={`Valor empenhado em ${data.category.toLowerCase()} ao longo de 2026`}
              legend="Meses sem registros permanecem como 'Sem dados'."
            >
              <SectorEvolutionChart data={data} />
            </AnalysisChartCard>
            <AnalysisChartCard
              title="Origem territorial dos fornecedores"
              description="Quantidade de fornecedores por localização"
            >
              <SupplierOriginChart data={data} />
            </AnalysisChartCard>
            <AnalysisChartCard
              title="Valores por natureza da despesa"
              description="Composição do total empenhado na competência"
            >
              <NatureValuesChart data={data} />
            </AnalysisChartCard>
            <AnalysisChartCard
              title="Maiores fornecedores por valor empenhado"
              description="Somente pessoas jurídicas, com identificação protegida"
            >
              <TopSuppliersChart data={data} />
            </AnalysisChartCard>
          </div>

          <section className="analysis-table-card">
            <header>
              <div>
                <h2>Fornecedores identificados</h2>
                <p>Pessoas jurídicas ordenadas pelo valor total empenhado</p>
              </div>
              <span>
                <CheckCircle2 /> CNPJs mascarados
              </span>
            </header>
            <div className="analysis-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>CNPJ</th>
                    <th>Município</th>
                    <th>Origem</th>
                    <th>Empenhos</th>
                    <th>Valor empenhado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSuppliers.map((supplier) => (
                    <tr key={supplier.cnpj}>
                      <td>
                        <b>{supplier.name}</b>
                      </td>
                      <td>{supplier.cnpj}</td>
                      <td>{supplier.city}</td>
                      <td>
                        <em
                          className={
                            supplier.origin === "Local"
                              ? "local"
                              : supplier.origin === "Outros estados"
                                ? "external"
                                : "regional"
                          }
                        >
                          {supplier.origin}
                        </em>
                      </td>
                      <td>{supplier.commitments}</td>
                      <td>
                        <strong>{formatMoney(supplier.value)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="analysis-footnote">
            <Info /> Os valores desta demonstração são mockados. A estrutura dos
            indicadores e gráficos segue o retorno real da API de análise.
          </p>
        </section>
      </main>
    </div>
  );
}

function AnalysisKpi({
  icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <article className={accent ? "accent" : ""}>
      <div>
        <span>{icon}</span>
        <small>{label}</small>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function AnalysisChartCard({
  title,
  description,
  legend,
  children,
}: {
  title: string;
  description: string;
  legend?: string;
  children: ReactNode;
}) {
  return (
    <article className="analysis-chart-card">
      <header>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
      {legend && (
        <small className="chart-legend-note">
          <i /> {legend}
        </small>
      )}
    </article>
  );
}
