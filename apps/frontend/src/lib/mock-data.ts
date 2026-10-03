export type Opportunity = {
  id: string;
  process: string;
  title: string;
  city: string;
  category: string;
  value: number;
  deadline: string;
  daysLeft: number;
  match: number;
  exclusive: boolean;
};

export type CompanyRequest = {
  id: string;
  initials: string;
  name: string;
  legalName: string;
  cnpj: string;
  city: string;
  segment: string;
  sentAt: string;
  documents: string;
  status: "Em análise" | "Pendente" | "Aprovada" | "Recusada";
  docsUrls?: {
    cartao_cnpj: string;
    contrato_social: string;
    comprovante_endereco: string;
    comprovante_socio: string;
  } | null;
};

export const opportunities: Opportunity[] = [
  {
    id: "OP-2048",
    process: "PE 024/2026",
    title: "Aquisição de gêneros para alimentação escolar",
    city: "Amontada",
    category: "Alimentos",
    value: 1248500,
    deadline: "03 set, 09:00",
    daysLeft: 3,
    match: 96,
    exclusive: true,
  },
  {
    id: "OP-2071",
    process: "DE 041/2026",
    title: "Manutenção de computadores e rede municipal",
    city: "Itarema",
    category: "Tecnologia",
    value: 184200,
    deadline: "06 set, 10:30",
    daysLeft: 6,
    match: 91,
    exclusive: true,
  },
  {
    id: "OP-2092",
    process: "PE 118/2026",
    title: "Equipamentos para unidades básicas de saúde",
    city: "Itapipoca",
    category: "Equipamentos",
    value: 2860000,
    deadline: "09 set, 14:00",
    daysLeft: 9,
    match: 87,
    exclusive: false,
  },
  {
    id: "OP-2110",
    process: "CE 011/2026",
    title: "Serviços continuados de manutenção predial",
    city: "Trairi",
    category: "Serviços",
    value: 1960000,
    deadline: "12 set, 09:30",
    daysLeft: 12,
    match: 82,
    exclusive: false,
  },
];

export const companyRequests: CompanyRequest[] = [
  {
    id: "ME-0284",
    initials: "OL",
    name: "Office Litoral",
    legalName: "Office Litoral Suprimentos Ltda.",
    cnpj: "22.101.884/0001-17",
    city: "Itapipoca",
    segment: "Equipamentos",
    sentAt: "Hoje, 08:42",
    documents: "4 de 4",
    status: "Em análise",
  },
  {
    id: "ME-0279",
    initials: "SC",
    name: "Servlimp Ceará",
    legalName: "Servlimp Ceará Ltda.",
    cnpj: "19.700.332/0001-04",
    city: "Trairi",
    segment: "Serviços",
    sentAt: "Ontem, 16:18",
    documents: "3 de 4",
    status: "Pendente",
  },
  {
    id: "ME-0273",
    initials: "NT",
    name: "Norte Tecnologia",
    legalName: "Norte Tecnologia e Sistemas Ltda.",
    cnpj: "31.402.765/0001-82",
    city: "Acaraú",
    segment: "Tecnologia",
    sentAt: "18 ago, 11:05",
    documents: "4 de 4",
    status: "Em análise",
  },
  {
    id: "ME-0268",
    initials: "TS",
    name: "Trairi Suprimentos",
    legalName: "Trairi Comércio de Suprimentos Ltda.",
    cnpj: "17.290.118/0001-60",
    city: "Trairi",
    segment: "Alimentos",
    sentAt: "17 ago, 14:30",
    documents: "4 de 4",
    status: "Aprovada",
  },
];

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export const compactMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
