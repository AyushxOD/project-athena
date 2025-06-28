// Location: client/app/canvas/[id]/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { ReactFlowProvider } from 'reactflow';
import VantaBackground from '../../../components/VantaBackground';
import Link from 'next/link';
import { useParams } from 'next/navigation'; // <-- 1. IMPORT THE CORRECT HOOK

const DebateCanvas = dynamic(() => import('../../../components/DebateCanvas'), {
  ssr: false,
  loading: () => (
    <>
      <VantaBackground />
      <div style={{ color: 'white', textAlign: 'center', paddingTop: '40vh', fontSize: '1.2rem' }}>
        Loading Interactive Canvas...
      </div>
    </>
  ),
});

// This is the final, correct component structure.
export default function CanvasPage() {
  // 2. USE THE HOOK TO SAFELY GET THE PARAMS
  const params = useParams();
  // The 'id' will be a string. We ensure it's not an array if the route is weird.
  const canvasId = Array.isArray(params.id) ? params.id[0] : params.id;

  // 3. RENDER THE CANVAS ONLY WHEN WE HAVE A VALID ID
  return (
    <main>
      <VantaBackground />
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
        <Link href="/">
          <button className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors">
            &larr; Back to Lobby
          </button>
        </Link>
      </div>
      
      {canvasId ? (
        <ReactFlowProvider>
          <DebateCanvas canvasId={canvasId} />
        </ReactFlowProvider>
      ) : (
        <div style={{ color: 'white', textAlign: 'center', paddingTop: '40vh', fontSize: '1.2rem' }}>
          Initializing Canvas...
        </div>
      )}
    </main>
  );
}