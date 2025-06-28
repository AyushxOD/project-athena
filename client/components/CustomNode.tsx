/* ======================================================================
    File #1: client/components/CustomNode.tsx
    This component is upgraded to accept a 'depth' property from its data
    and change its style accordingly.
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
   
   // --- NEW COLOR PALETTE ---
   // A cool-toned palette that will loop for deep conversations.
   const depthColors = [
     'rgba(49, 46, 129, 0.7)',  // Deep Indigo for depth 0 (Root)
     'rgba(55, 48, 163, 0.7)',  // Indigo for depth 1
     'rgba(79, 70, 229, 0.7)',  // Brighter Indigo for depth 2
     'rgba(34, 197, 94, 0.7)',  // Special: Green for Evidence nodes
   ];
   
   const aiColor = 'rgba(217, 119, 6, 0.7)'; // Amber for AI Questions
   
   const CustomNode = ({ id, data }: NodeProps<NodeData>) => {
     const isEvidenceNode = data.type === 'evidence';
     const isAINode = data.type === 'ai_question'; // We'll make this more explicit
   
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
       let style = { ...baseStyle };
   
       // Determine background color based on type or depth
       const depth = data.depth ?? 0;
   
       if (isEvidenceNode) {
           style.backgroundColor = depthColors[3];
           style.border = '1px solid rgba(34, 197, 94, 0.6)';
       } else if (isAINode) {
           style.backgroundColor = aiColor;
           style.border = '1px solid rgba(250, 204, 21, 0.6)';
       } else {
           style.backgroundColor = depthColors[depth % 3]; // Loop through first 3 colors
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
   
         {/* A claim is neither AI nor Evidence, so the button will show */}
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
   
   