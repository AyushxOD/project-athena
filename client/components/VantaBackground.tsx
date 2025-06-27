// Location: client/components/VantaBackground.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import NET from 'vanta/dist/vanta.net.min.js';
import * as THREE from 'three';

const VantaBackground = () => {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState<any>(null);

  useEffect(() => {
    if (!vantaEffect) {
      setVantaEffect(
        NET({
          el: vantaRef.current,
          THREE: THREE, // Pass the THREE.js library
          mouseControls: true,
          touchControls: true,
          gyrocontrols: false,
          minHeight: 200.0,
          minWidth: 200.0,
          scale: 1.0,
          scaleMobile: 1.0,
          color: 0x4f46e5, // A nice indigo color
          backgroundColor: 0x111827, // A dark gray, almost black
          points: 10.0,
          maxDistance: 25.0,
          spacing: 20.0,
        })
      );
    }
    // Cleanup function to destroy the effect when the component unmounts
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaEffect]);

  return <div ref={vantaRef} style={{ width: '100vw', height: '100vh', position: 'absolute', zIndex: -1 }} />;
};

export default VantaBackground;