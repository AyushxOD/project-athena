// Location: client/components/CustomNode.tsx
'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// This is an even more robust version of your custom node.
// It will now render an error state instead of crashing if props are invalid.
const CustomNode = (props: NodeProps) => {
    // --- ULTRA-ROBUST FIX ---
    // If the node props or the node ID is missing, we render a safe error state
    // instead of crashing the entire application. This fixes the Handle error.
    if (!props || !props.id) {
        return (
            <div style={{
                padding: '10px',
                background: '#ef4444', // Bright red
                color: 'white',
                borderRadius: '8px',
                border: '2px solid white',
            }}>
                Error: Invalid Node Data Received
            </div>
        );
    }
    // --- END OF FIX ---

    const { id, data, selected } = props;
    const label = data?.label || '[No Label]';
    const isAINode = typeof label === 'string' && label.startsWith('AI Question:');

    // Define styles here for clarity
    const style: React.CSSProperties = {
        padding: '15px 20px',
        borderRadius: '12px',
        color: 'white',
        width: '250px',
        textAlign: 'center',
        border: selected ? '2px solid #60a5fa' : (isAINode ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'),
        backgroundColor: isAINode ? 'rgba(50, 42, 16, 0.8)' : 'rgba(28, 28, 32, 0.8)',
        backdropFilter: 'blur(10px)',
    };
    
    return (
        <div style={style}>
            {/* These handles are the connection points for edges. */}
            <Handle type="target" position={Position.Top} />
            
            {/* Display the safe label variable */}
            <div>{label}</div>

            {/* --- DEBUG VIEW --- */}
            {/* This small text helps us see the node's unique ID */}
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '10px' }}>
                ID: {id}
            </div>
            {/* --- END DEBUG VIEW --- */}

            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export default memo(CustomNode);
