# Architecture

Zero-Prompt Adaptive Learning Engine — how the system is put together, and why.

The product promise is a single one: a student hands over raw material once and
receives a complete study suite, with no prompting and no configuration. Every
architectural decision below follows from that.

---

## 1. Shape of the system

```text
┌──────────────────────────┐        ┌──────────────────────────┐
│   React SPA (Vite)       │  HTTP  │  Next.js API (App Router)│
│   apps/client  :5173     │ ─────► │  apps/server   :4000     │
│                          │ ◄───── │                          │
│  • routing & views       │  JSON  │  • validation            │
│  • optimistic UI         │        │  • ingestion             │
│  • Realtime subscriber   │        │  • Claude orchestration  │
└───────────┬──────────────┘        └───────────┬──────────────┘
            │                                   │
            │  Realtime (websocket, anon key)   │  service-role key
            │                                   │
            └──────────────┬────────────────────┘
                           ▼
              ┌──────────────────────────┐
              │        Supabase          │
              │  Postgres + pgvector     │
              │  Storage · Realtime      │
              └──────────────────────────┘
```

Two applications, deployed separately:

| App | Role | Stack |
|---|---|---|
| `apps/client` | Everything the student sees | React 19, Vite, React Router, Tailwind v4, React Flow |
| `apps/server` | Everything that touches a secret | Next.js 15 App Router, API routes only |
| `packages/shared-types` | The contract between them | TypeScript + Zod schemas |

The two apps never share a process. The client knows the API only by its URL,
and the API serves no HTML — its `app/` directory contains route handlers and a
single informational root route.

### Why the split

The client is a pure SPA, so it deploys as static files to any CDN and boots
without a server round trip. The API is a Next.js app because its job is
request handling — validation, secret-holding, orchestration — and Next's route
handlers, middleware, and per-route runtime configuration cover that directly.

The cost of the split is CORS and two dev servers. CORS is handled in exactly
one place (`apps/server/src/middleware.ts`) and the origin allowlist is an
environment variable, so the cost is paid once.

### What replaced the Python worker

The original plan put heavy AI and parsing work in a FastAPI service. Here that
work lives in the Next.js API instead, because every piece of it has a
first-class TypeScript path:

| Job | Original plan | Here |
|---|---|---|
| PDF text | PyMuPDF | `unpdf` |
| Scanned PDF | render pages → Claude Vision | Claude reads the PDF document block directly |
| DOCX | Mammoth (Node) | Mammoth (Node) |
| Images | Claude Vision | Claude Vision |
| YouTube | youtube-transcript-api | `youtube-transcript` |
| Memes | Pillow | `sharp` |
| PDF export | Puppeteer | Puppeteer |

One language means one type system across the whole pipeline, and the Zod
schemas that validate an HTTP body are the same ones that constrain Claude's
output.

---

## 2. The generation pipeline

Ingestion returns in milliseconds; generation happens in the background. This is
what makes the "one click" promise survive contact with a two-minute Claude run.

```text
POST /api/ingest
  │
  ├─► study_packs row           (status: processing)
  ├─► sources row               (raw text, or a storage path, or a URL)
  ├─► jobs row                  (status: pending)
  └─◄ { packId, jobId }         202 Accepted
           │
           │   the browser redirects to /processing/:packId
           │   and subscribes to the jobs row over Realtime
           ▼
      ┌─────────────────────────────────────────┐
      │  worker: POST /api/jobs/run             │
      │  claim_next_job()  — FOR UPDATE SKIP LOCKED │
      └────────────────┬────────────────────────┘
                       ▼
   extracting  → normalized text
   parsing     → Claude: definitions, formulas, chronology, topics
   structuring → content_blocks
   embedding   → pgvector (optional)
   summarizing → Claude: layered summary
   mindmap     → Claude: nodes + edges
   flashcards  → Claude: 15–25 cards
   mcqs        → Claude: 12–20 questions
   memes       → Claude captions → sharp → Storage      (best effort)
   resources   → Tavily/Serper → heuristic ranking      (best effort)
   done        → study_packs.status = ready
```

Each stage writes `stage` and `progress` to its `jobs` row before it starts.
That single row is the only thing the processing screen reads, and Supabase
Realtime pushes each change to the browser — which is why the progress list
moves in real time without polling.

### Why a Postgres queue

`jobs` is an ordinary table. `claim_next_job()` uses
`FOR UPDATE SKIP LOCKED` to hand exactly one pending row to exactly one worker,
so several workers can run concurrently without coordination and without Redis.
The queue is durable, inspectable with plain SQL, and backed up with the rest of
the database.

The worker is not a separate service. `POST /api/jobs/run` drains the queue, and
three things can call it:

- `npm run worker -w @zpl/server` — a local poll loop, for development
- a Vercel cron or any external scheduler, in production
- a manual `curl`, when debugging

All three share one code path, so what runs in production is what ran locally.
`WORKER_SECRET` gates the endpoint everywhere it is reachable.

### Failure policy

Stages are not equal. Summary, mind map, flashcards, and MCQs are the product —
if one fails, the job fails and the pack is marked `failed` with the error text
shown on the processing screen. Memes and resources run inside `safely()`: a
failure is logged and the pack still completes. A student who has no meme still
has a study pack; a student with no flashcards does not.

A YouTube video with no transcript is not a crash — it is an expected outcome,
surfaced as `UnsupportedVideoError` and reported as an unsupported source rather
than a generic failure.

---

## 3. Claude usage

All model calls go through `apps/server/src/lib/claude.ts`. Nothing else in the
codebase constructs a request.

**One cached prefix per pack.** Every generator sends the same system prefix and
the same `<study_material>` block, with a one-hour cache breakpoint. The
per-generator instruction goes in the user turn, *after* the breakpoint. Prompt
caching is a prefix match, so this ordering is what makes the second through
ninth calls of a run cheap — only the first pays full input price.

**Structured output, not prose parsing.** Each generator declares a Zod schema in
`packages/shared-types`. `generateStructured()` converts it to JSON Schema,
passes it as the request's `output_format`, and validates the response against
the same schema before returning. A malformed generation fails loudly at the
boundary instead of corrupting a database row.

> The SDK's `betaZodOutputFormat` helper is not used: it imports `zod` from
> inside the SDK, which resolves to the SDK's bundled v3 copy, and v3 has no
> `toJSONSchema`. Conversion lives in `packages/shared-types/src/json-schema.ts`
> instead — beside the schemas themselves, because npm installs a separate Zod
> per workspace and `toJSONSchema` from a different copy can fail to recognise a
> schema's internals. Schema and converter are guaranteed to be one instance.

**Stop reasons are checked before content.** A refusal, a `max_tokens`
truncation, and a context overflow all arrive as HTTP 200. `assertUsable()`
rejects each with a message a student can act on.

**Generated output is never regenerated on read.** Opening a study pack is a
database read. Regeneration happens only when explicitly requested, and it
clears the previous assets first so a retry cannot leave a half-old suite.

---

## 4. Data model

```text
study_packs ──┬── sources              raw input, one per pack
              ├── content_blocks       parsed units + pgvector embeddings
              ├── summaries            1:1
              ├── mindmaps             1:1
              ├── flashcards ── flashcard_reviews    (per reviewer)
              ├── mcqs ─────── quiz_scores
              ├── memes
              ├── resources
              ├── jobs
              ├── community_packs ──┬── upvotes
              │                     └── comments
              └── quiz_sessions ──── quiz_participants

per-student:  user_weak_points · revision_alerts
```

`content_blocks` is the hinge. The parse writes definitions, formulas,
chronology entries, and topics into it as typed rows, then appends overlapping
raw chunks of the original text. The typed rows give the PDF its structure and
the mind map its anchors; the chunks keep the chatbot grounded in the student's
own wording. Every row carries an optional 1024-dimension embedding.

Retrieval degrades rather than breaks. With `VOYAGE_API_KEY` set,
`match_content_blocks()` does a cosine search in pgvector. Without it, the same
interface falls back to keyword overlap with heading-weighted scoring. The
chatbot works either way.

### Identity

The demo has no login. A browser generates a UUID on first use and sends it as
`X-Client-Key`; the API scopes flashcard reviews, weak points, upvotes, and
alert opt-ins to that key. Every table that holds per-student data has both a
`user_id` (nullable, FK to `auth.users`) and an `owner_key`/`reviewer_key`
column, so adding Supabase Auth later means populating the column that is
already there rather than migrating a schema.

---

## 5. Security boundaries

The service-role key bypasses RLS, so it exists only inside the API process. It
is read in `lib/env.ts`, used in `lib/supabase.ts`, and reaches nothing else.
The same is true of the Anthropic, Twilio, Tavily, Serper, and Voyage keys.

The browser holds only the Supabase **anon** key, and uses it for one thing:
Realtime subscriptions to `jobs`, `quiz_sessions`, and `quiz_participants`.
Those subscriptions are constrained by the RLS policies in the migration. All
writes go through the API.

Two rules shape the quiz endpoints:

- `GET /api/battle/:code` returns questions with their options but **without**
  `correct_index`. Every client can read that endpoint.
- `POST /api/battle/answer` and `POST /api/mcqs/attempt` grade on the server. A
  participant's score is recomputed from `quiz_scores` on every submission
  rather than incremented, so a retried request cannot inflate it; a unique
  `(participant_id, mcq_id)` constraint makes replays harmless.

Uploads are capped at 20 MB and validated by extension and MIME type before they
reach storage. Every request body is parsed by a Zod schema, and validation
failures return field-level detail with a 422.

---

## 6. Client structure

```text
src/
├── main.tsx            BrowserRouter
├── App.tsx             route table
├── lib/
│   ├── api.ts          fetch wrapper, ApiError, client key
│   └── supabase.ts     Realtime client — null when unconfigured
├── components/         UploadPanel · MindMap · FlashcardDeck · QuizRunner …
└── pages/              Landing · Processing · StudyPack · Battle · Community · Chat
```

`api.ts` is the only module that calls `fetch`. It attaches the client key,
parses the error envelope the server produces, and turns an unreachable API into
a message that names the URL it tried.

`supabase.ts` exports `null` when the keys are absent rather than throwing. Every
Realtime subscriber pairs with a polling fallback, so the processing screen and
the live leaderboard both work whether or not Realtime is configured — they just
update less often.

The mind map runs Dagre once per payload to compute a left-to-right hierarchy,
then hands static positions to React Flow. Layout does not re-run on drag.
Node depth is computed by breadth-first walk over `parent_id` only, so
cross-links between concepts do not distort the visual hierarchy.

### Verifying the UI without a browser

`npm run smoke -w @zpl/client` builds the app for SSR and renders every route
through `react-dom/server`. It catches import cycles, hook misuse, and crashes
on first paint, and needs no browser — so it runs in CI as easily as locally.

---

## 7. The Doubt-Buster PDF

A real PDF cannot execute JavaScript, so an embedded chatbot is not possible.
Instead, Puppeteer renders a styled HTML document in which each section carries
an **Ask about this section →** link:

```text
/chat?pack_id=<pack>&section_id=<content_block>
```

Opening that link loads the chat page with retrieval pinned to that block: the
named section is placed first in the context, followed by the most semantically
similar blocks from the same pack. The document stays a real, printable,
offline PDF, and the contextual help is one tap away.

---

## 8. Deployment

| Piece | Target | Notes |
|---|---|---|
| `apps/client` | GitHub Pages (workflow included) | Static `dist/`; base path and router basename come from the repo name |
| `apps/server` | Render, from `apps/server/Dockerfile` | Container so Chrome is present for PDF export |
| Database | Supabase Cloud | Apply `supabase/migrations/0001_init.sql` |
| Worker | `INLINE_WORKER=true`, or `POST /api/jobs/run` | Inline on a persistent host; scheduled on a serverless one |
| Alerts | Scheduled `POST /api/alerts/send` | Twilio WhatsApp sandbox for the demo |

The worker has two modes because hosts differ in one respect that matters: does
the process survive after the response? On Render it does, so `/api/ingest`
kicks off `runNextJob()` without awaiting it and the processing screen starts
advancing immediately. On a serverless host the process is frozen the moment the
response is sent, so that call would be cut off mid-job; there, `INLINE_WORKER`
stays unset and a scheduler drives `/api/jobs/run` instead. Both paths run the
same runner.

Set `CORS_ALLOWED_ORIGINS` to the client's deployed origin and `PUBLIC_APP_URL`
to the same value — the latter is what the PDF's chat links and the WhatsApp
practice links are built from.

Serverless platforms cap request duration. `/api/jobs/run` processes at most
three jobs per invocation and declares `maxDuration`; on a plan with a short
limit, run the worker as a long-lived process instead.
