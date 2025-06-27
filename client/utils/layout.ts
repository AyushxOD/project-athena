// Location: client/utils/layout.ts
import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// --- CHANGE THESE VALUES ---
const nodeWidth = 250;  // Make nodes narrower
const nodeHeight = 200; /// Increased from 150 to give more vertical buffer


export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    dagreGraph.setGraph({
        rankdir: 'TB',
        nodesep: 200,  // Horizontal separation between nodes
        ranksep: 150, // Vertical separation between levels
      });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes: layoutedNodes, edges };
};