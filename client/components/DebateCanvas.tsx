// Location: client/components/DebateCanvas.tsx
// This is the complete, final, and correct version with all handlers sending the canvasId.

'use client';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
  Panel,
  Background,
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
import { Loader2, RefreshCw, Edit2, BookOpen, Frame } from 'lucide-react';
import CustomNode from './CustomNode';
import io, { Socket } from 'socket.io-client';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from '../utils/layout';

// --- THIS IS THE FIX ---
// We create a specific type for the data inside our nodes, instead of using 'any'.
type NodeData = {
  label?: string;
  url?: string;
  type?: 'evidence' | 'ai_question';
  depth?: number;
  onFindEvidence?: (nodeId: string) => void;
};
type FlowNode = Node<NodeData>;
// --- END OF FIX ---


const nodeTypes = { custom: CustomNode };


export default function DebateCanvas({ canvasId }: { canvasId: string }) {
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
  const { fitView } = useReactFlow();
  const socketRef = useRef<Socket | null>(null);

  // --- Handlers now correctly include canvasId in their payloads ---

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
    setNodes(ln);
    setEdges(le);
    setTimeout(() => fitView({ duration: 800 }), 20);
  }, [nodes, edges, fitView]);

  const handleFindEvidence = useCallback(
    (nodeId: string) => {
      if (loading.evidence) return;
      setLoading((l) => ({ ...l, evidence: true }));
      const node = nodes.find((n) => n.id === nodeId);
      if (node)
        socketRef.current?.emit('requestEvidence', { node, canvasId });
    },
    [nodes, loading.evidence, canvasId],
  );

  const onSummarize = useCallback(() => {
    if (nodes.length < 2) {
        setAiError("Not enough content to summarize.");
        setTimeout(() => setAiError(null), 3000);
        return;
    }
    setLoading((l) => ({ ...l, summary: true }));
    setAiError(null);
    setAiSummary(null);

    const graphPayload = {
      nodes: nodes.map((n) => ({ id: n.id, label: n.data.label })),
      edges: edges.map((e) => ({ source: e.source, target: e.target })),
      canvasId, // <-- The missing piece
    };
    socketRef.current?.emit('requestSummary', graphPayload);
  }, [nodes, edges, canvasId]);

  // --- Load initial graph data ---
  useEffect(() => {
    if (!canvasId) return;
    (async () => {
      try {
        const [nr, er] = await Promise.all([
          fetch(`${API_URL}/canvas/${canvasId}/nodes`),
          fetch(`${API_URL}/canvas/${canvasId}/edges`),
        ]);
        const initNodes: FlowNode[] = await nr.json();
        const initEdges: Edge[] = await er.json();
        setNodes(initNodes.map((n) => ({ ...n, type: 'custom' })));
        setEdges(initEdges);
      } catch (e) {
        console.error('Error loading graph data:', e);
      }
    })();
  }, [canvasId]);

  // --- Socket.io setup ---
  useEffect(() => {
    if (!canvasId) return;
    const socket = io(API_URL);
    socketRef.current = socket;
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
    const handleNodeUpdateFromServer = (payload: { id: string; position: { x: number, y: number } }) => {
      const { id, position } = payload;
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

    return () => {
      socket.emit('leaveCanvas', canvasId);
      socket.disconnect();
    };
  }, [canvasId]);

  // --- Memoized calculations for rendering ---
  const sanitizedNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          typeof n.position?.x === 'number' &&
          !isNaN(n.position.x) &&
          typeof n.position?.y === 'number' &&
          !isNaN(n.position.y),
      ),
    [nodes],
  );

  const nodesWithDepth = useMemo(() => {
    const depthMap = new Map<string, number>();
    const childrenMap = new Map<string, string[]>();
    sanitizedNodes.forEach((n) => childrenMap.set(n.id, []));
    edges.forEach((e) => childrenMap.get(e.source)?.push(e.target));
    const roots = sanitizedNodes.filter(
      (n) => !edges.some((e) => e.target === n.id),
    );
    const queue: [string, number][] = roots.map((r) => [r.id, 0]);
    while (queue.length) {
      const [nid, d] = queue.shift()!;
      depthMap.set(nid, d);
      childrenMap.get(nid)?.forEach((cid) => queue.push([cid, d + 1]));
    }
    return sanitizedNodes.map((n) => ({
      ...n,
      data: { ...n.data, depth: depthMap.get(n.id) ?? 0 },
    }));
  }, [sanitizedNodes, edges]);

  const nodesWithHandlers = useMemo(
    () =>
      nodesWithDepth.map((n) => ({
        ...n,
        data: { ...n.data, onFindEvidence: handleFindEvidence },
      })),
    [nodesWithDepth, handleFindEvidence],
  );

  const sanitizedEdges = useMemo(
    () => {
      const valid = new Set(nodesWithHandlers.map((n) => n.id));
      return edges.filter((e) => valid.has(e.source) && valid.has(e.target));
    },
    [edges, nodesWithHandlers],
  );

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(31, 41, 55, 0.8)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background-color 0.2s ease',
    backdropFilter: 'blur(4px)',
  };

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
        <AnimatePresence>
          {aiError && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <Panel position="top-center">
                      <div className="bg-red-600/90 backdrop-blur-sm p-3 rounded-lg text-white flex items-center gap-2 border border-red-400">
                          {aiError}
                      </div>
                  </Panel>
              </motion.div>
          )}
        </AnimatePresence>
        {aiSummary && (
          <motion.div initial={{ opacity: 0, y: 50}} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50}} className="absolute bottom-5 left-5 right-5 z-10 max-w-2xl mx-auto">
            <div className="bg-gray-900/70 backdrop-blur-lg p-4 rounded-xl border border-gray-700 text-white shadow-2xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">Debate Summary</h3>
                <button onClick={() => setAiSummary(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
              </div>
              <div className="text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto pr-2 text-sm">{aiSummary}</div>
            </div>
          </motion.div>
        )}
        <Panel position="bottom-center" className="w-full max-w-5xl mx-auto px-4 pb-4">
          <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gray-800/70 backdrop-blur-lg border border-gray-700 p-3 rounded-xl shadow-2xl flex items-center justify-between gap-4"
          >
              <div className="flex items-center gap-2">
                  <button onClick={onLayout} style={buttonStyle} title="Tidy Up Layout">
                      <Edit2 size={16} /> Layout
                  </button>
                  <button onClick={() => fitView({ duration: 800 })} style={buttonStyle} title="Fit to View">
                      <Frame size={16} /> Fit
                  </button>
                  <button onClick={onSummarize} disabled={loading.summary || nodes.length < 2} style={{...buttonStyle, backgroundColor: 'rgba(129, 91, 229, 0.8)'}} className="disabled:opacity-50">
                       {loading.summary ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                       Summarize
                  </button>
              </div>

              <div className="flex items-center gap-2 flex-grow">
                  <input
                      className="flex-grow bg-gray-700/50 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 border border-transparent focus:border-indigo-500 transition-all text-white"
                      value={newNodeLabel}
                      placeholder="Enter a new claim or question..."
                      onChange={(e) => setNewNodeLabel(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNode()}
                  />
                  <button onClick={handleCreateNode} disabled={!newNodeLabel.trim()} className="px-4 py-2 bg-indigo-600 rounded-lg text-white font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors">
                      Add Node
                  </button>
              </div>
          </motion.div>
        </Panel>

        <Controls />
        <MiniMap 
    position="top-right" 
    nodeColor={(n) => `hsl(${240 - (n.data.depth ?? 0) * 30},80%,50%)`} 
    style={{
        height: 120, // Sets the height to 120 pixels
        width: 200,  // Sets the width to 200 pixels
        backgroundColor: 'rgba(28, 28, 32, 0.8)', // Matches our dark theme
        backdropFilter: 'blur(10px)', // Adds the frosted glass effect
        border: '1px solid rgba(255, 255, 255, 0.1)',
        opacity: 0.8, // Sets the opacity to 80%
    }}
/>
      </ReactFlow>
    </div>
  );
}