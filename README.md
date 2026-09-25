# Zero-Prompt Adaptive Learning Engine

Hand over raw study material once — notes, a PDF, a DOCX, a photo of a textbook
page, or a YouTube lecture link — and get back a complete study suite. No
prompting, no configuration, no asking the same AI nine different questions.

Each pack contains layered summaries, an interactive mind map, flashcards on a
spaced-repetition schedule, MCQs with explanations, educational memes,
recommended external resources, a multiplayer quiz arena with a live
leaderboard, weak-topic detection, WhatsApp revision alerts, and a downloadable
Doubt-Buster PDF whose sections link back to a chatbot scoped to that section.

**[architecture.md](./architecture.md)** explains how it works and why.

---

## Layout

```text
apps/client          React SPA (Vite)        → :5173
apps/server          Next.js API routes      → :4000
packages/shared-types  Zod schemas shared by both
supabase/migrations  database schema
```

## Prerequisites

- Node 20 or newer
- A Supabase project
- An Anthropic API key

## Setup

**1. Install**

```bash
npm install
```

**2. Create the database**

In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`. It enables
`pgvector`, creates every table, the job-claim function, the vector search
function, row-level security policies, and the three storage buckets. The file
is safe to re-run.

<details>
<summary><strong>Alternative: run Supabase locally with Docker</strong></summary>

Needs Docker running. No account, no cloud project:

```bash
npx supabase start          # first run pulls ~2 GB of images
npx supabase status -o env  # prints the URL and keys
```

`supabase start` applies everything in `supabase/migrations/` automatically, so
step 2 is already done. Take `API_URL`, `ANON_KEY` and `SERVICE_ROLE_KEY` from
the status output and use them in step 3.

To skip services this app never touches and cut the download roughly in half:

```bash
npx supabase start -x studio,edge-runtime,logflare,vector,imgproxy,mailpit,supavisor,postgres-meta
```

Stop it with `npx supabase stop`, which leaves the data volume intact.

</details>

**3. Configure the API**

```bash
cp apps/server/.env.example apps/server/.env.local
```

| Variable | Required | What breaks without it |
|---|:--:|---|
| `ANTHROPIC_API_KEY` | ● | Everything |
| `SUPABASE_URL` | ● | Everything |
| `SUPABASE_SERVICE_KEY` | ● | Everything |
| `VOYAGE_API_KEY` | | Chatbot falls back to keyword retrieval |
| `TAVILY_API_KEY` *or* `SERPER_API_KEY` | | No recommended resources |
| `TWILIO_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER` | | No WhatsApp alerts |
| `CORS_ALLOWED_ORIGINS` | | Defaults to `http://localhost:5173` |
| `PUBLIC_APP_URL` | | PDF and alert links point at localhost |
| `WORKER_SECRET` | | `/api/jobs/run` is unauthenticated — set it when deployed |

**4. Configure the client**

```bash
cp apps/client/.env.example apps/client/.env.local
```

Set `VITE_API_URL`, plus `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for
live progress and leaderboards. Without the Supabase values the app polls
instead — everything still works, it just updates less often.

**5. Seed demo packs (optional, no Claude key needed)**

```bash
npm run seed -w @zpl/server
```

Inserts two fully-formed study packs — Electromagnetic Induction (Physics) and
Trees and Graphs (Computer Science) — written by hand in exactly the shape the
pipeline produces. Memes are composited for real through `sharp` and uploaded to
Storage.

This exists so the app can be demonstrated end to end without spending a Claude
call and without waiting on generation. Every tab works from seeded data:
Overview, Mind Map, Flashcards with spaced repetition, MCQs with grading and
weak-topic detection, Memes, Resources, Battles, Community, and the PDF. Only
the chatbot and generating a *new* pack need `ANTHROPIC_API_KEY`.

Re-running replaces the demo packs and leaves anything you created alone.

**6. Run**

Three terminals:

```bash
npm run dev:server            # API      http://localhost:4000
npm run dev:client            # SPA      http://localhost:5173
npm run worker -w @zpl/server # job queue
```

The worker is what actually generates study suites. Without it, ingestion
succeeds and the processing screen sits at the first step.

Check your configuration at any time:

```bash
curl http://localhost:4000/api/health
```

## Scripts

| Command | Does |
|---|---|
| `npm run build` | Builds every workspace |
| `npm run typecheck` | Typechecks every workspace |
| `npm run smoke -w @zpl/client` | Renders every route server-side — catches runtime crashes without a browser |
| `npm run worker -w @zpl/server` | Drains the job queue |
| `npm run seed -w @zpl/server` | Inserts the pre-generated demo study packs |

## API

```text
POST   /api/ingest                        start a study pack
GET    /api/study-packs                   list packs
GET    /api/study-packs/:id               the full generated bundle
GET    /api/study-packs/:id/status        job status (polling fallback)
POST   /api/study-packs/:id/generate      regenerate, clearing old assets
POST   /api/study-packs/:id/pdf           build the Doubt-Buster PDF

GET    /api/flashcards/due                cards due, weak topics first
POST   /api/flashcards/review             record a review, get the next date
POST   /api/mcqs/attempt                  grade a quiz, update weak topics
GET    /api/weak-points                   per-topic accuracy

POST   /api/battle/create                 create a battle, get a code
POST   /api/battle/join                   join by code, no account needed
GET    /api/battle/:code                  public state (no answer key)
POST   /api/battle/:code/start            host starts the battle
POST   /api/battle/answer                 grade one answer, update the board

POST   /api/chat                          Doubt-Buster chatbot (RAG)

GET    /api/community                     browse and search published packs
POST   /api/community                     publish a pack
POST   /api/community/:id/upvote          toggle an upvote
GET    /api/community/:id/comments        read comments
POST   /api/community/:id/comments        add a comment
POST   /api/community/:id/clone           clone a pack, assets included

POST   /api/alerts                        WhatsApp opt in / out
POST   /api/alerts/send                   send every due alert (scheduled)

POST   /api/jobs/run                      drain the job queue (worker/cron)
GET    /api/health                        configuration and database check
```

## Deploying

**Client → GitHub Pages.** `.github/workflows/deploy-pages.yml` builds the SPA
and publishes it on every push to `main`. It reads three *repository variables*
(Settings → Secrets and variables → Actions → **Variables**):

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your deployed API's origin |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |

These are variables rather than secrets on purpose: Vite compiles them into the
public JavaScript bundle, so they are readable by anyone either way. Only ever
put publishable values here. The anon key is designed for this and is
constrained by the row-level security policies in the migration — the
service-role key must never appear in this list.

Until `VITE_API_URL` is set, the site renders with a banner explaining that the
API is not deployed.

**API → Render.** GitHub Pages is static-only and cannot run the Next.js API.
`render.yaml` is a Blueprint: in Render, choose **New → Blueprint**, pick this
repository, and it provisions the service from `apps/server/Dockerfile`.

The API ships as a container because the Doubt-Buster PDF is rendered by
Puppeteer, and a stock Node image rarely carries the shared libraries Chrome
needs. The image installs Debian's `chromium` and points
`PUPPETEER_EXECUTABLE_PATH` at it.

Render prompts for these on first deploy:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` key |
| `CORS_ALLOWED_ORIGINS` | Your GitHub Pages origin |
| `PUBLIC_APP_URL` | The same Pages origin |
| `ANTHROPIC_API_KEY` | Optional — without it the site is browsable from the seeded packs and generating a new pack fails with a clear message |

`WORKER_SECRET` is generated automatically.

Because Render keeps the process alive between requests, the blueprint sets
`INLINE_WORKER=true`: a queued job starts the moment it is created rather than
waiting for a scheduled drain, so no worker process or cron is needed. On a
serverless host, leave `INLINE_WORKER` unset — the process is frozen after the
response — and drive `/api/jobs/run` from a scheduler instead.

A free Render service sleeps after 15 minutes of inactivity, so the first
request after an idle period takes roughly 50 seconds. Deliberately there is no
keep-alive ping: running 24/7 would consume the whole 750-hour monthly
allowance.

**Also on Vercel.** `apps/server/vercel.json` remains, with crons for
`/api/jobs/run` and `/api/alerts/send`. Two caveats: Hobby crons run only once a
day, and Chrome exceeds the serverless bundle limit, so PDF export needs
`@sparticuz/chromium` there. Vercel sends `Authorization: Bearer $CRON_SECRET`,
so set `WORKER_SECRET` to match.

## Notes

**PDF export needs Chrome.** Puppeteer downloads it on install. If that is
blocked, run `npx puppeteer browsers install chrome`, or point
`PUPPETEER_EXECUTABLE_PATH` at an existing Chrome. Every other feature works
without it.

**Meme templates are generated, not downloaded.** Layouts live in
`apps/server/src/lib/meme-render.ts` as panel definitions composited with
`sharp`, so nothing is fetched at runtime and no image rights are involved.

**Costs.** One study pack is roughly nine Claude calls, all sharing one cached
prompt prefix. Generated assets are stored and never regenerated on read.
