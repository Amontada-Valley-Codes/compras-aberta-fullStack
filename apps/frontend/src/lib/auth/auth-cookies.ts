import type { cookies } from "next/headers";
import {
  authCookieOptions,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "./session";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

// Guarda a escolha do "Lembrar-me" para que a renovação do token (a cada
// ~15 min) mantenha o mesmo tipo de cookie escolhido no login.
export const REMEMBER_COOKIE = "remember_me";

export function wantsRemember(store: CookieStore): boolean {
  return store.get(REMEMBER_COOKIE)?.value === "1";
}

/**
 * Com "Lembrar-me": cookies persistentes — a sessão sobrevive ao fechar o
 * navegador enquanto o refresh token (7 dias) for válido.
 * Sem "Lembrar-me": cookies de sessão do navegador (sem maxAge), apagados
 * quando ele é fechado.
 */
export function setAuthCookies(store: CookieStore, tokens: { token: string; refreshToken: string }, remember: boolean) {
  if (remember) {
    store.set(SESSION_COOKIE, tokens.token, { ...authCookieOptions, maxAge: SESSION_MAX_AGE_SECONDS });
    store.set(REFRESH_COOKIE, tokens.refreshToken, { ...authCookieOptions, maxAge: REFRESH_MAX_AGE_SECONDS });
    store.set(REMEMBER_COOKIE, "1", { ...authCookieOptions, maxAge: REFRESH_MAX_AGE_SECONDS });
    return;
  }

  store.set(SESSION_COOKIE, tokens.token, authCookieOptions);
  store.set(REFRESH_COOKIE, tokens.refreshToken, authCookieOptions);
  store.delete(REMEMBER_COOKIE);
}

export function clearAuthCookies(store: CookieStore) {
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(REMEMBER_COOKIE);
}
