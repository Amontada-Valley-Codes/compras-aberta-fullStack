"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  FileSearch,
  MapPin,
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
import { formatMoney, opportunities } from "@/lib/mock-data";

export function LandingPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [city, setCity] = useState("Todos os municípios");
  const [category, setCategory] = useState("Todas as categorias");
  const [searched, setSearched] = useState(false);

  const visible = useMemo(
    () =>
      opportunities
        .filter(
          (item) =>
            (city === "Todos os municípios" || item.city === city) &&
            (category === "Todas as categorias" || item.category === category),
        )
        .slice(0, 3),
    [city, category],
  );

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
              Oportunidades
            </a>
            <a href="#impacto" onClick={() => setMenuOpen(false)}>
              Transparência
            </a>
            <a href="#municipios" onClick={() => setMenuOpen(false)}>
              Para municípios
            </a>
          </nav>
          <div className="header-actions">
            <Link className="text-link" href="/admin">
              Sou gestor público
            </Link>
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
                <Sparkles size={15} /> OPORTUNIDADES MAIS PERTO DE VOCÊ
              </span>
              <h1>
                Compras públicas
                <br />
                que fortalecem <em>quem é daqui.</em>
              </h1>
              <p>
                Encontre oportunidades, acompanhe investimentos e conecte sua
                empresa ao desenvolvimento dos municípios cearenses.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#oportunidades">
                  Encontrar oportunidades <ArrowRight size={18} />
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
                  <strong>+40 municípios</strong>
                  <br />
                  com dados reunidos em um só lugar
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
                  <span>Visão geral do município</span>
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
                        <b>Bom dia, Amontada</b>
                        <small>Dados atualizados hoje, 08:40</small>
                      </span>
                      <i />
                    </div>
                    <div className="preview-metrics">
                      <article>
                        <small>Compras realizadas</small>
                        <b>R$ 8,4 mi</b>
                        <em>+12,4%</em>
                      </article>
                      <article>
                        <small>Compras locais</small>
                        <b>R$ 3,2 mi</b>
                        <em>+8,7%</em>
                      </article>
                      <article>
                        <small>Fornecedores ME</small>
                        <b>184</b>
                        <em>+16</em>
                      </article>
                    </div>
                    <div className="preview-panels">
                      <article className="preview-chart">
                        <span>
                          <b>Evolução das compras</b>
                          <small>Últimos 6 meses</small>
                        </span>
                        <div className="mini-bars">
                          {[36, 48, 43, 62, 69, 82, 74, 92].map((h, index) => (
                            <i key={index} style={{ height: `${h}%` }} />
                          ))}
                        </div>
                        <div className="mini-axis">
                          <small>Mar</small>
                          <small>Abr</small>
                          <small>Mai</small>
                          <small>Jun</small>
                          <small>Jul</small>
                          <small>Ago</small>
                        </div>
                      </article>
                      <article className="preview-donut-card">
                        <span>
                          <b>Participação local</b>
                          <small>Por origem</small>
                        </span>
                        <div className="css-donut">
                          <b>38%</b>
                          <small>local</small>
                        </div>
                        <p>
                          <i /> Local <b>R$ 3,2 mi</b>
                        </p>
                        <p>
                          <i /> Regional <b>R$ 2,8 mi</b>
                        </p>
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
                  <small>NOVA OPORTUNIDADE</small>
                  <b>Alta compatibilidade</b>
                  <em>96% para seu negócio</em>
                </div>
              </div>
              <div className="floating-card floating-trend">
                <span>
                  <TrendingUp size={18} />
                </span>
                <div>
                  <small>ECONOMIA LOCAL</small>
                  <b>+18,6%</b>
                  <em>nos últimos 6 meses</em>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div className="public-container trust-grid">
            <p>
              <ShieldCheck size={20} /> Dados de fontes públicas oficiais
            </p>
            <div>
              <strong>R$ 184 mi</strong>
              <small>em compras monitoradas</small>
            </div>
            <div>
              <strong>2.840</strong>
              <small>oportunidades mapeadas</small>
            </div>
            <div>
              <strong>1.260</strong>
              <small>negócios locais conectados</small>
            </div>
          </div>
        </section>

        <section className="opportunities-section" id="oportunidades">
          <div className="public-container">
            <div className="section-heading centered">
              <span className="eyebrow">OPORTUNIDADES ABERTAS</span>
              <h2>Seu próximo contrato pode estar aqui.</h2>
              <p>
                Filtre processos abertos e descubra onde sua empresa pode
                participar.
              </p>
            </div>
            <form
              className="opportunity-search"
              onSubmit={(event) => {
                event.preventDefault();
                setSearched(true);
                router.push(
                  `/analise?municipio=${encodeURIComponent(city)}&categoria=${encodeURIComponent(category)}`,
                );
              }}
            >
              <label>
                <MapPin size={18} />
                <span>
                  <small>Município</small>
                  <select
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  >
                    <option>Todos os municípios</option>
                    <option>Amontada</option>
                    <option>Itarema</option>
                    <option>Itapipoca</option>
                    <option>Trairi</option>
                  </select>
                </span>
                <ChevronDown size={16} />
              </label>
              <label>
                <FileSearch size={18} />
                <span>
                  <small>Categoria</small>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option>Todas as categorias</option>
                    <option>Alimentos</option>
                    <option>Tecnologia</option>
                    <option>Equipamentos</option>
                    <option>Serviços</option>
                  </select>
                </span>
                <ChevronDown size={16} />
              </label>
              <button className="button button-primary" type="submit">
                <Search size={18} /> Buscar oportunidades
              </button>
            </form>
            {searched && (
              <p className="search-feedback" role="status">
                {visible.length} oportunidade{visible.length === 1 ? "" : "s"}{" "}
                encontrada{visible.length === 1 ? "" : "s"} com seus filtros.
              </p>
            )}
            <div className="opportunity-grid">
              {visible.map((item) => (
                <article className="opportunity-card" key={item.id}>
                  <div className="opportunity-card-head">
                    <span className="category-icon">
                      <Store size={19} />
                    </span>
                    <span className="status-dot">ABERTA</span>
                    {item.exclusive && (
                      <span className="exclusive-badge">EXCLUSIVA ME</span>
                    )}
                  </div>
                  <small>
                    {item.process} • {item.category}
                  </small>
                  <h3>{item.title}</h3>
                  <p>
                    <MapPin size={15} /> {item.city}, Ceará
                  </p>
                  <dl>
                    <div>
                      <dt>Valor estimado</dt>
                      <dd>{formatMoney(item.value)}</dd>
                    </div>
                    <div>
                      <dt>Prazo</dt>
                      <dd>{item.deadline}</dd>
                    </div>
                  </dl>
                  <div className="opportunity-card-footer">
                    <span>
                      <i style={{ width: `${item.match}%` }} />
                      <small>
                        <b>{item.match}%</b> compatível
                      </small>
                    </span>
                    <Link href={`/me?oportunidade=${item.id}`}>
                      Ver detalhes <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              ))}
              {!visible.length && (
                <div className="empty-search">
                  <Search />
                  <h3>Nenhuma oportunidade encontrada</h3>
                  <p>Tente combinar outros filtros.</p>
                </div>
              )}
            </div>
            <div className="section-cta">
              <Link className="button button-outline" href="/me">
                Ver todas as oportunidades <ArrowRight size={17} />
              </Link>
            </div>
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
                  <small>PARTICIPAÇÃO LOCAL</small>
                  <b>Compras por origem</b>
                </span>
                <em>
                  2026 <ChevronDown />
                </em>
              </div>
              <div className="impact-chart-row">
                <div className="large-css-donut">
                  <span>
                    <b>38,4%</b>
                    <small>fica no município</small>
                  </span>
                </div>
                <div className="impact-legend">
                  <span>
                    <i className="local" />
                    <small>Fornecedores locais</small>
                    <b>R$ 32,8 mi</b>
                  </span>
                  <span>
                    <i className="regional" />
                    <small>Outros municípios do CE</small>
                    <b>R$ 28,2 mi</b>
                  </span>
                  <span>
                    <i className="external" />
                    <small>Outros estados</small>
                    <b>R$ 24,4 mi</b>
                  </span>
                </div>
              </div>
              <div className="impact-highlight">
                <CircleDollarSign />
                <span>
                  <small>Potencial identificado</small>
                  <b>R$ 9,6 mi em categorias com oferta local</b>
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
            <a href="#oportunidades">Oportunidades</a>
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
            <p>Informações demonstrativas baseadas em fontes oficiais.</p>
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
