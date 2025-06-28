// Location: client/components/DebateCanvas.tsx
'use client';

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,         // <-- ADD THIS BACK
  // <-- MAKE SURE THIS IS HERE TOO
  Panel,
  useReactFlow,
  Node,
  NodeDragHandler,
  OnNodesChange,
  applyNodeChanges,
  applyEdgeChanges,
  Edge,
  EdgeChange,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, Edit2, BookOpen } from 'lucide-react';
import CustomNode from './CustomNode';
import io, { Socket } from 'socket.io-client';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from '../utils/layout';

// register custom node renderer
const nodeTypes = { custom: CustomNode };

type FlowNode = Node<{ label?: string; [key: string]: any }>;

export default function DebateCanvas({ canvasId }: { canvasId: string }) {
  // State
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    summary: false,
    question: false,
    evidence: false,
  });

  // React Flow instance
  const { fitView } = useReactFlow();
  const socketRef = useRef<Socket | null>(null);

  // --- handlers ---
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          socketRef.current?.emit('deleteNode', { nodeId: change.id, canvasId });
        }
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [canvasId],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onNodeDoubleClick: NodeDragHandler = useCallback(
    (_, node) => {
      if (loading.question) return;
      setLoading((l) => ({ ...l, question: true }));
      socketRef.current?.emit('requestAiQuestion', { node, canvasId });
    },
    [loading.question, canvasId],
  );

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_, node) => {
      socketRef.current?.emit('nodeUpdated', {
        id: node.id,
        position: node.position,
        canvasId,
      });
    },
    [canvasId],
  );

  const handleCreateNode = useCallback(() => {
    if (!newNodeLabel.trim()) return;
    const id = crypto.randomUUID();
    const newNode: FlowNode = {
      id,
      data: { label: newNodeLabel },
      type: 'custom',
      position: { x: 150, y: 150 },
    };

    setNodes((cur) => [...cur, newNode]);
    socketRef.current?.emit('createNode', { node: newNode, canvasId });
    setNewNodeLabel('');
  }, [newNodeLabel, canvasId]);

  const onLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    const validNodes = ln.filter(
      (n) =>
        typeof n.position?.x === 'number' &&
        !isNaN(n.position.x) &&
        typeof n.position?.y === 'number' &&
        !isNaN(n.position.y),
    );
    setNodes(validNodes);
    setEdges(le);
    setTimeout(() => fitView({ duration: 800 }), 20);
  }, [nodes, edges, fitView]);

  // --- handlers that now include canvasId ---
  const handleFindEvidence = useCallback(
    (nodeId: string) => {
      if (loading.evidence) return;
      setLoading((l) => ({ ...l, evidence: true }));
      const node = nodes.find((n) => n.id === nodeId);
      if (node) socketRef.current?.emit('requestEvidence', { node, canvasId });
    },
    [nodes, loading.evidence, canvasId],
  );

  const onSummarize = useCallback(() => {
    setLoading((l) => ({ ...l, summary: true }));
    setAiError(null);
    socketRef.current?.emit('requestSummary', {
      nodes: nodes.map((n) => ({ id: n.id, label: n.data.label })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
    });
  }, [nodes, edges]);

  // --- Load initial graph data for the specific canvas ---
  useEffect(() => {
    if (!canvasId) return; // Don't fetch if there's no ID
    (async () => {
      try {
        const [nr, er] = await Promise.all([
          fetch(`http://localhost:3001/canvas/${canvasId}/nodes`),
          fetch(`http://localhost:3001/canvas/${canvasId}/edges`),
        ]);
        const initNodes: FlowNode[] = await nr.json();
        const initEdges: Edge[] = await er.json();
        setNodes(initNodes.map((n) => ({ ...n, type: 'custom' })));
        setEdges(initEdges);
      } catch (e) {
        console.error('Error loading graph data:', e);
      }
    })();
  }, [canvasId]); // This now depends on canvasId

  // --- Socket.io setup, now joining a specific room ---
  useEffect(() => {
    if (!canvasId) return; // Don't connect if there's no ID
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    // Join the specific room for this canvas
    socket.emit('joinCanvas', canvasId);

    const handleNewNodeFromServer = (node: FlowNode) => {
      setNodes((cur) =>
        cur.some((n) => n.id === node.id)
          ? cur
          : [...cur, { ...node, type: 'custom' }],
      );
    };
    const handleNodeDeleted = (nodeId: string) => {
      setNodes((cur) => cur.filter((n) => n.id !== nodeId));
      setEdges((cur) =>
        cur.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
    };
    const handleNodeUpdateFromServer = ({ id, position }) => {
      setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, position } : n)));
    };
    const handleAiNodeCreated = ({ aiNode, edge }: { aiNode: FlowNode; edge: Edge }) => {
      setLoading((l) => ({ ...l, question: false }));
      setNodes((cur) => [...cur, { ...aiNode, type: 'custom' }]);
      setEdges((cur) => addEdge(edge, cur));
    };
    const handleEvidenceNodesCreated = ({ evidenceNodes, edges: newEdges }: { evidenceNodes: FlowNode[]; edges: Edge[] }) => {
      setLoading((l) => ({ ...l, evidence: false }));
      setNodes((cur) => [...cur, ...evidenceNodes.map((n) => ({ ...n, type: 'custom' }))]);
      setEdges((cur) => cur.concat(newEdges));
    };
    const handleSummaryCreated = (summary: string) => {
      setLoading((l) => ({ ...l, summary: false }));
      setAiSummary(summary);
    };
    const handleAiError = (msg: string) => {
      setAiError(msg);
      setLoading({ summary: false, question: false, evidence: false });
      setTimeout(() => setAiError(null), 3000);
    };

    socket.on('newNodeFromServer', handleNewNodeFromServer);
    socket.on('nodeDeleted', handleNodeDeleted);
    socket.on('nodeUpdateFromServer', handleNodeUpdateFromServer);
    socket.on('aiNodeCreated', handleAiNodeCreated);
    socket.on('evidenceNodesCreated', handleEvidenceNodesCreated);
    socket.on('aiSummaryCreated', handleSummaryCreated);
    socket.on('aiError', handleAiError);

    // Leave the room when the component unmounts
    return () => {
      socket.emit('leaveCanvas', canvasId);
      socket.disconnect();
    };
  }, [canvasId]); // This effect now depends on canvasId

  // Sanitize nodes (no NaN positions)
  const sanitizedNodes = useMemo(
    () =>
      nodes.filter(
        (n) => typeof n.position?.x === 'number' && !isNaN(n.position.x) &&
               typeof n.position?.y === 'number' && !isNaN(n.position.y)
      ),
    [nodes]
  );

  // Compute depth
  const nodesWithDepth = useMemo(() => {
    const depthMap = new Map<string, number>();
    const childrenMap = new Map<string, string[]>();
    sanitizedNodes.forEach((n) => childrenMap.set(n.id, []));
    edges.forEach((e) => childrenMap.get(e.source)?.push(e.target));
    const roots = sanitizedNodes.filter((n) => !edges.some((e) => e.target === n.id));
    const queue: [string, number][] = roots.map((r) => [r.id, 0]);
    while (queue.length) {
      const [nid, d] = queue.shift()!;
      depthMap.set(nid, d);
      childrenMap.get(nid)?.forEach((cid) => queue.push([cid, d + 1]));
    }
    return sanitizedNodes.map((n) => ({ ...n, data: { ...n.data, depth: depthMap.get(n.id) ?? 0 } }));
  }, [sanitizedNodes, edges]);

 

  const nodesWithHandlers = useMemo(
    () => nodesWithDepth.map((n) => ({ ...n, data: { ...n.data, onFindEvidence: handleFindEvidence } })),
    [nodesWithDepth, handleFindEvidence]
  );

  const sanitizedEdges = useMemo(
    () => {
      const valid = new Set(nodesWithHandlers.map((n) => n.id));
      return edges.filter((e) => valid.has(e.source) && valid.has(e.target));
    },
    [edges, nodesWithHandlers]
  );




  return (
    <div className="w-screen h-screen bg-gray-900">
      <ReactFlow
        nodes={nodesWithHandlers}
        edges={sanitizedEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <AnimatePresence>
          {loading.question && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Panel position="top-center">
                <div className="bg-blue-600 p-2 rounded text-white flex items-center gap-2">
                  <Loader2 className="animate-spin" /> Generating question...
                </div>
              </Panel>
            </motion.div>
          )}
          {loading.evidence && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Panel position="top-center" style={{ marginTop: 4 }}>
                <div className="bg-green-600 p-2 rounded text-white flex items-center gap-2">
                  <BookOpen /> Finding evidence...
                </div>
              </Panel>
            </motion.div>
          )}
          {loading.summary && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Panel position="top-center" style={{ marginTop: 4 }}>
                <div className="bg-purple-600 p-2 rounded text-white flex items-center gap-2">
                  <RefreshCw className="animate-spin" /> Summarizing debate...
                </div>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
        {aiSummary && (
          <Panel position="bottom-left" style={{ maxWidth: '30vw', margin: 16, padding: 12, background: 'rgba(0,0,0,0.8)', borderRadius: 6 }}>
            <h3 className="text-white mb-2">Debate Summary</h3>
            <div className="text-white whitespace-pre-wrap max-h-60 overflow-auto">{aiSummary}</div>
            <button onClick={() => setAiSummary(null)} className="mt-2 px-2 py-1 bg-gray-700 rounded text-white">
              Close
            </button>
          </Panel>
        )}
        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button onClick={onLayout} className="px-3 py-1 border border-white rounded text-white flex items-center gap-1 hover:bg-gray-700">
              <Edit2 /> Tighten Layout
            </button>
            <input
              className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
              value={newNodeLabel}
              placeholder="Enter node..."
              onChange={(e) => setNewNodeLabel(e.target.value)}
            />
            <button onClick={handleCreateNode} disabled={!newNodeLabel.trim()} className="px-3 py-1 bg-blue-500 rounded text-white disabled:opacity-50 hover:bg-blue-600">
              Add Node
            </button>
          </div>
          <button onClick={onSummarize} disabled={loading.summary} className="mt-1 px-3 py-1 bg-purple-500 rounded text-white disabled:opacity-50 hover:bg-purple-600 flex items-center gap-1">
            <RefreshCw className={loading.summary ? 'animate-spin' : ''} /> Summarize
          </button>
        </Panel>
        <Controls />
        <MiniMap nodeColor={(n) => `hsl(${240 - (n.data.depth ?? 0) * 30},80%,50%)`} />
      </ReactFlow>
    </div>
  );
}
