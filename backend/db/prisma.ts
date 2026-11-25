import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function getNormalizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  let normalized = rawUrl;
  if (normalized.includes(':6543') && !normalized.includes('pgbouncer=true')) {
    const separator = normalized.includes('?') ? '&' : '?';
    normalized = `${normalized}${separator}pgbouncer=true`;
  }
  if (process.env.VERCEL && !normalized.includes('connection_limit=')) {
    const separator = normalized.includes('?') ? '&' : '?';
    normalized = `${normalized}${separator}connection_limit=1`;
  }
  return normalized;
}

const normalizedUrl = getNormalizedDatabaseUrl();

export const prisma =
  global.__prismaClient ||
  new PrismaClient({
    ...(normalizedUrl ? { datasources: { db: { url: normalizedUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

global.__prismaClient = prisma;

export let lastConnectionError: string | null = null;

/**
 * Testa a conexão com o banco de dados PostgreSQL.
 * Retorna true se conectou com sucesso, ou false caso contrário.
 */
export async function testDatabaseConnection(): Promise<boolean> {
  if (!process.env.DATABASE_URL) {
    lastConnectionError = null;
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    lastConnectionError = null;
    return true;
  } catch (err: any) {
    lastConnectionError = err?.message || String(err);
    return false;
  }
}
