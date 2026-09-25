import { useCallback, useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import type { MindmapPayload } from "@zpl/shared-types";

const NODE_WIDTH = 190;
const NODE_HEIGHT = 48;

type MapNode = Node<{ label: string; explanation: string; depth: number }>;

/**
 * Dagre computes a left-to-right hierarchy; React Flow only renders it. Layout
 * runs once per mind map, not on every drag.
 */
function layout(payload: MindmapPayload): { nodes: MapNode[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 26, ranksep: 90 });

  for (const node of payload.nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of payload.edges) {
    graph.setEdge(edge.from, edge.to);
  }
  dagre.layout(graph);

  const depths = computeDepths(payload);

  const nodes: MapNode[] = payload.nodes.map((node) => {
    const position = graph.node(node.id);
    const depth = depths.get(node.id) ?? 0;

    return {
      id: node.id,
      position: { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 },
      data: { label: node.label, explanation: node.explanation, depth },
      style: {
        width: NODE_WIDTH,
        padding: "10px 12px",
        borderRadius: 12,
        border: `1px solid ${depth === 0 ? "#6d5efc" : depth === 1 ? "#3a3a4d" : "#2a2a38"}`,
        background: depth === 0 ? "#231d4d" : depth === 1 ? "#1d1d28" : "#16161f",
        color: "#e8e8f0",
        fontSize: depth === 0 ? 13 : 12,
        fontWeight: depth === 0 ? 700 : 500,
        textAlign: "left" as const,
      },
    };
  });

  const edges: Edge[] = payload.edges.map((edge, index) => ({
    id: `e${index}-${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    animated: false,
    style: { stroke: "#3a3a4d", strokeWidth: 1.4 },
    labelStyle: { fill: "#7a7a92", fontSize: 10 },
    labelBgStyle: { fill: "#101018" },
  }));

  return { nodes, edges };
}

/** Depth drives node styling, so cross-links must not inflate it. */
function computeDepths(payload: MindmapPayload): Map<string, number> {
  const depths = new Map<string, number>();
  const children = new Map<string | null, string[]>();

  for (const node of payload.nodes) {
    const bucket = children.get(node.parent_id) ?? [];
    bucket.push(node.id);
    children.set(node.parent_id, bucket);
  }

  const queue: [string, number][] = (children.get(null) ?? []).map((id) => [id, 0]);
  while (queue.length > 0) {
    const [id, depth] = queue.shift()!;
    if (depths.has(id)) continue;
    depths.set(id, depth);
    for (const child of children.get(id) ?? []) queue.push([child, depth + 1]);
  }

  return depths;
}

export function MindMap({ payload }: { payload: MindmapPayload }) {
  const initial = useMemo(() => layout(payload), [payload]);
  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);
  const [selected, setSelected] = useState<MapNode | null>(null);

  const onNodeClick = useCallback<NodeMouseHandler>((_event, node) => {
    setSelected(node as MapNode);
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="card h-[600px] overflow-hidden">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            nodesConnectable={false}
          >
            <Background color="#2a2a38" gap={20} />
            <Controls
              showInteractive={false}
              className="[&_button]:border-ink-700! [&_button]:bg-ink-850! [&_button]:fill-ink-300!"
            />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      <aside className="card h-fit p-5 lg:sticky lg:top-20">
        {selected ? (
          <>
            <h3 className="text-base font-semibold leading-snug text-ink-100">
              {selected.data.label}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">{selected.data.explanation}</p>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-ink-100">Click any node</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">
              Its explanation appears here. Drag nodes to rearrange, scroll to zoom.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
