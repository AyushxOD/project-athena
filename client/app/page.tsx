// Location: client/app/page.tsx
'use client';
import dynamic from 'next/dynamic';
import React from 'react';
import { ReactFlowProvider } from 'reactflow'; // <-- 1. IMPORT THE PROVIDER
import VantaBackground from '../components/VantaBackground'; // <-- 1. IMPORT IT



// This is the magic. We use Next.js's dynamic import function.
// The key is `{ ssr: false }`, which disables Server-Side Rendering for this component.
const DebateCanvas = dynamic(() => import('../components/DebateCanvas'), {
  ssr: false,
  // Optional: We can show a simple loading message while the component's code is downloaded.
  loading: () => (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h1>Loading Interactive Canvas...</h1>
    </div>
  ),
});

export default function Home() {
  return (
    <main>
      {/* 2. WRAP THE CANVAS IN THE PROVIDER */}
      <VantaBackground /> {/* <-- 2. ADD IT BACK HERE */}

      <ReactFlowProvider>
        <DebateCanvas />
      </ReactFlowProvider>
    </main>
  );
}