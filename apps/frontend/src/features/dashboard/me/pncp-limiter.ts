/**
 * Rate limiter e cliente HTTP resiliente para a API pública do PNCP (Portal Nacional de Contratações Públicas).
 *
 * O PNCP impõe limites estritos de taxa por IP (~14 requisições em rajada, seguido de HTTP 429 por ~20-25s).
 * Este módulo centraliza:
 * 1. Concorrência máxima controlada (2 requisições simultâneas).
 * 2. Intervalo mínimo entre requisições (250ms de espaçamento).
 * 3. Pausa global de 22s em caso de HTTP 429 para evitar suspensão contínua do IP.
 * 4. Timeout seguro de 12s para nunca travar a fila do Node.js.
 */

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta";
const DEFAULT_TIMEOUT_MS = 12_000;
const MIN_INTERVAL_MS = 250;
const MAX_CONCURRENT = 2;
const PAUSE_ON_429_MS = 22_000;

let activeRequests = 0;
let lastRequestTime = 0;
let pausedUntil = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fila sequencial de controle de concorrência e ritmo
let queueTail: Promise<void> = Promise.resolve();

async function acquireSlot(): Promise<void> {
  const ourTurn = queueTail.then(async () => {
    for (;;) {
      const now = Date.now();

      // Se o PNCP retornou 429 recentemente, aguarda o término do bloqueio
      if (now < pausedUntil) {
        await wait(pausedUntil - now);
        continue;
      }

      // Aguarda espaçamento mínimo desde a última requisição
      const elapsedSinceLast = now - lastRequestTime;
      if (elapsedSinceLast < MIN_INTERVAL_MS) {
        await wait(MIN_INTERVAL_MS - elapsedSinceLast);
        continue;
      }

      // Limita concorrência ativa
      if (activeRequests >= MAX_CONCURRENT) {
        await wait(100);
        continue;
      }

      activeRequests += 1;
      lastRequestTime = Date.now();
      return;
    }
  });

  queueTail = ourTurn.catch(() => undefined);
  return ourTurn;
}

function releaseSlot(): void {
  activeRequests = Math.max(0, activeRequests - 1);
}

export interface PncpFetchOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  maxAttempts?: number;
}

export interface PncpFetchResponse<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Executa uma requisição HTTP para a API do PNCP com controle global de taxa,
 * backoff inteligente em 429 e proteção contra travamento.
 */
export async function fetchPncpJson<T>(
  urlOrPath: string,
  options: PncpFetchOptions = {},
): Promise<PncpFetchResponse<T>> {
  const fullUrl = urlOrPath.startsWith("http")
    ? urlOrPath
    : `${PNCP_BASE_URL}${urlOrPath}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await acquireSlot();
    try {
      const res = await fetch(fullUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ComprasAbertas/1.0",
          ...options.headers,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status === 204) {
        return { ok: true, status: 204, data: null };
      }

      if (res.status === 429) {
        // Registra a pausa global para não enviar novas requisições enquanto o PNCP bloqueia
        pausedUntil = Math.max(pausedUntil, Date.now() + PAUSE_ON_429_MS);
        if (attempt < maxAttempts) {
          await wait(PAUSE_ON_429_MS + 500);
          continue;
        }
        return {
          ok: false,
          status: 429,
          data: null,
          error: "Limite de requisições excedido pelo PNCP (HTTP 429).",
        };
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < maxAttempts) {
          await wait(1_000 * attempt);
          continue;
        }
        return {
          ok: false,
          status: res.status,
          data: null,
          error: `PNCP retornou status ${res.status}`,
        };
      }

      const json = (await res.json()) as T;
      return { ok: true, status: 200, data: json };
    } catch (err: unknown) {
      const isAbort =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      if (attempt < maxAttempts) {
        await wait(800 * attempt);
        continue;
      }
      return {
        ok: false,
        status: isAbort ? 504 : 500,
        data: null,
        error:
          err instanceof Error
            ? err.message
            : "Falha de rede ao consultar o PNCP.",
      };
    } finally {
      releaseSlot();
    }
  }

  return {
    ok: false,
    status: 500,
    data: null,
    error: "Falha ao consultar o PNCP após tentativas.",
  };
}

/**
 * Informa se o rate limiter está atualmente em pausa devido a 429 do PNCP.
 */
export function isPncpRateLimited(): boolean {
  return Date.now() < pausedUntil;
}
