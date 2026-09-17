"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Building2,
  Check,
  CircleDollarSign,
  ExternalLink,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { PublicFilterSelect } from "@/components/filters/PublicFilterSelect";
import { ExpensesChart, LocalShareChart } from "@/features/public-data/PublicCharts";
import { compactMoney, count, money, percent } from "@/features/public-data/format";
import { landingData, landingYear } from "./landing-mock";

export function LandingPage() {
  const data = landingData;
  const year = landingYear;
  const [menuOpen, setMenuOpen] = useState(false);
  const localSummary = data.local.data?.resumo;

  return (
    <div className="public-site">
      <header className="public-header">
        <div className="public-container header-inner">
          <BrandLogo />
          <nav
            className={menuOpen ? "is-open" : ""}
            aria-label="Navegação principal"
          >
            <a href="#como-funciona" onClick={() => setMenuOpen(false)}>
              Como funciona
            </a>
            <a href="#oportunidades" onClick={() => setMenuOpen(false)}>
              Licitações
            </a>
            <a href="#impacto" onClick={() => setMenuOpen(false)}>
              Transparência
            </a>
            <a href="#municipios" onClick={() => setMenuOpen(false)}>
              Para municípios
            </a>
          </nav>
          <div className="header-actions">
            <Link className="button button-primary button-sm" href="/me">
              Acessar painel <ArrowRight size={16} />
            </Link>
          </div>
          <button
            className="mobile-nav-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Alternar menu"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="public-container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <Sparkles size={15} /> DADOS PÚBLICOS MAIS PERTO DE VOCÊ
              </span>
              <h1>
                Compras públicas
                <br />
                que fortalecem <em>quem é daqui.</em>
              </h1>
              <p>
                Consulte licitações e acompanhe como os recursos públicos
                movimentam os municípios cearenses.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#oportunidades">
                  Explorar licitações <ArrowRight size={18} />
                </a>
                <a className="button button-ghost" href="#como-funciona">
                  Conhecer a plataforma
                </a>
              </div>
              <div className="hero-proof">
                <div className="avatar-stack">
                  <span>AM</span>
                  <span>IT</span>
                  <span>TR</span>
                  <span>AC</span>
                </div>
                <p>
                  <strong>{count(data.municipalities.data?.length)} municípios</strong>
                  <br /> com dados disponíveis para consulta
                </p>
              </div>
            </div>

            <div
              className="hero-visual"
              aria-label="Prévia do painel Compras Abertas"
            >
              <div className="glow-dot dot-one" />
              <div className="glow-dot dot-two" />
              <div className="preview-window">
                <div className="preview-top">
                  <i />
                  <i />
                  <i />
                  <span>Visão geral dos dados públicos</span>
                </div>
                <div className="preview-body">
                  <div className="preview-sidebar">
                    <Image
                      src="/logos/logo-symbol.png"
                      width={27}
                      height={27}
                      alt=""
                    />
                    {[0, 1, 2, 3].map((item) => (
                      <span className={item === 0 ? "active" : ""} key={item} />
                    ))}
                  </div>
                  <div className="preview-content">
                    <div className="preview-heading">
                      <span>
                        <b>Compras públicas do Ceará</b>
                        <small>Prévia com dados demonstrativos</small>
                      </span>
                      <i />
                    </div>
                    <div className="preview-metrics">
                      <article>
                        <small>Licitações com ME</small>
                        <b>{count(data.micro.data?.data.quantidade_licitacoes)}</b>
                      </article>
                      <article>
                        <small>Valor vencido por ME</small>
                        <b>{compactMoney(data.micro.data?.data.valor_total_vencido)}</b>
                      </article>
                      <article>
                        <small>Microempresas</small>
                        <b>{count(data.micro.data?.data.quantidade_microempresas)}</b>
                      </article>
                    </div>
                    <div className="preview-panels">
                      <article className="preview-chart">
                        <span>
                          <b>Dotações por natureza</b>
                          <small>Maiores naturezas registradas</small>
                        </span>
                        {data.expenses.data?.data.length ? <ExpensesChart data={data.expenses.data.data} compactView /> : <p className="public-data-state">Dados indisponíveis.</p>}
                      </article>
                      <article className="preview-donut-card">
                        <span>
                          <b>ME locais em Amontada</b>
                          <small>Valor vencido em {year}</small>
                        </span>
                        {localSummary?.percentual_valor_vencido_me_local != null ? <LocalShareChart percentage={localSummary.percentual_valor_vencido_me_local} size={118} /> : <p className="public-data-state">Sem dados.</p>}
                      </article>
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-card floating-opportunity">
                <span>
                  <BellRing size={18} />
                </span>
                <div>
                  <small>LICITAÇÕES REGISTRADAS</small>
                  <b>{count(data.micro.data?.data.quantidade_licitacoes)} com ME</b>
                  <em>Prévia ilustrativa</em>
                </div>
              </div>
              <div className="floating-card floating-trend">
                <span>
                  <TrendingUp size={18} />
                </span>
                <div>
                  <small>MICROEMPRESAS</small>
                  <b>{count(data.micro.data?.data.quantidade_microempresas)}</b>
                  <em>identificadas na base</em>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="opportunities-section" id="oportunidades">
          <div className="public-container">
            <div className="section-heading centered">
              <span className="eyebrow">LICITAÇÕES REGISTRADAS</span>
              <h2>Explore os dados de compras públicas.</h2>
              <p>Filtre município e natureza da despesa para analisar os registros históricos.</p>
            </div>
            <form
              className="opportunity-search"
              action="/analise"
              method="get"
            >
              <PublicFilterSelect name="municipio" label="Município" allLabel="Todos os municípios" icon="municipality" variant="landing" options={data.municipalities.data?.map((item) => ({ value: item.ibgeCode, label: item.name })) ?? []} />
              <PublicFilterSelect name="natureza" label="Natureza da despesa" allLabel="Todas as naturezas" icon="nature" variant="landing" options={data.expenses.data?.data.map((item) => ({ value: item.codigo_natureza, label: item.nome_natureza })) ?? []} />
              <button className="button button-primary" type="submit">
                <Search size={18} /> Consultar dados
              </button>
            </form>
            {data.municipalities.error && <p className="public-data-state" role="status">Lista de municípios: {data.municipalities.error}</p>}
          </div>
        </section>

        <section className="value-section" id="como-funciona">
          <div className="public-container">
            <div className="section-heading">
              <span className="eyebrow">UMA PLATAFORMA, TRÊS IMPACTOS</span>
              <h2>Transparência que vira desenvolvimento.</h2>
              <p>
                Informar é só o começo. Ajudamos cada pessoa a transformar dados
                em decisões melhores.
              </p>
            </div>
            <div className="value-grid">
              <article>
                <span>
                  <Store />
                </span>
                <small>PARA QUEM EMPREENDE</small>
                <h3>Oportunidades que combinam com seu negócio.</h3>
                <p>
                  Receba recomendações por segmento, município e porte. Menos
                  busca, mais chance de participar.
                </p>
                <ul>
                  <li>
                    <Check /> Alertas personalizados
                  </li>
                  <li>
                    <Check /> Prazos organizados
                  </li>
                  <li>
                    <Check /> Histórico de pagamentos
                  </li>
                </ul>
                <Link href="/me">
                  Conhecer área da empresa <ArrowRight />
                </Link>
              </article>
              <article className="featured">
                <span>
                  <Building2 />
                </span>
                <small>PARA A GESTÃO PÚBLICA</small>
                <h3>Dados claros para comprar melhor.</h3>
                <p>
                  Acompanhe fornecedores, participação local e desempenho das
                  integrações em uma visão executiva.
                </p>
                <ul>
                  <li>
                    <Check /> Indicadores consolidados
                  </li>
                  <li>
                    <Check /> Gestão cadastral
                  </li>
                  <li>
                    <Check /> Trilha de auditoria
                  </li>
                </ul>
                <Link href="/admin">
                  Conhecer área do gestor <ArrowRight />
                </Link>
              </article>
              <article>
                <span>
                  <Users />
                </span>
                <small>PARA TODA A SOCIEDADE</small>
                <h3>O dinheiro público mais fácil de entender.</h3>
                <p>
                  Visualize para onde vão os recursos e como eles movimentam a
                  economia da sua região.
                </p>
                <ul>
                  <li>
                    <Check /> Linguagem acessível
                  </li>
                  <li>
                    <Check /> Fontes identificadas
                  </li>
                  <li>
                    <Check /> Indicadores comparáveis
                  </li>
                </ul>
                <a href="#impacto">
                  Explorar transparência <ArrowRight />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section className="impact-section" id="impacto">
          <div className="public-container impact-grid">
            <div>
              <span className="eyebrow light">
                DADOS QUE CONTAM UMA HISTÓRIA
              </span>
              <h2>
                Quando a compra é local,
                <br />o impacto fica perto.
              </h2>
              <p>
                A plataforma ajuda a enxergar quanto do investimento público
                permanece na região e onde existem oportunidades de ampliar essa
                participação.
              </p>
              <div className="impact-points">
                <span>
                  <BadgeCheck />
                  <b>Fontes oficiais</b>
                  <small>PNCP, TCE e portais municipais</small>
                </span>
                <span>
                  <BarChart3 />
                  <b>Leitura simples</b>
                  <small>Indicadores feitos para decisão</small>
                </span>
              </div>
            </div>
            <div className="impact-card">
              <div className="impact-card-head">
                <span>
                  <small>EXEMPLO: AMONTADA</small>
                  <b>Valor vencido por ME locais</b>
                </span>
                <em>
                  {year}
                </em>
              </div>
              <div className="impact-chart-row">
                <div>{localSummary?.percentual_valor_vencido_me_local != null ? <LocalShareChart percentage={localSummary.percentual_valor_vencido_me_local} /> : <p className="public-data-state">{data.local.error ?? "Sem dados disponíveis."}</p>}</div>
                <div className="impact-legend">
                  <span>
                    <i className="local" />
                    <small>Valor vencido por ME locais</small>
                    <b>{money(localSummary?.valor_vencido_me_local)}</b>
                  </span>
                  <span>
                    <i className="regional" />
                    <small>Valor total vencido</small>
                    <b>{money(localSummary?.valor_total_vencido)}</b>
                  </span>
                </div>
              </div>
              <div className="impact-highlight">
                <CircleDollarSign />
                <span>
                  <small>Licitações com ME local em {year}</small>
                  <b>{count(localSummary?.licitacoes_com_me_local)} de {count(localSummary?.total_licitacoes)} · {percent(localSummary?.percentual_licitacoes_com_me_local)}</b>
                </span>
                <TrendingUp />
              </div>
            </div>
          </div>
        </section>

        <section className="municipality-section" id="municipios">
          <div className="public-container municipality-card">
            <div>
              <span className="eyebrow">PARA MUNICÍPIOS</span>
              <h2>
                Quer transformar dados em política de desenvolvimento local?
              </h2>
              <p>
                Conheça os indicadores da plataforma e identifique oportunidades
                para aproximar a gestão pública dos negócios da sua cidade.
              </p>
            </div>
            <Link className="button button-primary" href="/admin">
              Explorar painel de gestão <ExternalLink size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-container footer-grid">
          <div>
            <BrandLogo inverse />
            <p>
              Transparência que movimenta
              <br />a economia local.
            </p>
          </div>
          <div>
            <b>Plataforma</b>
            <a href="#oportunidades">Licitações</a>
            <a href="#impacto">Transparência</a>
            <a href="#municipios">Municípios</a>
          </div>
          <div>
            <b>Acessos</b>
            <Link href="/me">Área da microempresa</Link>
            <Link href="/admin">Área administrativa</Link>
            <a href="#">Acessibilidade</a>
          </div>
          <div>
            <b>Dados públicos</b>
            <p>Indicadores ilustrativos. O filtro abre a análise com dados da API pública.</p>
            <span className="footer-source">
              <ShieldCheck size={17} /> Atualização contínua
            </span>
          </div>
        </div>
        <div className="public-container footer-bottom">
          <span>© 2026 Compras Abertas</span>
          <span>Feito para fortalecer a economia local.</span>
        </div>
      </footer>
    </div>
  );
}
