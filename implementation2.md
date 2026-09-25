# Zero-Prompt Adaptive Learning Engine — Implementation Roadmap

## 1. Project Overview

### Project Name
**Zero-Prompt Adaptive Learning Engine**

### Project Objective

The Zero-Prompt Adaptive Learning Engine is an AI-powered learning platform that converts complex study material into a complete interactive learning suite with a **single click and zero manual prompting**.

Students can provide raw text, documents, PDFs, YouTube lecture links, or textbook images. The system automatically understands, organizes, and transforms the input into structured study assets such as summaries, mind maps, flashcards, MCQs, educational memes, recommended resources, multiplayer quizzes, revision alerts, and a Doubt-Buster PDF.

The core goal is to eliminate **prompt fatigue**. Instead of repeatedly asking an AI to summarize, explain, create questions, find resources, or prepare revision material, the student simply provides the study material and the system automatically generates the required learning resources.

---

# 2. Core Features

## 2.1 Input and Ingestion

### Multi-Format Support
The system accepts:

- Raw/pasted text
- PDF documents
- DOCX documents
- Textbook images
- YouTube lecture links

### Automated Processing

After the user clicks **Generate Study Suite**, the system processes the input automatically in the background.

The ingestion pipeline:

1. Identifies the input type.
2. Extracts or reads the content.
3. Normalizes the content into text.
4. Performs hierarchical AI parsing.
5. Identifies important learning units.
6. Stores the processed content.
7. Starts automatic study-material generation.

The system extracts:

- Definitions
- Formulas
- Important concepts
- Topics and subtopics
- Chronological events
- Explanations
- Relationships between concepts

No additional prompt or configuration is required from the student.

---

# 3. Core AI Outputs

## 3.1 Layered Summaries

The system generates two levels of summaries:

### Executive Overview
A short 2–3 sentence explanation describing the overall topic.

### Bullet Breakdown
A structured list of important concepts, facts, formulas, and explanations.

The interface displays the executive overview immediately while allowing the student to expand individual bullet points for more detail.

---

## 3.2 Interactive 2D Mind Maps

The AI converts the identified topics and subtopics into a hierarchical graph.

Each node represents a concept, and edges represent relationships between concepts.

Features:

- Automatic node generation
- Hierarchical layout
- Clickable nodes
- Drag-and-drop interaction
- Zoom and pan
- Side panel containing the relevant explanation
- Links between mind-map nodes and stored content blocks

React Flow is used for rendering.

---

## 3.3 Gamified Evaluation

The system automatically creates multiple evaluation formats.

### Flashcards

AI-generated flashcards contain:

- Front: question/concept
- Back: answer/explanation
- Difficulty level

Students can flip through the cards and later receive cards based on their revision schedule.

### MCQs

Each question contains:

- Question
- Multiple options
- Correct answer
- Explanation

The explanation appears immediately after the student submits an answer.

### Educational Memes

The system generates educational memes based on concepts from the study material.

Pipeline:

1. Claude generates an educational caption/joke.
2. Claude selects an appropriate template from a fixed template list.
3. The backend composites the caption onto the stored template.
4. The generated meme is saved to Supabase Storage.

---

# 4. Resource Aggregator

For each major topic, the system automatically searches for useful external learning resources.

It searches for:

- Explained videos
- Free courses
- Open-access papers
- Educational articles
- Other useful learning material

Search results are filtered and ranked using simple relevance heuristics.

Preferred sources include:

- YouTube
- `.edu` websites
- arXiv
- Open-access journals
- Other reliable educational resources

The results are displayed in a **Recommended Resources** section.

The student does not need to manually search for resources.

---

# 5. Social and Community Features

## 5.1 Multiplayer Arenas

Students can challenge friends using generated quiz sets.

Flow:

1. Student clicks **Challenge a Friend**.
2. System creates a quiz session.
3. A unique battle code/link is generated.
4. Student shares the link through WhatsApp, Discord, etc.
5. Friends join using the link.
6. Participants answer the same questions.
7. Scores are updated in real time.

Guest participation can be supported to reduce friction.

---

## 5.2 Real-Time Leaderboards

During multiplayer quizzes, participants see a live leaderboard.

The leaderboard displays:

- Participant name
- Score
- Correct answers
- Current ranking

Supabase Realtime is used for live score updates.

---

## 5.3 Community Pools

Students can publish their generated study packs to a public community.

Community users can:

- Browse study packs
- Search by subject/topic
- Upvote packs
- Comment
- Clone useful study packs
- Create their own public packs

When a pack is cloned, its generated learning assets are copied into a new study pack owned by the new user.

---

# 6. Smart Retention Tools

## 6.1 Spaced Repetition

The system tracks quiz and flashcard performance to identify weak topics.

Possible implementation:

- Simplified SM-2 algorithm
- Leitner box system

Each review item can store:

- Last reviewed date
- Next review date
- Difficulty
- Ease factor
- Review interval
- User performance

After each quiz, the system calculates weak topics based on the user's accuracy.

---

## 6.2 WhatsApp Revision Alerts

Users can opt into WhatsApp revision reminders.

Example:

> 📚 Revision time! You're weak on: Binary Trees. Tap to practice: [link]

Twilio WhatsApp Business API is used for the demo.

The system stores:

- Phone number
- WhatsApp opt-in status
- Weak topics
- Next revision date

For the hackathon demo, the Twilio WhatsApp Sandbox can be used.

---

## 6.3 Doubt-Buster PDF

The system generates a styled downloadable PDF containing:

- Executive summary
- Detailed topic breakdown
- Mind-map
- Flashcards
- MCQs
- Answers and explanations
- Important formulas
- Important definitions

Puppeteer is used to render styled HTML into a PDF.

### Contextual Doubt Chatbot

A real PDF cannot reliably execute JavaScript, so the recommended implementation uses contextual links/QR codes.

Each section can contain:

**Ask about this section →**

The link opens a web chatbot scoped to that section using:

```text
/chat?pack_id=<pack_id>&section_id=<section_id>
```

The chatbot retrieves relevant content from pgvector and sends the context to Claude.

This provides a realistic contextual doubt-solving experience while keeping the downloadable document a real PDF.

---

# 7. Recommended Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS | Main web application |
| UI | shadcn/ui + Radix | Accessible UI components |
| Mind Map | React Flow | Interactive 2D graphs |
| Backend/API | Next.js API Routes | Lightweight application APIs |
| AI/Parsing | FastAPI + Python | Heavy AI and parsing workloads |
| Database | Supabase PostgreSQL | Main database |
| Authentication | Supabase Auth | User authentication |
| Storage | Supabase Storage | PDFs, uploads, memes |
| Vector Search | pgvector | RAG and semantic retrieval |
| LLM | Claude API | Parsing, generation, reasoning |
| PDF Parsing | PyMuPDF | PDF text extraction |
| DOCX Parsing | Mammoth | DOCX extraction |
| OCR/Vision | Claude Vision | Images and scanned documents |
| YouTube | youtube-transcript-api | Transcript extraction |
| PDF Generation | Puppeteer | Styled PDF generation |
| Realtime | Supabase Realtime | Multiplayer/leaderboards |
| WhatsApp | Twilio WhatsApp API | Revision alerts |
| Meme Generation | Pillow / Sharp | Meme compositing |
| Search | Tavily / Serper | Resource discovery |
| Hosting | Vercel + Render/Railway | Application deployment |
| Queue | PostgreSQL jobs table | Background processing |

---

# 8. Project Architecture

```text
                         ┌────────────────────────┐
                         │       Student          │
                         └───────────┬────────────┘
                                     │
                                     ▼
                         ┌────────────────────────┐
                         │    Next.js Frontend    │
                         │ TypeScript + Tailwind  │
                         └───────────┬────────────┘
                                     │
                          Generate Study Suite
                                     │
                                     ▼
                         ┌────────────────────────┐
                         │   Next.js API Routes   │
                         └───────────┬────────────┘
                                     │
                                     ▼
                         ┌────────────────────────┐
                         │    Supabase / Jobs     │
                         │ PostgreSQL + Storage   │
                         └───────────┬────────────┘
                                     │
                                Background Job
                                     │
                                     ▼
                         ┌────────────────────────┐
                         │    FastAPI Worker      │
                         │ Python AI/Parsing      │
                         └───────────┬────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
       PDF/DOCX/OCR             YouTube              Raw Text
              │                      │                      │
              └──────────────────────┼──────────────────────┘
                                     ▼
                            ┌─────────────────┐
                            │ Normalized Text │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │   Claude API    │
                            │ AI Understanding│
                            └────────┬────────┘
                                     │
             ┌───────────────────────┼────────────────────────┐
             │                       │                        │
             ▼                       ▼                        ▼
        Content Blocks          Embeddings               Topics
             │                       │                        │
             └───────────────────────┼────────────────────────┘
                                     ▼
                            ┌─────────────────┐
                            │    pgvector     │
                            └────────┬────────┘
                                     │
       ┌──────────────┬──────────────┼──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼
   Summary         Mind Map       Flashcards      MCQs          Resources
       │              │              │              │              │
       └──────────────┴──────────────┼──────────────┴──────────────┘
                                     │
                                     ▼
                              Study Pack UI
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
     Multiplayer              Community                  Retention
      Battles                    Packs                    System
          │                          │                          │
          ▼                          ▼                          ▼
   Leaderboards                  Clone                    WhatsApp
                                                          Alerts
```

---

# 9. Repository Structure

```text
zero-prompt-learning/
│
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── upload/
│   │   │   ├── study/
│   │   │   ├── battle/
│   │   │   ├── community/
│   │   │   └── api/
│   │   │
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── public/
│   │   └── package.json
│   │
│   └── worker/
│       ├── app/
│       │   ├── main.py
│       │   ├── ingestion/
│       │   ├── parsing/
│       │   ├── ai/
│       │   ├── embeddings/
│       │   ├── generation/
│       │   └── jobs/
│       │
│       ├── requirements.txt
│       └── .env
│
├── packages/
│   └── shared-types/
│       ├── schemas/
│       └── types/
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── README.md
└── implementation.md
```

---

# 10. Database Schema

Core tables:

```text
users
study_packs
sources
content_blocks
summaries
mindmaps
flashcards
flashcard_reviews
mcqs
memes
resources
quiz_sessions
quiz_participants
quiz_scores
leaderboards
community_packs
comments
upvotes
revision_alerts
user_weak_points
jobs
```

## Important Relationships

```text
users
  │
  ├── study_packs
  │      │
  │      ├── sources
  │      ├── content_blocks
  │      ├── summaries
  │      ├── mindmaps
  │      ├── flashcards
  │      ├── mcqs
  │      ├── memes
  │      ├── resources
  │      └── jobs
  │
  ├── flashcard_reviews
  ├── user_weak_points
  └── revision_alerts
```

---

# 11. Environment Variables

Create environment files for local development.

```env
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

TWILIO_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

TAVILY_API_KEY=
SERPER_API_KEY=

WORKER_API_URL=
```

Never commit secrets to Git.

Add environment files to `.gitignore`.

---

# 12. Phase 1 — Project Scaffolding & Architecture

## Objective

Create the basic monorepo and connect the application to Supabase.

## Steps

### 1. Create the repository

```bash
mkdir zero-prompt-learning
cd zero-prompt-learning
git init
```

### 2. Create frontend

```bash
npx create-next-app@latest apps/web \
  --typescript \
  --tailwind \
  --app
```

### 3. Install frontend dependencies

```bash
cd apps/web

npm install @supabase/supabase-js
npm install reactflow
npm install dagre
npm install zod
```

### 4. Create FastAPI worker

```bash
mkdir -p ../worker
cd ../worker

python -m venv .venv
source .venv/bin/activate

pip install fastapi uvicorn pydantic python-dotenv
```

### 5. Configure Supabase

Create:

- PostgreSQL database
- Authentication
- Storage
- Realtime
- pgvector extension

Storage buckets:

```text
raw-uploads
generated-pdfs
memes
```

### 6. Create jobs table

The `jobs` table should contain:

```text
id
type
status
payload
result
error
created_at
updated_at
```

Possible statuses:

```text
pending
processing
parsed
completed
failed
```

### Definition of Done

- Next.js application runs locally.
- FastAPI service runs locally.
- Supabase connection works.
- Database and storage are accessible.
- Basic deployment can be made to Vercel and Render/Railway.

---

# 13. Phase 2 — Input & Ingestion Pipeline

## Objective

Convert every supported input into normalized text automatically.

## Upload Interface

Create one upload component supporting:

```text
Paste Text
Upload PDF
Upload DOCX
Upload Image
Paste YouTube URL
```

The interface should have one primary button:

**Generate Study Suite**

There should be no prompt field.

## API Flow

```text
POST /api/ingest
       │
       ▼
Create study_pack
       │
       ▼
Create jobs row
       │
       ▼
Return pack_id
       │
       ▼
Redirect to processing page
```

The frontend monitors job status using Supabase Realtime.

---

## Text Processing

Raw text:

```text
Input → Normalize → Store → Parse
```

---

## PDF Processing

Use PyMuPDF:

```text
PDF
 ↓
Text extraction
 ↓
Is text usable?
 ├── Yes → Continue
 └── No → Render pages as images → Claude Vision
```

---

## DOCX Processing

```text
DOCX
 ↓
Mammoth
 ↓
HTML
 ↓
Clean text
```

---

## Image Processing

Send image to Claude Vision.

The internal extraction prompt should request:

- All visible text
- Diagram labels
- Tables
- Formula text
- Headings
- Important annotations

---

## YouTube Processing

Extract video ID.

Use:

```text
youtube-transcript-api
```

Flow:

```text
YouTube URL
 ↓
Video ID
 ↓
Transcript
 ↓
Normalized text
```

If no transcript exists, mark the job as unsupported instead of silently failing.

---

# 14. Hierarchical AI Parsing

Normalized content is sent to Claude.

Expected structured output:

```json
{
  "definitions": [
    {
      "term": "...",
      "definition": "..."
    }
  ],
  "formulas": [
    {
      "name": "...",
      "expression": "...",
      "explanation": "..."
    }
  ],
  "chronology": [
    {
      "date_or_order": "...",
      "event": "..."
    }
  ],
  "topics": [
    {
      "topic": "...",
      "subtopics": [],
      "importance": "high"
    }
  ]
}
```

Store the results in `content_blocks`.

---

# 15. Embeddings and RAG

Split normalized content into meaningful chunks.

Generate embeddings for:

- Content blocks
- Topics
- Important explanations

Store embeddings in pgvector.

These embeddings will later power:

- Doubt chatbot
- Contextual explanations
- Resource relevance
- Section-specific questions
- Semantic content retrieval

---

# 16. Phase 3 — Core AI Outputs

## Layered Summary

Claude generates:

```json
{
  "executive_overview": "...",
  "bullet_breakdown": [
    "...",
    "...",
    "..."
  ]
}
```

Store in `summaries`.

---

## Mind Map

Claude generates:

```json
{
  "nodes": [
    {
      "id": "1",
      "label": "Main Topic",
      "parent_id": null
    }
  ],
  "edges": [
    {
      "from": "1",
      "to": "2",
      "label": "contains"
    }
  ]
}
```

React Flow renders the graph.

Use:

- `dagre`
- or `elkjs`

for automatic positioning.

Each node should contain a reference to the corresponding content block.

---

# 17. Phase 4 — Gamified Evaluation

## Flashcards

Generate:

```json
[
  {
    "front": "What is ...?",
    "back": "...",
    "difficulty": "easy"
  }
]
```

Store in `flashcards`.

---

## MCQs

Generate:

```json
[
  {
    "question": "...",
    "options": [
      "...",
      "...",
      "...",
      "..."
    ],
    "correct_index": 2,
    "explanation": "..."
  }
]
```

Show explanations immediately after answering.

---

## Educational Memes

Fixed templates can include:

```text
Distracted Boyfriend
Drake
Expanding Brain
Two Buttons
Change My Mind
```

Recommended pipeline:

```text
Study Concept
      ↓
Claude
      ↓
Caption + Template
      ↓
Pillow/Sharp
      ↓
Generated Image
      ↓
Supabase Storage
```

Use locally stored templates rather than downloading meme images at runtime.

---

# 18. Phase 5 — Resource Aggregator

For each important topic:

```text
"<topic> explained video"
"<topic> free course OR open access paper"
```

Use:

- Tavily
- Serper
- YouTube Data API where appropriate

Filter results for:

- YouTube
- `.edu`
- arXiv
- Open-access journals

Store:

```text
title
url
thumbnail
source
topic
relevance
```

Display them under:

**Recommended Resources**

---

# 19. Phase 6 — Social & Community Features

## Multiplayer Battle

Create:

```text
quiz_sessions
quiz_participants
quiz_scores
```

Battle URL:

```text
/battle/<code>
```

Realtime channel:

```text
battle:<session_code>
```

Broadcast:

- Player joined
- Answer submitted
- Score updated
- Quiz completed

---

## Leaderboard

Subscribe to score changes.

Display:

```text
Rank | Player | Score
----------------------
1    | Alex   | 8
2    | Sam    | 7
3    | Rahul  | 6
```

---

## Community Packs

Users can publish a pack.

Community features:

```text
Publish
Search
Filter
Upvote
Comment
Clone
```

Clone operation should copy the generated learning assets into a new study pack.

---

# 20. Phase 7 — Smart Retention

## Spaced Repetition

Start with a simplified Leitner system if development time is limited.

Possible boxes:

```text
Box 1 → Review frequently
Box 2 → Review regularly
Box 3 → Review less frequently
Box 4 → Review weekly
Box 5 → Review rarely
```

A full SM-2 implementation can be added later.

Track:

```text
last_reviewed
next_review_date
interval
ease_factor
```

---

## Weak Topic Detection

After each quiz:

```text
Topic Accuracy =
Correct Answers / Total Answers
```

Topics with low accuracy are added to:

```text
user_weak_points
```

Example:

```text
Binary Trees       40%
Dynamic Programming 55%
Graphs              70%
Arrays              92%
```

The system can prioritize weak topics in future practice sessions.

---

# 21. WhatsApp Revision Alerts

Twilio WhatsApp Sandbox can be used for the hackathon demo.

Example notification:

```text
📚 Revision time!

You're currently weak on:
Dynamic Programming

Practice now:
https://yourapp.com/practice/123
```

Store:

```text
phone_number
whatsapp_opt_in
last_alert_sent
```

A scheduled job checks for cards/topics due for revision.

---

# 22. Doubt-Buster PDF

Generate an HTML document containing:

```text
Title
 ↓
Executive Summary
 ↓
Detailed Notes
 ↓
Definitions
 ↓
Formulas
 ↓
Mind Map
 ↓
Flashcards
 ↓
MCQs
 ↓
Answers
```

Use Puppeteer:

```text
HTML
 ↓
Puppeteer
 ↓
PDF
 ↓
Supabase Storage
 ↓
PDF URL
```

---

## Contextual Chatbot

Each PDF section can contain a link:

```text
Ask about this section →
```

Example:

```text
/chat?pack_id=123&section_id=456
```

The chatbot:

```text
User Question
      ↓
Retrieve relevant vectors
      ↓
Fetch content blocks
      ↓
Build context
      ↓
Claude API
      ↓
Answer
```

This provides a practical alternative to trying to execute JavaScript directly inside a PDF.

---

# 23. Phase 8 — Frontend Experience

## Landing Page

Main message:

> **One Click. Complete Study Suite. Zero Prompts.**

Primary CTA:

**Generate Study Suite**

Secondary explanation:

> Upload your notes, textbook, PDF, image, or lecture link. Let AI organize everything automatically.

---

## Processing Screen

Show meaningful progress instead of a generic spinner:

```text
✓ Reading your material
✓ Extracting important concepts
✓ Building topic structure
⏳ Creating your study suite
○ Generating practice questions
○ Finding learning resources
```

---

## Study Pack Dashboard

Recommended tabs:

```text
Overview
Mind Map
Flashcards
MCQs
Memes
Resources
Battle
PDF
```

---

# 24. API Structure

Suggested Next.js API routes:

```text
/api/ingest
/api/study-packs
/api/study-packs/[id]
/api/study-packs/[id]/generate
/api/flashcards
/api/mcqs
/api/resources
/api/battle/create
/api/battle/join
/api/chat
/api/pdf
/api/community
/api/community/[id]/clone
```

FastAPI endpoints:

```text
POST /process
POST /parse
POST /extract/pdf
POST /extract/image
POST /extract/youtube
POST /generate/embeddings
POST /generate/suite
GET  /health
```

---

# 25. Security

Implement:

- Supabase Auth
- Row Level Security
- Server-side API keys
- Input validation
- File type validation
- File size limits
- Rate limiting
- AI request cost limits
- Secure storage policies

Never expose:

```text
ANTHROPIC_API_KEY
SUPABASE_SERVICE_KEY
TWILIO_AUTH_TOKEN
```

to the browser.

---

# 26. Cost and Performance Optimization

Claude calls should be minimized where possible.

Use:

- Prompt caching
- Stored generated outputs
- Reuse of content blocks
- Background jobs
- Embeddings stored once
- Cached resources
- Pre-generated demo packs

Do not regenerate summaries, flashcards, or MCQs every time the user opens a study pack.

---

# 27. Background Job System

For the hackathon, a PostgreSQL jobs table is sufficient.

Example:

```text
jobs
--------------------------------
id
type
status
payload
result
error
created_at
updated_at
```

Worker flow:

```text
Find pending job
       ↓
Mark processing
       ↓
Execute
       ↓
Store result
       ↓
Mark completed
```

If the system becomes more complex, replace the database polling approach with:

```text
BullMQ + Redis/Upstash
```

---

# 28. Deployment

## Frontend

Deploy:

```text
apps/web → Vercel
```

## FastAPI Worker

Deploy:

```text
apps/worker → Render / Railway
```

## Database

Use:

```text
Supabase Cloud
```

## Storage

Use Supabase Storage.

---

# 29. Testing Checklist

## Input

- [ ] Raw text works
- [ ] PDF works
- [ ] Scanned PDF fallback works
- [ ] DOCX works
- [ ] Image works
- [ ] YouTube transcript works
- [ ] Unsupported YouTube video fails gracefully

## AI

- [ ] Definitions extracted
- [ ] Formulas extracted
- [ ] Topics extracted
- [ ] Summary generated
- [ ] Mind map generated
- [ ] Flashcards generated
- [ ] MCQs generated
- [ ] Meme generated

## Social

- [ ] Battle created
- [ ] Friend can join
- [ ] Scores update live
- [ ] Leaderboard updates
- [ ] Community publishing works
- [ ] Upvotes work
- [ ] Comments work
- [ ] Clone works

## Retention

- [ ] Weak topics calculated
- [ ] Review dates calculated
- [ ] WhatsApp alert triggered
- [ ] PDF generated
- [ ] Contextual chatbot works

---

# 30. Demo Study Packs

Prepare 2–3 study packs before the final demo.

Suggested examples:

### Pack 1 — Physics

Topic:

```text
Electromagnetic Induction
```

### Pack 2 — Computer Science

Topic:

```text
Data Structures — Trees and Graphs
```

### Pack 3 — History

Topic:

```text
Indian Independence Movement
```

Pre-generated packs ensure that the demo does not depend completely on live AI processing time.

---

# 31. Hackathon Demo Flow

The recommended demonstration sequence is:

```text
1. Open Zero-Prompt Learning Engine
          ↓
2. Upload a PDF / paste lecture content
          ↓
3. Click "Generate Study Suite"
          ↓
4. Show automated processing
          ↓
5. Show executive summary
          ↓
6. Open interactive mind map
          ↓
7. Click a mind-map node
          ↓
8. Show contextual explanation
          ↓
9. Open flashcards
          ↓
10. Take MCQ
          ↓
11. Show instant explanation
          ↓
12. Generate/open educational meme
          ↓
13. Open recommended resources
          ↓
14. Start multiplayer battle
          ↓
15. Open battle link on another device/browser
          ↓
16. Show live leaderboard
          ↓
17. Show weak-topic detection
          ↓
18. Show WhatsApp revision alert
          ↓
19. Download Doubt-Buster PDF
          ↓
20. Click contextual "Ask about this section"
          ↓
21. Ask chatbot a doubt
          ↓
22. Show RAG-based answer
```

---

# 32. Build Order

If development time becomes limited, prioritize features in this order:

| Priority | Feature | Status |
|---|---|---|
| 1 | Text + PDF ingestion | Must Have |
| 2 | Automated parsing | Must Have |
| 3 | Layered summaries | Must Have |
| 4 | Flashcards | Must Have |
| 5 | MCQs + explanations | Must Have |
| 6 | Interactive mind map | Must Have |
| 7 | Doubt-Buster PDF | Should Have |
| 8 | Multiplayer battle | Should Have |
| 9 | Live leaderboard | Should Have |
| 10 | Resource aggregator | Nice to Have |
| 11 | Educational memes | Nice to Have |
| 12 | Community pools | Nice to Have |
| 13 | Spaced repetition | Stretch |
| 14 | WhatsApp alerts | Stretch |
| 15 | Contextual PDF chatbot | Stretch |

If extremely short on time, the minimum viable demo should contain:

```text
PDF/Text
  ↓
Automatic Parsing
  ↓
Summary
  ↓
Mind Map
  ↓
Flashcards
  ↓
MCQs
  ↓
Doubt-Buster PDF
```

---

# 33. Definition of Done

The project is considered complete when a student can:

1. Upload or paste study material.
2. Click one button.
3. Receive automatically generated structured study content.
4. View a layered summary.
5. Explore an interactive mind map.
6. Practice using flashcards.
7. Attempt MCQs with instant explanations.
8. View educational memes.
9. Discover relevant learning resources.
10. Challenge friends through a multiplayer quiz.
11. See a real-time leaderboard.
12. Publish and clone community study packs.
13. Receive revision recommendations based on weak topics.
14. Receive an optional WhatsApp revision alert.
15. Download a styled Doubt-Buster PDF.
16. Open a contextual chatbot from the PDF.

The complete journey should require **no user-written AI prompt** after the initial upload.

---

# 34. Core Differentiator

The central differentiator of the Zero-Prompt Adaptive Learning Engine is not simply that it uses AI to generate study material.

The key idea is:

> **The student gives the system content, not instructions.**

Traditional AI study workflows often look like:

```text
Upload material
 ↓
"Summarize this"
 ↓
"Make flashcards"
 ↓
"Make MCQs"
 ↓
"Explain this topic"
 ↓
"Find resources"
 ↓
"Create a mind map"
```

The Zero-Prompt Adaptive Learning Engine changes this to:

```text
Upload Material
       ↓
Generate Study Suite
       ↓
┌──────────────────────────────┐
│ Summary                      │
│ Mind Map                     │
│ Flashcards                   │
│ MCQs                         │
│ Explanations                 │
│ Memes                        │
│ Resources                    │
│ Multiplayer Quiz             │
│ Weak-Topic Detection         │
│ Revision                     │
│ Doubt-Buster PDF             │
└──────────────────────────────┘
```

This makes the platform an **adaptive learning engine rather than a traditional chatbot interface**.

---

# 35. Final Technology Decision

The implementation should follow these technologies unless a technical limitation makes a specific component impossible:

```text
Frontend
Next.js 14
TypeScript
Tailwind CSS
shadcn/ui
Radix UI
React Flow

Backend
Next.js API Routes
FastAPI
Python

AI
Claude API
Claude Vision
Structured JSON/tool use
Prompt caching

Database
Supabase
PostgreSQL
pgvector

Parsing
PyMuPDF
Mammoth
youtube-transcript-api

Generation
Puppeteer
Pillow / Sharp

Realtime
Supabase Realtime

Communication
Twilio WhatsApp

Search
Tavily / Serper

Hosting
Vercel
Render / Railway
Supabase

Queue
Supabase/PostgreSQL jobs table
```

The architecture is intentionally optimized for a hackathon: **one primary web application, one Python AI worker, one managed database/storage platform, and minimal external infrastructure.**
