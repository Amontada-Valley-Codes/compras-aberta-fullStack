"use client";

import { useEffect, useState } from "react";
import { getMunicipalitySummaries, type MunicipalitySummary } from "./gestor-publico-data";

export function useMunicipalitySummaries(year: number) {
  const [data, setData] = useState<MunicipalitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getMunicipalitySummaries(year).then((rows) => {
      if (active) setData(rows);
    }).catch(() => {
      if (active) setError("Não foi possível carregar os pagamentos dos municípios pela API.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year]);
  return { data, loading, error };
}
