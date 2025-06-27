// Location: client/components/CustomNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// Define a more specific type for our node's data prop for better type safety
type NodeData = {
  label?: string;
  url?: string;
  type?: 'evidence' | 'ai_question';
  onFindEvidence?: (nodeId: string) => void;
};

const CustomNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const label = data.label || '[No Label]';
  const isAINode = typeof label === 'string' && label.startsWith('AI Question:');
  const isEvidenceNode = data.type === 'evidence';

  // Define base styles
  const baseStyle: React.CSSProperties = {
    padding: '15px 20px',
    borderRadius: '12px',
    color: 'white',
    width: '250px',
    textAlign: 'center',
    border: selected ? '2px solid #60a5fa' : '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(28, 28, 32, 0.8)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  };

  const aiStyle: React.CSSProperties = { ...baseStyle, border: '1px solid rgba(250, 204, 21, 0.6)' };
  
  const evidenceStyle: React.CSSProperties = { 
    ...baseStyle, 
    border: '1px solid rgba(34, 197, 94, 0.6)',
    backgroundColor: 'rgba(16, 40, 28, 0.8)',
  };
  
  const getStyle = () => {
    if (isEvidenceNode) return evidenceStyle;
    if (isAINode) return aiStyle;
    return baseStyle;
  };

  // Consistent button style
  const buttonStyle: React.CSSProperties = {
    padding: '6px 10px',
    background: 'rgba(75, 85, 99, 0.7)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    cursor: 'pointer',
    marginTop: '5px',
    fontSize: '12px'
  };

  // --- THIS IS THE FIX ---
  // The entire block of JSX is now correctly wrapped in parentheses `()`.
  return (
    <div style={getStyle()}>
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      <div>{label}</div>
      
      {isEvidenceNode && data.url && (
        <a href={data.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#10b981', display: 'block' }}>
          View Source ↗
        </a>
      )}

      {!isAINode && !isEvidenceNode && (
          <button onClick={() => data.onFindEvidence?.(id)} style={buttonStyle}>
            Find Evidence
          </button>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
};

export default memo(CustomNode);
