import Link from "next/link";
import { count, money, percent } from "@/features/public-data/format";
import { natureLabel } from "@/features/public-data/plain-language";
import { maskCnpj, type SupplierRow } from "./gestor-domain";
import { OriginTag } from "./GestorStates";

// Tabela de fornecedores (visão geral e página de fornecedores). Sem estado:
// a ordenação e os filtros, quando existem, ficam em quem a usa.
export function GestorSuppliersTable({
  rows,
  query,
  showCategory = false,
  startRank = 1,
}: {
  rows: SupplierRow[];
  // Recorte atual (ano/município) repassado ao link do fornecedor.
  query: string;
  showCategory?: boolean;
  startRank?: number;
}) {
  return (
    <div className="gs-table-scroll">
      <table className="gs-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Empresa</th>
            <th scope="col">CNPJ</th>
            {showCategory && <th scope="col">Categoria principal</th>}
            <th scope="col" className="is-number">Valor homologado</th>
            <th scope="col" className="is-number">% do total</th>
            <th scope="col">Origem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((supplier, index) => (
            <tr key={supplier.cnpj}>
              <td className="gs-rank">{supplier.rank || startRank + index}</td>
              <td>
                <Link className="gs-company gs-company-link" href={`/gestor/fornecedores/${supplier.cnpj}?${query}`} title={`Ver histórico de ${supplier.name}`}>
                  {supplier.name}
                </Link>
                <small className="gs-company-meta">
                  {supplier.size ?? "Porte não informado"} • {count(supplier.bids)} {supplier.bids === 1 ? "licitação" : "licitações"}
                </small>
              </td>
              <td className="gs-cnpj">{maskCnpj(supplier.cnpj)}</td>
              {showCategory && <td>{supplier.natureCode ? natureLabel(supplier.natureCode, supplier.natureName) : "—"}</td>}
              <td className="is-number"><strong>{money(supplier.total)}</strong></td>
              <td className="is-number">
                <span className="gs-share">
                  <span>{percent(supplier.share)}</span>
                  <i aria-hidden="true"><s style={{ width: `${Math.min(100, supplier.share)}%` }} /></i>
                </span>
              </td>
              <td><OriginTag origin={supplier.origin} city={supplier.city} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
