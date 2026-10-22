"use client";

import { useCallback, useEffect, useState } from "react";

export interface CompanyCnae {
  codigo: string;
  descricao: string;
  isPrincipal: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  cnpj: string | null;
  municipioIbge?: number | null;
  business: {
    cnpj: string;
    nome_empresa: string;
    porte_empresa: "MEI" | "ME" | "EPP";
    cnaePrincipal?: { codigo: string; descricao: string } | null;
    cnaes?: CompanyCnae[];
    municipio?: { nome: string; uf: string; codigoIbge: number | null } | null;
    url_cartao_cnpj: string;
    url_contrato_social: string;
    url_comprovante_endereco: string;
    url_comprovante_socio: string;
  } | null;
}

export interface CompanyCnaePreferences {
  customCnaeText: string;
  extraKeywords: string[];
  preferredMunicipioIbge: number | null;
}

let cachedProfile: UserProfile | null = null;
let listeners: Array<(profile: UserProfile | null) => void> = [];

function getPrefsStorageKey(cnpj?: string | null) {
  const clean = (cnpj ?? "").replace(/\D/g, "");
  return `compras-abertas:me-cnae-prefs:${clean || "default"}`;
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<CompanyCnaePreferences>({
    customCnaeText: "",
    extraKeywords: [],
    preferredMunicipioIbge: null,
  });

  useEffect(() => {
    const handleUpdate = (data: UserProfile | null) => {
      setProfile(data);
    };

    listeners.push(handleUpdate);

    if (!cachedProfile) {
      fetch("/api/me")
        .then((res) => {
          if (!res.ok) throw new Error("Não autenticado");
          return res.json();
        })
        .then((data: UserProfile) => {
          cachedProfile = data;
          listeners.forEach((l) => l(data));
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      listeners = listeners.filter((l) => l !== handleUpdate);
    };
  }, []);

  const cnpj = profile?.business?.cnpj ?? profile?.cnpj ?? null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(getPrefsStorageKey(cnpj));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CompanyCnaePreferences>;
        setPreferences({
          customCnaeText: parsed.customCnaeText ?? "",
          extraKeywords: Array.isArray(parsed.extraKeywords)
            ? parsed.extraKeywords
            : [],
          preferredMunicipioIbge: parsed.preferredMunicipioIbge ?? null,
        });
      }
    } catch {
      // ignora erro de leitura no localStorage
    }
  }, [cnpj]);

  const savePreferences = useCallback(
    (next: Partial<CompanyCnaePreferences>) => {
      setPreferences((prev) => {
        const merged: CompanyCnaePreferences = {
          ...prev,
          ...next,
        };
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              getPrefsStorageKey(cnpj),
              JSON.stringify(merged),
            );
          } catch {
            // ignora erro de escrita no localStorage
          }
        }
        return merged;
      });
    },
    [cnpj],
  );

  return { profile, loading, error, preferences, savePreferences };
}
