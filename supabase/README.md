# Supabase setup (lead capture + usage analytics)

Interviewary uses a single Supabase project to store two things. **All writes happen server-side**
through the landing site's Next.js API routes — no Supabase key ever ships to the browser or the
extension.

| Table       | Written by (server route)        | Contains                                                            |
| ----------- | -------------------------------- | ------------------------------------------------------------------- |
| `downloads` | `/api/leads`                     | Leads from the gated download form: email, optional phone, consent. |
| `events`    | `/api/events`                    | Anonymous usage events — no transcripts, answers, keys, or PII.     |

```
extension ──POST──▶ /api/events ─┐
                                  ├─(service_role)──▶ Supabase
landing form ─POST▶ /api/leads ──┘
```

## One-time setup

1. **Create a project** at [supabase.com](https://supabase.com/dashboard) (the free tier is plenty).
2. **Run the schema.** Dashboard → **SQL Editor** → **New query** → paste [`schema.sql`](./schema.sql)
   → **Run**. This creates both tables with RLS enabled and **no** anon policies (only the server can
   touch them).
3. **Grab your keys.** Dashboard → **Project Settings → API**:
   - **Project URL** → `https://<ref>.supabase.co`
   - **`service_role`** secret key (under "Project API keys"). This is a **server secret** — treat it
     like a password.
4. **Configure the server** (these are read only by the Next.js API routes, never the browser):

   ```ini
   # landing/.env.local  (local dev)   — see landing/.env.example
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role)
   ```
5. **Netlify (production):** Site settings → **Environment variables** → add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_ANALYTICS_ENDPOINT` — the deployed events URL (e.g. `https://your-domain.com/api/events`),
     so the **extension** build embeds where to send analytics.

## Why this is safe

The `service_role` key lives **only on the server** (Next.js API routes / Netlify env). The browser
and the extension only ever call your own `/api/*` routes — they never hold a database key. RLS is
left enabled with no anon policies as defense-in-depth, so even a leaked anon key couldn't read or
write these tables.

## Reading your data

- **Leads:** Dashboard → **Table Editor → `downloads`**.
- **Usage:** Dashboard → **Table Editor → `events`**, or the **SQL Editor**, e.g.:

  ```sql
  -- interviews started per day
  select date_trunc('day', created_at) as day, count(*)
  from public.events where event = 'interview_started'
  group by 1 order by 1 desc;

  -- rating distribution
  select properties->>'rating' as rating, count(*)
  from public.events where event = 'answer_evaluated'
  group by 1 order by 2 desc;
  ```

## If you skip this

Everything **degrades gracefully** when the env vars are absent: the landing download still works
(the `/api/leads` route returns `skipped`), and the extension's analytics no-op. Nothing breaks —
you simply collect no data until you configure the keys.
