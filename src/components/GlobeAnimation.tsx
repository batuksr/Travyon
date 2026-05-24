import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

/* ── Texture'lı dünya küresi — bump map ile kabartmalı ── */
const EarthSphere: React.FC<{ radius: number }> = ({ radius }) => {
  const [earthTexture, bumpTexture] = useTexture([
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png',
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

/* ── Texture yüklenene kadar fallback ── */
const FallbackSphere: React.FC<{ radius: number }> = ({ radius }) => (
  <mesh>
    <sphereGeometry args={[radius, 32, 32]} />
    <meshBasicMaterial color="#187fe7" transparent opacity={0.3} />
  </mesh>
);

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
      <Suspense fallback={<FallbackSphere radius={radius} />}>
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
