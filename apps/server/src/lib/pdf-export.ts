import puppeteer from "puppeteer";
import type { StudyPackBundle } from "@zpl/shared-types";
import { env } from "./env";
import { uploadToBucket } from "./supabase";

/**
 * Renders the Doubt-Buster PDF.
 *
 * A real PDF cannot run JavaScript, so each section carries a contextual link
 * back into the web chatbot scoped to that section instead of an embedded bot.
 */
export async function buildDoubtBusterPdf(bundle: StudyPackBundle): Promise<string> {
  const html = renderHtml(bundle);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%;font-size:8px;color:#888;padding:0 15mm;display:flex;justify-content:space-between;">
        <span>${escapeHtml(bundle.pack.title)}</span>
        <span class="pageNumber"></span>
      </div>`,
    });

    return uploadToBucket(
      "generated-pdfs",
      `${bundle.pack.id}/doubt-buster.pdf`,
      Buffer.from(pdf),
      "application/pdf",
    );
  } finally {
    await browser.close();
  }
}

function chatLink(packId: string, sectionId?: string): string {
  const url = new URL("/chat", env.appUrl);
  url.searchParams.set("pack_id", packId);
  if (sectionId) url.searchParams.set("section_id", sectionId);
  return url.toString();
}

function renderHtml(bundle: StudyPackBundle): string {
  const { pack, summary, mindmap, flashcards, mcqs, contentBlocks } = bundle;

  const definitions = contentBlocks.filter((block) => block.kind === "definition");
  const formulas = contentBlocks.filter((block) => block.kind === "formula");
  const topics = contentBlocks.filter((block) => block.kind === "topic");

  const askLink = (sectionId?: string) =>
    `<a class="ask" href="${chatLink(pack.id, sectionId)}">Ask about this section &rarr;</a>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(pack.title)} — Doubt-Buster</title>
<style>
  * { box-sizing: border-box; }
  body {
    font: 11pt/1.55 "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #15151c; margin: 0;
  }
  h1 { font-size: 26pt; margin: 0 0 6px; letter-spacing: -0.5px; }
  h2 {
    font-size: 15pt; margin: 30px 0 10px; padding-bottom: 6px;
    border-bottom: 2px solid #6d5efc; color: #2a2150;
  }
  h3 { font-size: 11.5pt; margin: 16px 0 4px; }
  .subtitle { color: #6b6b7b; font-size: 11pt; margin-bottom: 4px; }
  .cover { padding: 40px 0 10px; border-bottom: 3px solid #6d5efc; margin-bottom: 8px; }
  .lede { background: #f4f2ff; border-left: 4px solid #6d5efc; padding: 14px 16px; border-radius: 0 6px 6px 0; }
  .ask {
    display: inline-block; margin-top: 8px; font-size: 8.5pt; font-weight: 600;
    color: #6d5efc; text-decoration: none;
  }
  ul { padding-left: 18px; }
  li { margin-bottom: 7px; }
  li .detail { display: block; color: #4a4a5a; font-size: 10pt; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { border: 1px solid #e2e0ef; border-radius: 6px; padding: 10px 12px; page-break-inside: avoid; }
  .card .front { font-weight: 600; }
  .card .back { color: #4a4a5a; font-size: 10pt; margin-top: 4px; }
  .tag {
    display: inline-block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8px;
    color: #6d5efc; background: #f0eeff; padding: 1px 6px; border-radius: 3px; margin-left: 6px;
  }
  .formula { font-family: "SF Mono", Menlo, Consolas, monospace; background: #f7f7fb; padding: 6px 8px; border-radius: 4px; }
  .q { page-break-inside: avoid; margin-bottom: 14px; }
  .q ol { margin: 4px 0 0; padding-left: 20px; }
  .answers { column-count: 2; font-size: 10pt; }
  .tree { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 9.5pt; white-space: pre; color: #2a2150; }
  .page-break { page-break-before: always; }
  footer { margin-top: 36px; padding-top: 10px; border-top: 1px solid #e2e0ef; color: #8a8a99; font-size: 8.5pt; }
</style>
</head>
<body>

<div class="cover">
  <div class="subtitle">${escapeHtml(pack.subject ?? "Study pack")} &middot; Doubt-Buster</div>
  <h1>${escapeHtml(pack.title)}</h1>
  <div class="subtitle">Generated ${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}</div>
</div>

${
  summary
    ? `<h2>Executive Summary</h2>
<div class="lede">${escapeHtml(summary.executive_overview)}</div>
${askLink()}

<h2>Detailed Notes</h2>
<ul>
${summary.bullet_breakdown
  .map(
    (item) =>
      `<li><strong>${escapeHtml(item.point)}</strong><span class="detail">${escapeHtml(item.detail)}</span></li>`,
  )
  .join("\n")}
</ul>`
    : ""
}

${
  topics.length
    ? `<h2>Topic Breakdown</h2>
${topics
  .map(
    (topic) => `<div class="card" style="margin-bottom:10px">
  <h3>${escapeHtml(topic.heading ?? "Topic")}</h3>
  <div class="back">${escapeHtml(topic.body)}</div>
  ${askLink(topic.id)}
</div>`,
  )
  .join("\n")}`
    : ""
}

${
  definitions.length
    ? `<h2>Important Definitions</h2>
<ul>
${definitions
  .map(
    (definition) =>
      `<li><strong>${escapeHtml(definition.heading ?? "")}</strong> — ${escapeHtml(definition.body)}</li>`,
  )
  .join("\n")}
</ul>
${askLink(definitions[0].id)}`
    : ""
}

${
  formulas.length
    ? `<h2>Important Formulas</h2>
${formulas
  .map(
    (formula) => `<div style="margin-bottom:12px">
  <h3>${escapeHtml(formula.heading ?? "")}</h3>
  <div class="formula">${escapeHtml(formula.body.split("\n")[0])}</div>
  <div class="back">${escapeHtml(formula.body.split("\n").slice(1).join(" ").trim())}</div>
</div>`,
  )
  .join("\n")}`
    : ""
}

${
  mindmap && mindmap.nodes.length
    ? `<h2>Mind Map</h2>
<div class="tree">${escapeHtml(renderTree(mindmap))}</div>`
    : ""
}

${
  flashcards.length
    ? `<div class="page-break"></div>
<h2>Flashcards</h2>
<div class="grid">
${flashcards
  .map(
    (card) => `<div class="card">
  <div class="front">${escapeHtml(card.front)}<span class="tag">${escapeHtml(card.difficulty)}</span></div>
  <div class="back">${escapeHtml(card.back)}</div>
</div>`,
  )
  .join("\n")}
</div>`
    : ""
}

${
  mcqs.length
    ? `<div class="page-break"></div>
<h2>Practice Questions</h2>
${mcqs
  .map(
    (mcq, index) => `<div class="q">
  <strong>${index + 1}. ${escapeHtml(mcq.question)}</strong>
  <ol type="A">${mcq.options.map((option) => `<li>${escapeHtml(option)}</li>`).join("")}</ol>
</div>`,
  )
  .join("\n")}

<h2>Answers &amp; Explanations</h2>
<div class="answers">
${mcqs
  .map(
    (mcq, index) =>
      `<p><strong>${index + 1}. ${String.fromCharCode(65 + mcq.correct_index)}</strong> — ${escapeHtml(mcq.explanation)}</p>`,
  )
  .join("\n")}
</div>`
    : ""
}

<footer>
  Every “Ask about this section” link opens a chatbot scoped to that section of this pack.
  Generated by the Zero-Prompt Adaptive Learning Engine.
</footer>

</body>
</html>`;
}

/** Flattens the mind map into an indented tree the PDF can print. */
function renderTree(mindmap: NonNullable<StudyPackBundle["mindmap"]>): string {
  const children = new Map<string | null, typeof mindmap.nodes>();
  for (const node of mindmap.nodes) {
    const bucket = children.get(node.parent_id) ?? [];
    bucket.push(node);
    children.set(node.parent_id, bucket);
  }

  const lines: string[] = [];
  const walk = (parentId: string | null, depth: number, seen: Set<string>) => {
    for (const node of children.get(parentId) ?? []) {
      if (seen.has(node.id) || depth > 6) continue;
      seen.add(node.id);
      lines.push(`${"    ".repeat(depth)}${depth === 0 ? "" : "└── "}${node.label}`);
      walk(node.id, depth + 1, seen);
    }
  };
  walk(null, 0, new Set());

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
