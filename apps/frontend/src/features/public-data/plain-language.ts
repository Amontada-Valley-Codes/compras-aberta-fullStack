// Textos em linguagem simples para a parte pública. A API devolve nomes
// oficiais do orçamento, em maiúsculas (ex.: "OUTROS SERVIÇOS DE TERCEIROS –
// PESSOA JURÍDICA"), que confundem quem não trabalha com contabilidade
// pública. Sem "use client": usado tanto em server quanto em client components.

// Nomes oficiais dos elementos de despesa usados pelo TCE/CE. Mantemos estes
// textos na interface para que os gráficos possam ser conferidos diretamente
// na fonte pública, sem trocar a nomenclatura por apelidos.
const NATURE_LABELS: Record<string, string> = {
  "30": "Material de consumo",
  "32": "Material, bem ou serviço para distribuição gratuita",
  "35": "Serviços de consultoria",
  "39": "Outros serviços de terceiros - pessoa jurídica",
  "40": "Serviços de tecnologia da informação e comunicação - pessoa jurídica",
  "51": "Obras e instalações",
  "52": "Equipamentos e material permanente",
};

// Tipos de compra que a fonte de dados cobre. Os gráficos mostram todos eles,
// mesmo quando o município não teve nenhuma licitação naquele tipo.
export const KNOWN_NATURE_CODES = Object.keys(NATURE_LABELS);

const LOWERCASE_WORDS = new Set(["a", "as", "o", "os", "e", "de", "da", "das", "do", "dos", "em", "na", "no"]);

export const ALL_NATURES_LABEL = "todos os tipos de compra";

export function sentenceCase(value: string): string {
  const lower = value.trim().toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

// "SÃO GONÇALO DO AMARANTE" → "São Gonçalo do Amarante"
export function titleCase(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && LOWERCASE_WORDS.has(word) ? word : word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1),
    )
    .join(" ");
}

export function natureLabel(code: string | null | undefined, officialName?: string | null): string {
  if (code && NATURE_LABELS[code]) return NATURE_LABELS[code];
  return officialName?.trim() ? sentenceCase(officialName) : "Não informado";
}

export function officialNatureName(officialName: string | null | undefined): string | undefined {
  return officialName?.trim() ? sentenceCase(officialName) : undefined;
}
