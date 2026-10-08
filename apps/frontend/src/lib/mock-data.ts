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
