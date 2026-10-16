import { neon } from '@neondatabase/serverless';
import { SCHEMA_STATEMENTS } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = (text: string, params?: unknown[]) => Promise<any[]>;

let client: SqlFn | null = null;
let schemaReady: Promise<void> | null = null;

function getClient(): SqlFn {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    client = neon(url) as unknown as SqlFn;
  }
  return client;
}

/** Creates tables on first use so a fresh database works with zero manual steps. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    const sql = getClient();
    schemaReady = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await sql(statement);
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  return (await getClient()(text, params)) as T[];
}
