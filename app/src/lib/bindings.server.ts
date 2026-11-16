import postgres from "postgres";

type QueryResult<T> = { results: T[] };
type Statement = {
  bind: (...values: unknown[]) => Statement;
  first: <T = Record<string, unknown>>() => Promise<T | null>;
  all: <T = Record<string, unknown>>() => Promise<QueryResult<T>>;
  run: () => Promise<{ success: boolean; meta: { changes: number } }>;
};
type Database = { prepare: (query: string) => Statement };
type AppEnv = { DB?: Database; BOOTSTRAP_SECRET?: string; GOOGLE_CLIENT_ID?: string };

let client: ReturnType<typeof postgres> | undefined;
function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  client ??= postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false });
  return client;
}
function toPostgres(query: string) {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}
export function bindings(): AppEnv {
  const sql = getClient();
  if (!sql) return { BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET, GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID };
  const DB: Database = {
    prepare(query: string) {
      let values: any[] = [];
      const statement: Statement = {
        bind(...args) { values = args; return statement; },
        async first<T>() { const rows = await sql.unsafe(toPostgres(query), values) as unknown as T[]; return rows[0] ?? null; },
        async all<T>() { const rows = await sql.unsafe(toPostgres(query), values) as unknown as T[]; return { results: rows }; },
        async run() { const rows = await sql.unsafe(toPostgres(query), values); return { success: true, meta: { changes: rows.count ?? 0 } }; },
      };
      return statement;
    },
  };
  return { DB, BOOTSTRAP_SECRET: process.env.BOOTSTRAP_SECRET, GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID };
}
