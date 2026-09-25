import { z } from "zod";

/* ---------------------------------------------------------------------------
 * Ingestion
 * ------------------------------------------------------------------------- */

export const sourceKindSchema = z.enum(["text", "pdf", "docx", "image", "youtube"]);
export type SourceKind = z.infer<typeof sourceKindSchema>;

export const ingestRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    kind: sourceKindSchema,
    /** Raw pasted text. Required when kind === "text". */
    text: z.string().max(400_000).optional(),
    /** YouTube watch/share URL. Required when kind === "youtube". */
    url: z.string().url().optional(),
    /** Base64 payload (no data: prefix) for pdf / docx / image uploads. */
    fileBase64: z.string().optional(),
    fileName: z.string().max(300).optional(),
    mimeType: z.string().max(120).optional(),
  })
  .superRefine((value, ctx) => {
    const need = (field: "text" | "url" | "fileBase64") => {
      if (!value[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required for kind "${value.kind}"`,
        });
      }
    };
    if (value.kind === "text") need("text");
    else if (value.kind === "youtube") need("url");
    else need("fileBase64");
  });
export type IngestRequest = z.infer<typeof ingestRequestSchema>;

export const ingestResponseSchema = z.object({
  packId: z.string().uuid(),
  jobId: z.string().uuid(),
});
export type IngestResponse = z.infer<typeof ingestResponseSchema>;

/* ---------------------------------------------------------------------------
 * Jobs
 * ------------------------------------------------------------------------- */

export const jobStatusSchema = z.enum([
  "pending",
  "processing",
  "parsed",
  "completed",
  "failed",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

/** Ordered pipeline stages surfaced on the processing screen. */
export const jobStageSchema = z.enum([
  "extracting",
  "parsing",
  "structuring",
  "embedding",
  "summarizing",
  "mindmap",
  "flashcards",
  "mcqs",
  "memes",
  "resources",
  "done",
]);
export type JobStage = z.infer<typeof jobStageSchema>;

export const JOB_STAGE_ORDER: JobStage[] = [
  "extracting",
  "parsing",
  "structuring",
  "embedding",
  "summarizing",
  "mindmap",
  "flashcards",
  "mcqs",
  "memes",
  "resources",
  "done",
];

export const JOB_STAGE_LABELS: Record<JobStage, string> = {
  extracting: "Reading your material",
  parsing: "Extracting important concepts",
  structuring: "Building topic structure",
  embedding: "Indexing for semantic search",
  summarizing: "Writing layered summaries",
  mindmap: "Drawing the mind map",
  flashcards: "Creating flashcards",
  mcqs: "Generating practice questions",
  memes: "Cooking up study memes",
  resources: "Finding learning resources",
  done: "Study suite ready",
};

export const jobSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid().nullable(),
  type: z.string(),
  status: jobStatusSchema,
  stage: jobStageSchema.nullable(),
  progress: z.number().min(0).max(100),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Job = z.infer<typeof jobSchema>;

/* ---------------------------------------------------------------------------
 * Claude structured outputs — hierarchical parse
 * ------------------------------------------------------------------------- */

export const definitionSchema = z.object({
  term: z.string(),
  definition: z.string(),
});

export const formulaSchema = z.object({
  name: z.string(),
  expression: z.string(),
  explanation: z.string(),
});

export const chronologyEntrySchema = z.object({
  date_or_order: z.string(),
  event: z.string(),
});

export const importanceSchema = z.enum(["high", "medium", "low"]);

export const topicSchema = z.object({
  topic: z.string(),
  subtopics: z.array(z.string()),
  importance: importanceSchema,
  explanation: z.string(),
});

export const parseResultSchema = z.object({
  title: z.string(),
  subject: z.string(),
  definitions: z.array(definitionSchema),
  formulas: z.array(formulaSchema),
  chronology: z.array(chronologyEntrySchema),
  topics: z.array(topicSchema),
});
export type ParseResult = z.infer<typeof parseResultSchema>;

/* ---------------------------------------------------------------------------
 * Claude structured outputs — study assets
 * ------------------------------------------------------------------------- */

export const summarySchema = z.object({
  executive_overview: z.string(),
  bullet_breakdown: z.array(
    z.object({
      point: z.string(),
      detail: z.string(),
    }),
  ),
});
export type Summary = z.infer<typeof summarySchema>;

export const mindmapPayloadSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      parent_id: z.string().nullable(),
      explanation: z.string(),
    }),
  ),
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      label: z.string(),
    }),
  ),
});
export type MindmapPayload = z.infer<typeof mindmapPayloadSchema>;

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const flashcardGenSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
      difficulty: difficultySchema,
      topic: z.string(),
    }),
  ),
});

export const mcqGenSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correct_index: z.number().int().min(0).max(3),
      explanation: z.string(),
      topic: z.string(),
      difficulty: difficultySchema,
    }),
  ),
});

export const MEME_TEMPLATES = [
  "distracted-boyfriend",
  "drake",
  "expanding-brain",
  "two-buttons",
  "change-my-mind",
] as const;
export const memeTemplateSchema = z.enum(MEME_TEMPLATES);
export type MemeTemplate = z.infer<typeof memeTemplateSchema>;

export const memeGenSchema = z.object({
  memes: z.array(
    z.object({
      template: memeTemplateSchema,
      /** One caption per text slot the chosen template exposes. */
      captions: z.array(z.string()).min(1).max(4),
      topic: z.string(),
    }),
  ),
});

/* ---------------------------------------------------------------------------
 * Persisted study-pack entities
 * ------------------------------------------------------------------------- */

export const studyPackSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  title: z.string(),
  subject: z.string().nullable(),
  status: z.enum(["processing", "ready", "failed"]),
  is_public: z.boolean(),
  created_at: z.string(),
});
export type StudyPack = z.infer<typeof studyPackSchema>;

export const flashcardSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid(),
  front: z.string(),
  back: z.string(),
  difficulty: difficultySchema,
  topic: z.string().nullable(),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const mcqSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid(),
  question: z.string(),
  options: z.array(z.string()),
  correct_index: z.number().int(),
  explanation: z.string(),
  topic: z.string().nullable(),
  difficulty: difficultySchema,
});
export type Mcq = z.infer<typeof mcqSchema>;

export const memeSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid(),
  template: z.string(),
  captions: z.array(z.string()),
  image_url: z.string().nullable(),
  topic: z.string().nullable(),
});
export type Meme = z.infer<typeof memeSchema>;

export const resourceSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid(),
  topic: z.string(),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  kind: z.enum(["video", "course", "paper", "article"]),
  thumbnail: z.string().nullable(),
  relevance: z.number(),
});
export type Resource = z.infer<typeof resourceSchema>;

export const contentBlockSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid(),
  kind: z.enum(["definition", "formula", "chronology", "topic", "chunk"]),
  heading: z.string().nullable(),
  body: z.string(),
  topic: z.string().nullable(),
});
export type ContentBlock = z.infer<typeof contentBlockSchema>;

export const studyPackBundleSchema = z.object({
  pack: studyPackSchema,
  summary: summarySchema.nullable(),
  mindmap: mindmapPayloadSchema.nullable(),
  flashcards: z.array(flashcardSchema),
  mcqs: z.array(mcqSchema),
  memes: z.array(memeSchema),
  resources: z.array(resourceSchema),
  contentBlocks: z.array(contentBlockSchema),
  pdfUrl: z.string().nullable(),
});
export type StudyPackBundle = z.infer<typeof studyPackBundleSchema>;

/* ---------------------------------------------------------------------------
 * Multiplayer battles
 * ------------------------------------------------------------------------- */

export const battleCreateSchema = z.object({
  packId: z.string().uuid(),
  hostName: z.string().trim().min(1).max(40),
  questionCount: z.number().int().min(3).max(25).default(10),
});

export const battleJoinSchema = z.object({
  code: z.string().trim().length(6),
  displayName: z.string().trim().min(1).max(40),
});

export const battleAnswerSchema = z.object({
  sessionId: z.string().uuid(),
  participantId: z.string().uuid(),
  mcqId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(3),
  timeMs: z.number().int().min(0).max(120_000),
});

export const battleParticipantSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  display_name: z.string(),
  score: z.number(),
  correct_count: z.number(),
  answered_count: z.number(),
  is_host: z.boolean(),
});
export type BattleParticipant = z.infer<typeof battleParticipantSchema>;

export const battleSessionSchema = z.object({
  id: z.string().uuid(),
  pack_id: z.string().uuid(),
  code: z.string(),
  status: z.enum(["lobby", "active", "finished"]),
  question_ids: z.array(z.string().uuid()),
  created_at: z.string(),
});
export type BattleSession = z.infer<typeof battleSessionSchema>;

/* ---------------------------------------------------------------------------
 * Retention, chat, community
 * ------------------------------------------------------------------------- */

export const reviewGradeSchema = z.enum(["again", "hard", "good", "easy"]);
export type ReviewGrade = z.infer<typeof reviewGradeSchema>;

export const flashcardReviewSchema = z.object({
  cardId: z.string().uuid(),
  grade: reviewGradeSchema,
  userId: z.string().uuid().optional(),
});

export const quizAttemptSchema = z.object({
  packId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  answers: z.array(
    z.object({
      mcqId: z.string().uuid(),
      selectedIndex: z.number().int().min(0),
    }),
  ),
});

export const weakPointSchema = z.object({
  topic: z.string(),
  accuracy: z.number(),
  total: z.number(),
});
export type WeakPoint = z.infer<typeof weakPointSchema>;

export const chatRequestSchema = z.object({
  packId: z.string().uuid(),
  sectionId: z.string().uuid().nullable().optional(),
  question: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .default([]),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const communityPublishSchema = z.object({
  packId: z.string().uuid(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(30)).max(8).default([]),
});

export const communityCommentSchema = z.object({
  packId: z.string().uuid(),
  author: z.string().trim().min(1).max(40),
  body: z.string().trim().min(1).max(1000),
});

export const alertOptInSchema = z.object({
  phoneNumber: z.string().trim().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +919876543210"),
  optIn: z.boolean(),
  userId: z.string().uuid().optional(),
});
