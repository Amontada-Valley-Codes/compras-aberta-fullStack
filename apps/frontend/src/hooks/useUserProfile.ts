"use client";

import { useEffect, useState } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  cnpj: string | null;
  business: {
    cnpj: string;
    nome_empresa: string;
    porte_empresa: "MEI" | "ME" | "EPP";
    url_cartao_cnpj: string;
    url_contrato_social: string;
    url_comprovante_endereco: string;
    url_comprovante_socio: string;
  } | null;
}

let cachedProfile: UserProfile | null = null;
let listeners: Array<(profile: UserProfile | null) => void> = [];

export function useUserProfile(options?: { skip?: boolean }) {
  const skip = options?.skip ?? false;
  const [profile, setProfile] = useState<UserProfile | null>(skip ? null : cachedProfile);
  const [loading, setLoading] = useState(!cachedProfile && !skip);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }
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
  }, [skip]);

  return { profile, loading, error };
}
