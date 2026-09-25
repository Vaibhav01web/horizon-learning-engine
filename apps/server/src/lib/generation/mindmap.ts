import { mindmapPayloadSchema, type MindmapPayload, type ParseResult } from "@zpl/shared-types";
import { generateStructured } from "../claude";

export async function generateMindmap(
  material: string,
  parsed: ParseResult,
): Promise<MindmapPayload> {
  const payload = await generateStructured({
    schema: mindmapPayloadSchema,
    material,
    maxTokens: 12000,
    instruction: [
      "Build a hierarchical mind map of the study material.",
      "",
      `The topics already identified are: ${parsed.topics.map((t) => t.topic).join(", ")}.`,
      "",
      "nodes: one root node with parent_id null, then topic nodes, then subtopic/detail nodes.",
      "Use short stable string ids ('1', '1.1', '1.2'). Labels are at most 6 words.",
      "`explanation` is 1-3 sentences shown in the side panel when the node is clicked.",
      "edges: one edge per parent-child link, plus any cross-links between related concepts.",
      "`label` names the relationship ('contains', 'causes', 'contrasts with', 'used by').",
      "",
      "Aim for 15-30 nodes. Every node except the root must have a parent that exists.",
    ].join("\n"),
  });

  return pruneDanglingReferences(payload);
}

/**
 * React Flow silently drops edges pointing at missing nodes and renders
 * orphaned nodes at the origin, so repair the graph before it is stored.
 */
function pruneDanglingReferences(payload: MindmapPayload): MindmapPayload {
  const ids = new Set(payload.nodes.map((node) => node.id));

  const nodes = payload.nodes.map((node) =>
    node.parent_id && !ids.has(node.parent_id) ? { ...node, parent_id: null } : node,
  );

  const seen = new Set<string>();
  const edges = payload.edges.filter((edge) => {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) return false;
    const key = `${edge.from}->${edge.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { nodes, edges };
}
