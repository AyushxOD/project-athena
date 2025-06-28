/* ======================================================================
    File #1: server/src/types.ts (NEW FILE)
    ACTION: Create this new file in your `server/src` directory.
    This will be the single source of truth for our data types.
   ====================================================================== */
   export type Node = {
    id: string;
    position: { x: number; y: number };
    data: { 
      label: string;
      url?: string;
      type?: 'evidence' | 'ai_question';
    };
  };
  
  export type Edge = {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
  };
  
  export type Canvas = {
    id: string;
    title: string;
  };
  