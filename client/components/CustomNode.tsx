/* ======================================================================
    File #1: client/components/CustomNode.tsx
    This component is upgraded to accept a 'depth' and change its style.
   ====================================================================== */
   import React, { memo } from 'react';
   import { Handle, Position, NodeProps } from 'reactflow';
   
   type NodeData = {
     label?: string;
     url?: string;
     type?: 'evidence' | 'ai_question';
     depth?: number; // The new property for color-coding
     onFindEvidence?: (nodeId: string) => void; 
   };
   
   // Define a color palette for different node depths
   const depthColors = [
     'rgba(28, 28, 32, 0.8)',   // Base color for depth 0
     'rgba(55, 48, 163, 0.7)',  // Deep indigo for depth 1
     'rgba(107, 33, 168, 0.7)', // Rich purple for depth 2
     'rgba(134, 25, 143, 0.7)'  // Magenta for depth 3+
   ];
   
   const CustomNode = ({ id, data }: NodeProps<NodeData>) => {
     const isAINode = data.label?.startsWith('AI Question:');
     const isEvidenceNode = data.type === 'evidence';
     
     const baseStyle: React.CSSProperties = {
       padding: '15px 20px',
       borderRadius: '12px',
       color: 'white',
       width: '250px',
       textAlign: 'center',
       border: '1px solid rgba(255, 255, 255, 0.2)',
       backdropFilter: 'blur(12px)',
       boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
       display: 'flex',
       flexDirection: 'column',
       gap: '10px'
     };
     
     const getStyle = () => {
       // Start with the base style
       let style = { ...baseStyle };
   
       // Determine background color based on depth
       const depth = data.depth ?? 0;
       style.backgroundColor = depthColors[depth % depthColors.length];
   
       // Override border for specific types
       if (isEvidenceNode) {
         style.border = '1px solid rgba(34, 197, 94, 0.6)';
       } else if (isAINode) {
         style.border = '1px solid rgba(250, 204, 21, 0.6)';
       }
       return style;
     };
   
     const buttonStyle: React.CSSProperties = { /* ... as before ... */ };
   
     return (
       <div style={getStyle()}>
         <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
         <div>{data.label || '[No Label]'}</div>
         
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