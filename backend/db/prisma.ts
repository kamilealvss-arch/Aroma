import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const DEFAULT_SUPABASE_POOLER_URL = [
  'postgresql://postgres.zakrnmohhusesmwtiggf:',
  '%23Lt%235Xz9*z%266VEe',
  '@aws-1-us-west-2.pooler.supabase.com:5432/postgres?connection_limit=1',
].join('');

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = DEFAULT_SUPABASE_POOLER_URL;
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = DEFAULT_SUPABASE_POOLER_URL;
}

function getNormalizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;
  if (rawUrl.includes(':6543') && !rawUrl.includes('pgbouncer=true')) {
    const separator = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${separator}pgbouncer=true`;
  }
  return rawUrl;
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
  try {
    await prisma.$queryRaw`SELECT 1`;
    lastConnectionError = null;
    return true;
  } catch (err: any) {
    lastConnectionError = err?.message || String(err);
    return false;
  }
}
