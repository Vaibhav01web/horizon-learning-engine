import sharp from "sharp";
import { TEMPLATE_SLOTS } from "./generation/memes";

/**
 * Meme templates are stored as local layout definitions and composited here,
 * rather than downloading meme images at runtime. Each template is a stack of
 * panels; Claude supplies one caption per panel.
 */
interface PanelStyle {
  fill: string;
  accent: string;
  /** Short label printed in the panel's corner, e.g. "NAH" / "YEAH". */
  tag?: string;
}

interface TemplateSpec {
  width: number;
  panelHeight: number;
  panels: PanelStyle[];
  title: string;
}

const TEMPLATES: Record<string, TemplateSpec> = {
  drake: {
    title: "Drake",
    width: 800,
    panelHeight: 280,
    panels: [
      { fill: "#3f2a1d", accent: "#e8b88a", tag: "NAH" },
      { fill: "#1d3f2a", accent: "#8ae8b8", tag: "YEAH" },
    ],
  },
  "two-buttons": {
    title: "Two Buttons",
    width: 800,
    panelHeight: 260,
    panels: [
      { fill: "#3a1f2b", accent: "#ff9ab5", tag: "BUTTON 1" },
      { fill: "#1f2b3a", accent: "#9ac5ff", tag: "BUTTON 2" },
    ],
  },
  "distracted-boyfriend": {
    title: "Distracted Boyfriend",
    width: 800,
    panelHeight: 210,
    panels: [
      { fill: "#2b2f45", accent: "#c0c8ff", tag: "THE DISTRACTION" },
      { fill: "#45372b", accent: "#ffd7a3", tag: "THE STUDENT" },
      { fill: "#2b452f", accent: "#a3ffc0", tag: "WHAT MATTERS" },
    ],
  },
  "expanding-brain": {
    title: "Expanding Brain",
    width: 800,
    panelHeight: 190,
    panels: [
      { fill: "#241f2e", accent: "#9b8bb4", tag: "LEVEL 1" },
      { fill: "#2c2340", accent: "#b39ddb", tag: "LEVEL 2" },
      { fill: "#342752", accent: "#ce93d8", tag: "LEVEL 3" },
      { fill: "#3d2a64", accent: "#f0a6ff", tag: "LEVEL 4" },
    ],
  },
  "change-my-mind": {
    title: "Change My Mind",
    width: 800,
    panelHeight: 420,
    panels: [{ fill: "#2e2a1f", accent: "#ffe8a3", tag: "CHANGE MY MIND" }],
  },
};

export function templateExists(template: string): boolean {
  return template in TEMPLATES && template in TEMPLATE_SLOTS;
}

export async function renderMeme(template: string, captions: string[]): Promise<Buffer> {
  const spec = TEMPLATES[template];
  if (!spec) throw new Error(`Unknown meme template "${template}"`);

  const height = spec.panelHeight * spec.panels.length + HEADER_HEIGHT;
  const panels = spec.panels
    .map((panel, index) => renderPanel(spec, panel, captions[index] ?? "", index))
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${height}" viewBox="0 0 ${spec.width} ${height}">
  <rect width="100%" height="100%" fill="#0e0e12"/>
  <text x="24" y="34" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="#6c6c85" letter-spacing="2">${escapeXml(
    spec.title.toUpperCase(),
  )}</text>
${panels}
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

const HEADER_HEIGHT = 52;

function renderPanel(spec: TemplateSpec, panel: PanelStyle, caption: string, index: number): string {
  const top = HEADER_HEIGHT + index * spec.panelHeight;
  const padding = 28;
  const textWidth = spec.width - padding * 2;
  const lines = wrap(caption, Math.floor(textWidth / 17));
  const fontSize = lines.length > 3 ? 26 : 32;
  const startY = top + spec.panelHeight / 2 - ((lines.length - 1) * fontSize * 1.25) / 2 + 8;

  const tspans = lines
    .map(
      (line, lineIndex) =>
        `<tspan x="${padding}" y="${startY + lineIndex * fontSize * 1.25}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  return `  <g>
    <rect x="0" y="${top}" width="${spec.width}" height="${spec.panelHeight - 4}" fill="${panel.fill}"/>
    <rect x="0" y="${top}" width="6" height="${spec.panelHeight - 4}" fill="${panel.accent}"/>
    ${
      panel.tag
        ? `<text x="${spec.width - padding}" y="${top + 30}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="${panel.accent}" opacity="0.75" letter-spacing="1.5">${escapeXml(panel.tag)}</text>`
        : ""
    }
    <text font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#f5f5fa">${tspans}</text>
  </g>`;
}

/** Greedy word wrap — librsvg has no automatic text flow. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
