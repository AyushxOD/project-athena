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
} from 'reactflow';
import CustomNode from './CustomNode';
import io, { Socket } from 'socket.io-client';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from '../utils/layout';

// --- THIS IS THE FIX ---
// By defining nodeTypes outside the component function, it is only created once
// when the module is loaded, which permanently fixes the React Flow warning.
const nodeTypes = { custom: CustomNode };

type FlowNode = Node<{ label?: string; [key: string]: any }>;

export default function DebateCanvas() {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const { fitView } = useReactFlow();

  // All your handlers and hooks below this line are correct.
  
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          socketRef.current?.emit('deleteNode', change.id);
        }
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [] 
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onNodeDoubleClick: NodeDragHandler = useCallback((_, node) => {
    socketRef.current?.emit('requestAiQuestion', node);
  }, []);
  const onNodeDragStop: NodeDragHandler = useCallback((_, node) => {
    socketRef.current?.emit('nodeUpdated', { id: node.id, position: node.position });
  }, []);
  const handleCreateNode = () => {
    if (!newNodeLabel.trim()) return;
    const id = crypto.randomUUID();
    const newNode: FlowNode = {
      id,
      data: { label: newNodeLabel },
      type: 'custom',
      position: { x: 150, y: 150 },
    };
    setNodes((cur) => [...cur, newNode]);
    socketRef.current?.emit('createNode', newNode);
    setNewNodeLabel('');
  };

  const onLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges);
    const validNodes = ln.filter(
      (n) =>
        typeof n.position?.x === 'number' &&
        !isNaN(n.position.x) &&
        typeof n.position?.y === 'number' &&
        !isNaN(n.position.y)
    );
    setNodes(validNodes);
    setEdges(le);
    setTimeout(() => fitView({ duration: 800 }), 20);
  }, [nodes, edges, fitView]);

  const handleFindEvidence = useCallback((nodeId: string) => {
    const nodeToSearch = nodes.find(n => n.id === nodeId);
    if (nodeToSearch) {
      console.log(`Requesting evidence for node: ${nodeId}`);
      socketRef.current?.emit('requestEvidence', nodeToSearch);
    }
  }, [nodes]);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    const handleAiNodeCreated = ({ aiNode, edge }: { aiNode: FlowNode, edge: Edge }) => {
      const typedNode = { ...aiNode, type: 'custom' };
      setNodes((prev) => [...prev, typedNode]);
      if (edge) {
        setEdges((prev) => addEdge(edge, prev));
      }
    };
    const handleNewNodeFromServer = (node: FlowNode) => {
      setNodes((cur) => cur.some((n) => n.id === node.id) ? cur : [...cur, { ...node, type: 'custom' }]);
    };
    const handleNodeDeleted = (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    };
    const handleEvidenceNodesCreated = ({ evidenceNodes, edges: newEdges }: { evidenceNodes: FlowNode[], edges: Edge[] }) => {
      const typedEvidenceNodes = evidenceNodes.map((node) => ({ ...node, type: 'custom' }));
      setNodes((prev) => [...prev, ...typedEvidenceNodes]);
      if (Array.isArray(newEdges)) {
        setEdges((prev) => prev.concat(newEdges));
      }
    };
    const handleNodeUpdateFromServer = (update: {id: string, position: {x: number, y: number}}) => {
        setNodes((nds) => nds.map(n => n.id === update.id ? {...n, position: update.position} : n));
    };
    const handleAiError = (msg: string) => {
      setAiError(msg);
      setTimeout(() => setAiError(null), 5000);
    };

    socket.on('aiNodeCreated', handleAiNodeCreated);
    socket.on('newNodeFromServer', handleNewNodeFromServer);
    socket.on('nodeDeleted', handleNodeDeleted);
    socket.on('evidenceNodesCreated', handleEvidenceNodesCreated);
    socket.on('nodeUpdateFromServer', handleNodeUpdateFromServer);
    socket.on('aiError', handleAiError);

    return () => {
      socket.off('aiNodeCreated', handleAiNodeCreated);
      socket.off('newNodeFromServer', handleNewNodeFromServer);
      socket.off('nodeDeleted', handleNodeDeleted);
      socket.off('evidenceNodesCreated', handleEvidenceNodesCreated);
      socket.off('nodeUpdateFromServer', handleNodeUpdateFromServer);
      socket.off('aiError', handleAiError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [nodesResponse, edgesResponse] = await Promise.all([
          fetch('http://localhost:3001/nodes'),
          fetch('http://localhost:3001/edges'),
        ]);
        const initialNodes: FlowNode[] = await nodesResponse.json();
        const initialEdges: Edge[] = await edgesResponse.json();
        if (Array.isArray(initialNodes)) {
          const typedNodes = initialNodes.map((n) => ({ ...n, type: 'custom' }));
          setNodes(typedNodes);
        }
        if (Array.isArray(initialEdges)) {
          setEdges(initialEdges);
        }
      } catch (e) { console.error('Error loading initial graph data:', e); }
    })();
  }, []);

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(28,28,32,0.9)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    cursor: 'pointer',
  };

  const nodesWithHandlers = useMemo(() => {
    return nodes.map((n) => ({ ...n, data: { ...n.data, onFindEvidence: handleFindEvidence } }));
  }, [nodes, handleFindEvidence]);

  const sanitizedEdges = useMemo(() => {
    const validIds = new Set(nodesWithHandlers.map((n) => n.id));
    return edges.filter((e) => validIds.has(e.source) && validIds.has(e.target));
  }, [edges, nodesWithHandlers]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
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
        <Panel position="top-center">
          {aiError && (
            <div style={{ padding: 12, background: 'rgba(239,68,68,0.9)', color: 'white', borderRadius: 6 }}>
              {aiError}
            </div>
          )}
        </Panel>

        <Panel position="top-right" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fitView({ duration: 800 })} style={buttonStyle}>
              Fit to View
            </button>
            <button onClick={onLayout} style={buttonStyle}>
              Tidy Up Layout
            </button>
          </div>
          <div
            style={{
              padding: 12,
              background: 'rgba(28,28,32,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <input
              type="text"
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNode()}
              placeholder="Enter your claim or question…"
              style={{
                padding: 8, borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none',
              }}
            />
            <button onClick={handleCreateNode} style={buttonStyle}>
              Add Node
            </button>
          </div>
        </Panel>

        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
