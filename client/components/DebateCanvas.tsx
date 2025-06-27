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

// register custom node renderer
const nodeTypes = { custom: CustomNode };

type FlowNode = Node<{ label?: string; [key: string]: any }>;

export default function DebateCanvas() {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const { fitView } = useReactFlow();

  // --- handlers ---
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // This is the new logic. We check for 'remove' changes.
      for (const change of changes) {
        if (change.type === 'remove') {
          // If a node is removed, we tell the server.
          socketRef.current?.emit('deleteNode', change.id);
        }
      }
      // We still apply the changes locally for an instant UI update.
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [] // socketRef is stable, so no dependency needed
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onNodeDoubleClick: NodeDragHandler = useCallback((_, node) => {
    socketRef.current?.emit('requestAiQuestion', node);
  }, []);
  const onNodeDragStop: NodeDragHandler = useCallback((_, node) => {
    // When dragging stops, send the new position to the server to be saved.
    socketRef.current?.emit('nodeUpdated', { id: node.id, position: node.position });
  }, []);
  // optimistic add + server emit
  const handleCreateNode = () => {
    if (!newNodeLabel.trim()) return;
    const id = crypto.randomUUID();
    const newNode: FlowNode = {
      id,
      data: { label: newNodeLabel },
      type: 'custom',
      position: { x: 150, y: 150 },
    };

    // 1) show immediately
    setNodes((cur) => [...cur, newNode]);
    // 2) persist/broadcast
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

  // --- socket.io listeners ---
  useEffect(() => {
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.on('aiNodeCreated', ({ aiNode, parentId }) => {
      setNodes((cur) => {
        if (cur.some((n) => n.id === aiNode.id)) return cur;
        const parent = cur.find((n) => n.id === parentId);
        const x = parent?.position?.x ?? 200;
        const y = (parent?.position?.y ?? 100) + 200;
        return [...cur, { ...aiNode, id: aiNode.id, type: 'custom', position: { x, y } }];
      });
      setEdges((cur) => {
        const eid = `edge-${parentId}-${aiNode.id}`;
        if (cur.some((e) => e.id === eid)) return cur;
        return addEdge(
          { id: eid, source: parentId, target: aiNode.id, animated: true, style: { stroke: '#facc15' } },
          cur
        );
      });
    });

    socket.on('newNodeFromServer', (node: FlowNode) => {
      setNodes((cur) =>
        cur.some((n) => n.id === node.id)
          ? cur
          : [...cur, { ...node, type: 'custom', position: node.position ?? { x: 150, y: 150 } }]
      );
    });
    
    // This is the new listener for deletion events from the server.
    socket.on('nodeDeleted', (nodeId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    });

    socket.on('aiError', (msg: string) => {
      setAiError(msg);
      setTimeout(() => setAiError(null), 5000);
    });

    // Remember to clean up the new listener
    return () => {
        socket.off('nodeDeleted');
        socket.disconnect();
    };
  }, []);

  // --- load initial nodes ---
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('http://localhost:3001/nodes');
        const list: FlowNode[] = await res.json();
        if (Array.isArray(list)) {
          const uniq: Record<string, FlowNode> = {};
          list.forEach((n) => {
            if (
              typeof n.position?.x === 'number' &&
              !isNaN(n.position.x) &&
              typeof n.position?.y === 'number' &&
              !isNaN(n.position.y)
            ) {
              uniq[n.id] = { ...n, type: 'custom' };
            }
          });
          setNodes(Object.values(uniq));
        }
      } catch (e) {
        console.error('Error loading nodes:', e);
      }
    })();
  }, []);

  // --- styles ---
  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'rgba(28,28,32,0.9)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    cursor: 'pointer',
  };

  // --- sanitize & dedupe right before render ---
  const sanitizedNodes = useMemo(() => {
    const map = new Map<string, FlowNode>();
    nodes.forEach((n) => {
      const x = n.position?.x,
        y = n.position?.y;
      if (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) {
        map.set(n.id, n);
      }
    });
    return Array.from(map.values());
  }, [nodes]);

  const sanitizedEdges = useMemo(() => {
    const validIds = new Set(sanitizedNodes.map((n) => n.id));
    const map = new Map<string, Edge>();
    edges.forEach((e) => {
      if (validIds.has(e.source) && validIds.has(e.target)) {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  }, [edges, sanitizedNodes]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={sanitizedNodes}
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
                padding: 8,
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                outline: 'none',
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
