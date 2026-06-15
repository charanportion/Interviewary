// One-shot schema migration. Reads schema.sql and applies it to DATABASE_URL.
// Run: pnpm --filter @interview-copilot/server db:init
//
// Idempotent (all statements use IF NOT EXISTS). You can alternatively paste
// schema.sql into the Supabase SQL editor.
//
// Self-contained on purpose: it only needs DATABASE_URL, so it runs before the
// Polar/Deepgram/LLM env is configured (unlike importing the full server env).

import 'dotenv/config'; // load server/.env
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Put it in server/.env (Supabase transaction pooler string).');
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', 'schema.sql');
const schema = await readFile(schemaPath, 'utf8');

const sql = postgres(url, { prepare: false, ssl: 'require' });
try {
  await sql.unsafe(schema);
  console.log('[db] schema applied');
} finally {
  await sql.end();
}
