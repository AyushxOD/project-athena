// Location: client/components/VantaBackground.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import NET from 'vanta/dist/vanta.net.min.js';
import * as THREE from 'three';

// Define a more specific type for the Vanta effect object
type VantaEffect = {
  destroy: () => void;
};

const VantaBackground = () => {
  const vantaRef = useRef(null);
  // Use our new, more specific type instead of 'any'
  const [vantaEffect, setVantaEffect] = useState<VantaEffect | null>(null);

  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(
        NET({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyrocontrols: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0x4f46e5,
          backgroundColor: 0x111827,
          points: 10.0,
          maxDistance: 25.0,
          spacing: 20.0,
        })
      );
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return <div ref={vantaRef} style={{ width: '100vw', height: '100vh', position: 'absolute', zIndex: -1, top: 0, left: 0 }} />;
};

export default VantaBackground;