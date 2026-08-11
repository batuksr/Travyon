import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/* ── Texture'lı dünya küresi — bump map ile kabartmalı ── */
const EarthSphere: React.FC<{ radius: number }> = ({ radius }) => {
  // Yerel, 500x500 gösterim boyutuna göre küçültülmüş/sıkıştırılmış dokular
  // (orijinali unpkg CDN'den 4096x2048 + 2048x1024, ~1.8MB idi — burada ~138KB).
  const [earthTexture, bumpTexture] = useTexture([
    '/textures/earth-blue-marble.webp',
    '/textures/earth-topology.webp',
  ]);

  return (
    <mesh>
      <sphereGeometry args={[radius, 88, 88]} />
      <meshStandardMaterial
        map={earthTexture}
        bumpMap={bumpTexture}
        bumpScale={0.65}
        roughness={0.8}
        metalness={0.05}
        emissive="#1a5fa8"
        emissiveIntensity={0.20}
      />
    </mesh>
  );
};

/* ── Dönen dünya grubu ── */
const RotatingGlobe: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const radius = 2.5;

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.40;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Doku yüklenene kadar hiçbir şey gösterme (yanlış görünen bir
          yer tutucu yerine boşluk — hazır olunca dünya direkt belirir) */}
      <Suspense fallback={null}>
        <EarthSphere radius={radius} />
      </Suspense>
    </group>
  );
};

/* ── Ana sahne ── */
const GlobeAnimation: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      {/* Düşük ambient — kontrastı artırır */}
      <ambientLight intensity={1.1} />
      {/* Ana güçlü ışık — karaların gölgesini oluşturur */}
      <directionalLight position={[6, 4, 5]} intensity={1.8} />
      {/* Arka dolgu ışığı — tamamen kararmayı önler */}
      <directionalLight position={[-4, -2, -3]} intensity={0.6} />
      <RotatingGlobe />
    </Canvas>
  );
};

export default GlobeAnimation;
