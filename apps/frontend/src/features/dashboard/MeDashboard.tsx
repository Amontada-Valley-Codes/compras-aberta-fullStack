"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  ExternalLink,
  Heart,
  LayoutDashboard,
  MapPin,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { OpportunityDonut, SpendingAreaChart } from "./DashboardCharts";
import { formatMoney, opportunities, type Opportunity } from "@/lib/mock-data";
import { useUserProfile } from "@/hooks/useUserProfile";
import { openDocumentInNewTab } from "@/utils/openInNewTab";

const navItems: NavItem[] = [
  { id: "overview", label: "Visão geral", icon: <LayoutDashboard size={19} /> },
  {
    id: "opportunities",
    label: "Oportunidades",
    icon: <Sparkles size={19} />,
    badge: "12",
  },
  {
    id: "favorites",
    label: "Favoritos",
    icon: <Bookmark size={19} />,
    badge: "3",
  },
  { id: "documents", label: "Documentos", icon: <FileText size={19} /> },
  { id: "alerts", label: "Alertas", icon: <Bell size={19} />, badge: "2" },
  { id: "profile", label: "Perfil da empresa", icon: <Building2 size={19} /> },
];

export function MeDashboard({
  initialOpportunityId,
}: {
  initialOpportunityId?: string;
}) {
  const initialOpportunity = opportunities.find(
    (item) => item.id === initialOpportunityId,
  );
  const [active, setActive] = useState(
    initialOpportunity ? "opportunities" : "overview",
  );
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(initialOpportunity ?? null);
  const [favorites, setFavorites] = useState(
    () => new Set(["OP-2048", "OP-2071", "OP-2092"]),
  );
  const items = useMemo(
    () =>
      navItems.map((item) =>
        item.id === "favorites"
          ? { ...item, badge: String(favorites.size) }
          : item,
      ),
    [favorites.size],
  );

  const navigate = (id: string) => {
    setActive(id);
    setSelectedOpportunity(null);
  };

  const openOpportunity = (item: Opportunity) => {
    setSelectedOpportunity(item);
    setActive("opportunities");
  };

  return (
    <AppShell role="me" active={active} onNavigate={navigate} items={items}>
      {active === "overview" && (
        <MeOverview
          onNavigate={navigate}
          onOpenOpportunity={openOpportunity}
          favoriteCount={favorites.size}
        />
      )}
      {active === "opportunities" && (
        <Opportunities
          favorites={favorites}
          setFavorites={setFavorites}
          selected={selectedOpportunity}
          onSelect={setSelectedOpportunity}
        />
      )}
      {active === "favorites" && (
        <Opportunities
          favorites={favorites}
          setFavorites={setFavorites}
          selected={selectedOpportunity}
          onSelect={setSelectedOpportunity}
          favoritesOnly
        />
      )}
      {active === "documents" && <Documents />}
      {active === "alerts" && <Alerts />}
      {active === "profile" && <CompanyProfile />}
    </AppShell>
  );
}

function MeOverview({
  onNavigate,
  onOpenOpportunity,
  favoriteCount,
}: {
  onNavigate: (id: string) => void;
  onOpenOpportunity: (item: Opportunity) => void;
  favoriteCount: number;
}) {
  const { profile } = useUserProfile();

  const userFirstName = profile?.name?.trim().split(" ")[0] || "Empresário(a)";
  const companyName = profile?.business?.nome_empresa || "sua empresa";

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="PAINEL DA MICROEMPRESA"
        title={`Bom dia, ${userFirstName}!`}
        description={`Veja o que merece sua atenção hoje e encontre novas oportunidades para ${companyName}.`}
        action={
          <button
            className="ds-button primary"
            onClick={() => onNavigate("opportunities")}
          >
            Explorar oportunidades <ArrowRight size={17} />
          </button>
        }
      />

      <section className="company-status-banner">
        <span>
          <CheckCircle2 />
        </span>
        <div>
          <small>SITUAÇÃO CADASTRAL</small>
          <h2>Sua empresa está pronta para participar</h2>
          <p>Cadastro aprovado e documentação em dia.</p>
        </div>
        <button onClick={() => onNavigate("documents")}>
          Ver documentos <ChevronRight />
        </button>
      </section>

      <section className="metric-grid">
        <Metric
          icon={<Sparkles />}
          label="Oportunidades compatíveis"
          value="12"
          detail="4 novas nesta semana"
          trend="+18%"
        />
        <Metric
          icon={<Bookmark />}
          label="Oportunidades salvas"
          value={String(favoriteCount)}
          detail="1 encerra em breve"
          tone="gold"
        />
        <Metric
          icon={<TrendingUp />}
          label="Mercado no seu segmento"
          value="R$ 2,8 mi"
          detail="nos últimos 6 meses"
          trend="+12,4%"
        />
        <Metric
          icon={<Clock3 />}
          label="Prazo médio de pagamento"
          value="23 dias"
          detail="média dos municípios"
        />
      </section>

      <section className="dashboard-grid two-thirds">
        <article className="dashboard-card chart-card">
          <CardHeader
            title="Movimentação no seu segmento"
            subtitle="Valores pagos por municípios monitorados"
            action={<button>6 meses ⌄</button>}
          />
          <SpendingAreaChart />
        </article>
        <article className="dashboard-card chart-card">
          <CardHeader
            title="Oportunidades por categoria"
            subtitle="Processos abertos agora"
          />
          <OpportunityDonut />
        </article>
      </section>

      <section className="dashboard-card recommendation-card">
        <CardHeader
          title="Recomendadas para sua empresa"
          subtitle="Selecionadas pelo seu CNAE, localização e histórico de interesse"
          action={
            <button onClick={() => onNavigate("opportunities")}>
              Ver todas <ArrowRight />
            </button>
          }
        />
        <div className="recommendation-list">
          {opportunities.slice(0, 3).map((item) => (
            <button key={item.id} onClick={() => onOpenOpportunity(item)}>
              <span className="match-ring">
                <b>{item.match}%</b>
                <small>match</small>
              </span>
              <span className="recommendation-info">
                <small>
                  {item.process} • {item.category}
                </small>
                <strong>{item.title}</strong>
                <em>
                  <MapPin size={14} /> {item.city} <i />{" "}
                  {item.exclusive ? "Exclusiva ME" : "Ampla participação"}
                </em>
              </span>
              <span className="recommendation-value">
                <small>Valor estimado</small>
                <strong>{formatMoney(item.value)}</strong>
                <em className={item.daysLeft <= 3 ? "urgent" : ""}>
                  <CalendarClock size={14} /> {item.daysLeft} dias restantes
                </em>
              </span>
              <ChevronRight className="row-arrow" />
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-grid halves bottom-grid">
        <article className="dashboard-card compact-card">
          <CardHeader
            title="Municípios em destaque"
            subtitle="Maior demanda no seu segmento"
            action={<button>Ver análise</button>}
          />
          {[
            ["Amontada", "R$ 684 mil", "12 oportunidades", 92],
            ["Itapipoca", "R$ 512 mil", "8 oportunidades", 74],
            ["Itarema", "R$ 396 mil", "5 oportunidades", 58],
          ].map((city, index) => (
            <div className="ranking-row" key={city[0]}>
              <span>{index + 1}</span>
              <div>
                <b>{city[0]}</b>
                <small>{city[2]}</small>
                <i>
                  <em style={{ width: `${city[3]}%` }} />
                </i>
              </div>
              <strong>{city[1]}</strong>
            </div>
          ))}
        </article>
        <article className="dashboard-card compact-card">
          <CardHeader
            title="Atualizações recentes"
            subtitle="Alertas e movimentações importantes"
            action={
              <button onClick={() => onNavigate("alerts")}>Ver todas</button>
            }
          />
          <div className="activity-list">
            <span>
              <i className="blue">
                <Bell />
              </i>
              <div>
                <b>Nova oportunidade compatível</b>
                <small>Manutenção de computadores em Itarema</small>
              </div>
              <em>18 min</em>
            </span>
            <span>
              <i className="gold">
                <Clock3 />
              </i>
              <div>
                <b>Prazo terminando</b>
                <small>Alimentação escolar encerra em 3 dias</small>
              </div>
              <em>2 h</em>
            </span>
            <span>
              <i className="green">
                <FileCheck2 />
              </i>
              <div>
                <b>Documentação validada</b>
                <small>Cartão CNPJ aprovado pela equipe</small>
              </div>
              <em>ontem</em>
            </span>
          </div>
        </article>
      </section>
    </div>
  );
}

function Opportunities({
  favorites,
  setFavorites,
  selected,
  onSelect,
  favoritesOnly = false,
}: {
  favorites: Set<string>;
  setFavorites: (next: Set<string>) => void;
  selected: Opportunity | null;
  onSelect: (item: Opportunity | null) => void;
  favoritesOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Todos");
  const list = useMemo(
    () =>
      opportunities.filter(
        (item) =>
          (!favoritesOnly || favorites.has(item.id)) &&
          (city === "Todos" || item.city === city) &&
          `${item.title} ${item.process} ${item.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, city, favorites, favoritesOnly],
  );
  const toggleFavorite = (id: string) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFavorites(next);
  };

  if (selected) {
    return (
      <OpportunityDetail
        opportunity={selected}
        isFavorite={favorites.has(selected.id)}
        onBack={() => onSelect(null)}
        onToggleFavorite={() => toggleFavorite(selected.id)}
      />
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="INTELIGÊNCIA DE OPORTUNIDADES"
        title={
          favoritesOnly
            ? "Oportunidades salvas"
            : "Encontre seu próximo contrato"
        }
        description={
          favoritesOnly
            ? "Acompanhe em um só lugar os processos que você marcou para avaliar."
            : "Recomendações priorizadas para o perfil e a região da sua empresa."
        }
        action={
          !favoritesOnly ? (
            <button className="ds-button secondary">
              <Bell size={17} /> Criar alerta
            </button>
          ) : undefined
        }
      />
      <section className="dashboard-card filter-bar">
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por objeto, processo ou categoria"
          />
        </label>
        <select value={city} onChange={(event) => setCity(event.target.value)}>
          <option>Todos</option>
          <option>Amontada</option>
          <option>Itarema</option>
          <option>Itapipoca</option>
          <option>Trairi</option>
        </select>
        <button className="filter-button">
          <SlidersHorizontal /> Mais filtros
        </button>
      </section>
      <div className="result-summary">
        <p>
          <b>{list.length} oportunidades</b> encontradas
        </p>
        <span>
          Ordenar por{" "}
          <select>
            <option>Maior compatibilidade</option>
            <option>Menor prazo</option>
            <option>Maior valor</option>
          </select>
        </span>
      </div>
      <section className="opportunity-results">
        {list.map((item) => (
          <article key={item.id}>
            <div className="result-head">
              <span className="match-pill">
                <Sparkles /> {item.match}% compatível
              </span>
              <button
                className={favorites.has(item.id) ? "favorited" : ""}
                onClick={() => toggleFavorite(item.id)}
                aria-label={
                  favorites.has(item.id)
                    ? `Remover ${item.title} dos favoritos`
                    : `Adicionar ${item.title} aos favoritos`
                }
              >
                <Heart
                  fill={favorites.has(item.id) ? "currentColor" : "none"}
                />
              </button>
            </div>
            <small>
              {item.process} • {item.category}
            </small>
            <h2>{item.title}</h2>
            <p>
              <MapPin /> {item.city}, CE
            </p>
            <div className="reason-list">
              <span>
                <Check /> CNAE relacionado
              </span>
              {item.exclusive && (
                <span>
                  <Check /> Exclusiva para ME
                </span>
              )}
              <span>
                <Check /> Região de interesse
              </span>
            </div>
            <footer>
              <span>
                <small>Valor estimado</small>
                <b>{formatMoney(item.value)}</b>
              </span>
              <span>
                <small>Prazo final</small>
                <b className={item.daysLeft <= 3 ? "deadline" : ""}>
                  {item.deadline}
                </b>
              </span>
              <button
                className="ds-button primary"
                onClick={() => onSelect(item)}
              >
                Ver detalhes <ArrowRight />
              </button>
            </footer>
          </article>
        ))}
      </section>
      {!list.length && (
        <section className="dashboard-card empty-state">
          <Search />
          <h2>Nenhuma oportunidade por aqui</h2>
          <p>Ajuste a busca ou volte à lista completa.</p>
        </section>
      )}
    </div>
  );
}

function OpportunityDetail({
  opportunity,
  isFavorite,
  onBack,
  onToggleFavorite,
}: {
  opportunity: Opportunity;
  isFavorite: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div className="dashboard-page opportunity-detail-page">
      <button className="detail-back" onClick={onBack}>
        <ArrowLeft /> Voltar para oportunidades
      </button>
      <PageHeading
        eyebrow={`${opportunity.process} • ${opportunity.category.toUpperCase()}`}
        title={opportunity.title}
        description={`${opportunity.city}/CE • Publicada pela Prefeitura Municipal`}
        action={
          <button
            className={`ds-button secondary detail-favorite ${isFavorite ? "is-favorite" : ""}`}
            onClick={onToggleFavorite}
          >
            <Heart fill={isFavorite ? "currentColor" : "none"} />
            {isFavorite ? "Salva nos favoritos" : "Salvar oportunidade"}
          </button>
        }
      />

      <section className="detail-summary-banner">
        <div className="detail-match">
          <span>
            <b>{opportunity.match}%</b>
            <small>aderência</small>
          </span>
          <div>
            <small>COMPATIBILIDADE COM SUA EMPRESA</small>
            <h2>Alta compatibilidade</h2>
            <p>
              CNAE, porte e região combinam com o perfil do Mercado São José.
            </p>
          </div>
        </div>
        <div className="detail-deadline">
          <CalendarClock />
          <span>
            <small>PRAZO PARA PARTICIPAR</small>
            <b>{opportunity.deadline}</b>
            <em>{opportunity.daysLeft} dias restantes</em>
          </span>
        </div>
      </section>

      <div className="detail-layout">
        <div className="detail-main-column">
          <section className="dashboard-card detail-card">
            <header>
              <span>
                <FileText />
              </span>
              <div>
                <h2>Sobre a oportunidade</h2>
                <p>Principais informações do processo</p>
              </div>
            </header>
            <dl className="detail-data-grid">
              <div>
                <dt>Órgão comprador</dt>
                <dd>Prefeitura Municipal de {opportunity.city}</dd>
              </div>
              <div>
                <dt>Modalidade</dt>
                <dd>Pregão eletrônico</dd>
              </div>
              <div>
                <dt>Valor estimado</dt>
                <dd>{formatMoney(opportunity.value)}</dd>
              </div>
              <div>
                <dt>Critério de julgamento</dt>
                <dd>Menor preço por item</dd>
              </div>
              <div>
                <dt>Participação</dt>
                <dd>
                  {opportunity.exclusive
                    ? "Exclusiva para ME/EPP"
                    : "Ampla participação"}
                </dd>
              </div>
              <div>
                <dt>Forma de disputa</dt>
                <dd>Aberta</dd>
              </div>
            </dl>
            <div className="detail-object">
              <small>OBJETO DA CONTRATAÇÃO</small>
              <p>
                {opportunity.title}, conforme quantidades, especificações e
                condições estabelecidas no edital e em seus anexos.
              </p>
            </div>
          </section>

          <section className="dashboard-card detail-card">
            <header>
              <span>
                <ShieldCheck />
              </span>
              <div>
                <h2>Requisitos principais</h2>
                <p>Confira o que sua empresa precisa apresentar</p>
              </div>
            </header>
            <ul className="requirement-list">
              <li>
                <Check />
                <span>
                  <b>Regularidade fiscal e trabalhista</b>
                  <small>Certidões válidas no momento da habilitação.</small>
                </span>
                <em>Pronto</em>
              </li>
              <li>
                <Check />
                <span>
                  <b>CNAE compatível com o objeto</b>
                  <small>Seu CNAE principal apresenta compatibilidade.</small>
                </span>
                <em>Compatível</em>
              </li>
              <li>
                <FileCheck2 />
                <span>
                  <b>Qualificação técnica</b>
                  <small>
                    Atestados de capacidade conforme exigência do edital.
                  </small>
                </span>
                <em className="review">Revisar</em>
              </li>
            </ul>
          </section>

          <section className="official-process-note">
            <InfoIcon />
            <div>
              <h2>Participação acontece no portal oficial</h2>
              <p>
                O Compras Abertas ajuda você a encontrar e avaliar
                oportunidades. O envio da proposta deve ser realizado no portal
                indicado pelo órgão.
              </p>
            </div>
            <a
              className="ds-button primary"
              href="https://pncp.gov.br"
              target="_blank"
              rel="noreferrer"
            >
              Acessar publicação oficial <ExternalLink />
            </a>
          </section>
        </div>

        <aside className="detail-sidebar">
          <section className="dashboard-card deadline-card">
            <span className="status-open">
              <i /> OPORTUNIDADE ABERTA
            </span>
            <h2>Prepare sua participação</h2>
            <p>Use este resumo para organizar os próximos passos.</p>
            <div>
              <CalendarDays />
              <span>
                <small>Abertura da sessão</small>
                <b>{opportunity.deadline}</b>
              </span>
            </div>
            <div>
              <CircleMoney />
              <span>
                <small>Valor estimado</small>
                <b>{formatMoney(opportunity.value)}</b>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <small>Município</small>
                <b>{opportunity.city}/CE</b>
              </span>
            </div>
            <a
              className="ds-button primary"
              href="https://pncp.gov.br"
              target="_blank"
              rel="noreferrer"
            >
              Ir para o portal oficial <ExternalLink />
            </a>
          </section>
          <section className="dashboard-card detail-timeline">
            <h2>Histórico do processo</h2>
            <span className="active">
              <i />
              <div>
                <b>Edital publicado</b>
                <small>19 ago, 08:40</small>
              </div>
            </span>
            <span className="active">
              <i />
              <div>
                <b>Documentos consolidados</b>
                <small>21 ago, 14:12</small>
              </div>
            </span>
            <span>
              <i />
              <div>
                <b>Abertura da sessão</b>
                <small>{opportunity.deadline}</small>
              </div>
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoIcon() {
  return <span className="detail-info-icon">i</span>;
}

function CircleMoney() {
  return <span className="detail-money-icon">R$</span>;
}

function Documents() {
  const [uploaded, setUploaded] = useState(false);
  const docs = [
    ["Cartão CNPJ", "Aprovado", "Atualizado em 30/07/2026"],
    ["Contrato social", "Aprovado", "Atualizado em 30/07/2026"],
    ["Comprovante de endereço", "Aprovado", "Atualizado em 29/07/2026"],
    [
      "Identificação do responsável",
      uploaded ? "Em análise" : "Aprovado",
      uploaded ? "Enviado agora" : "Atualizado em 29/07/2026",
    ],
  ];
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="CADASTRO E CONFORMIDADE"
        title="Documentos da empresa"
        description="Mantenha sua documentação válida para receber recomendações e participar de oportunidades."
      />
      <section className="document-overview">
        <CheckCircle2 />
        <div>
          <small>SITUAÇÃO ATUAL</small>
          <h2>
            {uploaded ? "1 documento em análise" : "Documentação completa"}
          </h2>
          <p>
            {uploaded
              ? "Avisaremos quando a nova versão for validada."
              : "Todos os 4 documentos obrigatórios foram aprovados."}
          </p>
        </div>
        <span>
          {uploaded ? "75%" : "100%"}
          <i>
            <em style={{ width: uploaded ? "75%" : "100%" }} />
          </i>
        </span>
      </section>
      <section className="document-list dashboard-card">
        <CardHeader
          title="Documentos obrigatórios"
          subtitle="PDF, JPG ou PNG • até 10 MB por arquivo"
        />
        {docs.map((doc) => (
          <article key={doc[0]}>
            <span className="doc-icon">
              <FileText />
            </span>
            <div>
              <b>{doc[0]}</b>
              <small>{doc[2]} • 420 KB</small>
            </div>
            <em className={doc[1] === "Aprovado" ? "approved" : "analysis"}>
              {doc[1]}
            </em>
            <button
              type="button"
              onClick={() => {
                const docName = doc[0];
                const sampleDocUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%230f172a"/><rect x="40" y="40" width="720" height="520" rx="12" fill="%231e293b" stroke="%233b82f6" stroke-width="2"/><text x="400" y="150" font-size="24" font-weight="bold" fill="%2338bdf8" text-anchor="middle">DOCUMENTO DA MICROEMPRESA</text><text x="400" y="210" font-size="22" font-weight="bold" fill="%23f8fafc" text-anchor="middle">${encodeURIComponent(docName.toUpperCase())}</text><line x1="100" y1="250" x2="700" y2="250" stroke="%23334155" stroke-width="2"/><text x="400" y="310" font-size="16" fill="%23cbd5e1" text-anchor="middle">Status: ${encodeURIComponent(doc[1])}</text><text x="400" y="350" font-size="14" fill="%2394a3b8" text-anchor="middle">${encodeURIComponent(doc[2])}</text><rect x="250" y="420" width="300" height="50" rx="8" fill="%2316a34a"/><text x="400" y="452" font-size="16" font-weight="bold" fill="%23ffffff" text-anchor="middle">DOCUMENTO CONFERIDO</text></svg>`;
                openDocumentInNewTab(sampleDocUrl, docName);
              }}
            >
              Visualizar
            </button>
            <label>
              <Upload /> Substituir
              <input type="file" onChange={() => setUploaded(true)} />
            </label>
          </article>
        ))}
      </section>
    </div>
  );
}

function Alerts() {
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow="ACOMPANHAMENTO"
        title="Alertas e notificações"
        description="Nada importante passa despercebido: acompanhe prazos, novidades e atualizações cadastrais."
      />
      <section className="dashboard-grid alert-layout">
        <div className="dashboard-card activity-list large">
          <span>
            <i className="gold">
              <Clock3 />
            </i>
            <div>
              <em>NÃO LIDA • PRAZO</em>
              <b>Oportunidade encerra em 3 dias</b>
              <small>
                Aquisição de gêneros para alimentação escolar • Amontada
              </small>
            </div>
            <button>Ver oportunidade</button>
          </span>
          <span>
            <i className="blue">
              <Sparkles />
            </i>
            <div>
              <em>NÃO LIDA • OPORTUNIDADE</em>
              <b>Novo processo com 91% de compatibilidade</b>
              <small>
                Manutenção de computadores e rede municipal • Itarema
              </small>
            </div>
            <button>Ver oportunidade</button>
          </span>
          <span>
            <i className="green">
              <FileCheck2 />
            </i>
            <div>
              <em>DOCUMENTO</em>
              <b>Seu cartão CNPJ foi validado</b>
              <small>A equipe concluiu a análise ontem, às 16:40</small>
            </div>
            <button>Ver documentos</button>
          </span>
        </div>
        <aside className="dashboard-card alert-settings">
          <h2>Preferências</h2>
          <p>Você recebe alertas para:</p>
          {[
            "Alimentos e bebidas",
            "Amontada + 80 km",
            "Oportunidades exclusivas ME",
          ].map((item) => (
            <span key={item}>
              <Check /> {item}
            </span>
          ))}
          <button className="ds-button secondary">Editar preferências</button>
        </aside>
      </section>
    </div>
  );
}

function CompanyProfile() {
  const [saved, setSaved] = useState(false);
  const { profile } = useUserProfile();

  const cnpj = profile?.business?.cnpj || profile?.cnpj || "";
  const nomeEmpresa = profile?.business?.nome_empresa || "";
  const email = profile?.email || "";
  const porte = profile?.business?.porte_empresa || "ME";
  const responsavel = profile?.name || "";

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow={`DADOS DA MICROEMPRESA (${porte})`}
        title="Perfil empresarial"
        description="Dados completos melhoram a qualidade das recomendações."
        action={
          <button className="ds-button primary" onClick={() => setSaved(true)}>
            {saved ? <Check /> : null}
            {saved ? "Alterações salvas" : "Salvar alterações"}
          </button>
        }
      />
      <form className="profile-grid" onSubmit={(e) => e.preventDefault()}>
        <section className="dashboard-card">
          <h2>Identificação</h2>
          <label>
            CNPJ
            <input key={`cnpj-${cnpj}`} defaultValue={cnpj} readOnly />
          </label>
          <label>
            Razão social / Nome da empresa
            <input key={`nome-${nomeEmpresa}`} defaultValue={nomeEmpresa} />
          </label>
          <label>
            Porte da empresa
            <input key={`porte-${porte}`} defaultValue={porte} readOnly />
          </label>
          <label>
            Responsável legal
            <input key={`resp-${responsavel}`} defaultValue={responsavel} />
          </label>
        </section>
        <section className="dashboard-card">
          <h2>Contato e atuação</h2>
          <label>
            E-mail de contato
            <input key={`email-${email}`} defaultValue={email} />
          </label>
          <label>
            Telefone
            <input defaultValue="(88) 99912-3456" />
          </label>
          <label>
            Município
            <input defaultValue="Amontada — CE" />
          </label>
          <label>
            Segmentos de interesse
            <input defaultValue="Alimentos, Material de consumo" />
          </label>
        </section>
      </form>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="dashboard-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  trend?: string;
  tone?: string;
}) {
  return (
    <article className={`metric-card ${tone ?? ""}`}>
      <div className="metric-top">
        <span>{icon}</span>
        {trend && <em>{trend}</em>}
      </div>
      <small>{label}</small>
      <b>{value}</b>
      <p>{detail}</p>
    </article>
  );
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="card-header">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export { PageHeading, Metric, CardHeader };
