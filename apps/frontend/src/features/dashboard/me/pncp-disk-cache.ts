import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { MeBidDetailResponse, MePncpBid, MePncpSyncMeta } from "./cnae-match";

export interface CachedEntry {
  timestamp: number;
  rawOpenBids: MePncpBid[];
  meta: Omit<MePncpSyncMeta, "totalOpenBids">;
}

let resolvedCacheDir: string | null = null;

async function getCacheDir(): Promise<string> {
  if (resolvedCacheDir) return resolvedCacheDir;

  const candidates = [
    path.join(process.cwd(), ".cache", "pncp"),
    path.join(os.tmpdir(), "compras-aberta-pncp"),
  ];

  for (const dir of candidates) {
    try {
      await fs.mkdir(dir, { recursive: true });
      // Testa se o diretório é gravável
      const testFile = path.join(dir, `.test-${Date.now()}.tmp`);
      await fs.writeFile(testFile, "ok", "utf-8");
      await fs.unlink(testFile).catch(() => undefined);
      resolvedCacheDir = dir;
      return dir;
    } catch {
      // Tenta próximo candidato
    }
  }

  // Fallback garantido
  resolvedCacheDir = path.join(os.tmpdir(), "pncp-cache");
  await fs.mkdir(resolvedCacheDir, { recursive: true }).catch(() => undefined);
  return resolvedCacheDir;
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Lê o cache em disco de licitações abertas (por UF ou IBGE).
 */
export async function readOpenBidsDiskCache(
  scope: string,
): Promise<CachedEntry | null> {
  try {
    const dir = await getCacheDir();
    const filePath = path.join(dir, `open_${sanitizeKey(scope)}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as CachedEntry;
    if (parsed && typeof parsed.timestamp === "number" && Array.isArray(parsed.rawOpenBids)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Grava o cache em disco de licitações abertas de forma assíncrona.
 */
export async function writeOpenBidsDiskCache(
  scope: string,
  entry: CachedEntry,
): Promise<void> {
  try {
    const dir = await getCacheDir();
    const filePath = path.join(dir, `open_${sanitizeKey(scope)}.json`);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const payload = JSON.stringify(entry);
    await fs.writeFile(tempPath, payload, "utf-8");
    await fs.rename(tempPath, filePath).catch(async () => {
      // Em alguns sistemas de arquivos o rename pode falhar se já existir, faz fallback
      await fs.writeFile(filePath, payload, "utf-8");
      await fs.unlink(tempPath).catch(() => undefined);
    });
  } catch (err) {
    console.warn(`[PNCP Disk Cache] Não foi possível salvar cache para ${scope}:`, err);
  }
}

/**
 * Lê o cache em disco dos detalhes de um edital (itens, arquivos).
 */
export async function readDetailDiskCache(
  key: string,
): Promise<MeBidDetailResponse | null> {
  try {
    const dir = await getCacheDir();
    const detailsDir = path.join(dir, "details");
    const filePath = path.join(detailsDir, `${sanitizeKey(key)}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as { timestamp: number; data: MeBidDetailResponse };
    if (parsed && parsed.data) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Grava os detalhes de um edital em disco de forma assíncrona.
 */
export async function writeDetailDiskCache(
  key: string,
  data: MeBidDetailResponse,
): Promise<void> {
  try {
    const dir = await getCacheDir();
    const detailsDir = path.join(dir, "details");
    await fs.mkdir(detailsDir, { recursive: true });
    const filePath = path.join(detailsDir, `${sanitizeKey(key)}.json`);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const payload = JSON.stringify({ timestamp: Date.now(), data });
    await fs.writeFile(tempPath, payload, "utf-8");
    await fs.rename(tempPath, filePath).catch(async () => {
      await fs.writeFile(filePath, payload, "utf-8");
      await fs.unlink(tempPath).catch(() => undefined);
    });
  } catch (err) {
    console.warn(`[PNCP Disk Cache] Não foi possível salvar detalhe ${key}:`, err);
  }
}
