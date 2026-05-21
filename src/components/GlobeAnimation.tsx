import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const CITIES = [
  { name: 'Istanbul',    lat: 41.0082,  lng: 28.9784  },
  { name: 'Paris',       lat: 48.8566,  lng: 2.3522   },
  { name: 'New York',    lat: 40.7128,  lng: -74.0060 },
  { name: 'Tokyo',       lat: 35.6762,  lng: 139.6503 },
  { name: 'London',      lat: 51.5074,  lng: -0.1278  },
  { name: 'Dubai',       lat: 25.2048,  lng: 55.2708  },
  { name: 'Rome',        lat: 41.9028,  lng: 12.4964  },
  { name: 'Barcelona',   lat: 41.3851,  lng: 2.1734   },
  { name: 'Sydney',      lat: -33.8688, lng: 151.2093 },
  { name: 'Singapore',   lat: 1.3521,   lng: 103.8198 },
  { name: 'Mexico City', lat: 19.4326,  lng: -99.1332 },
  { name: 'Cairo',       lat: 30.0444,  lng: 31.2357  },
];

const CONNECTION_PAIRS = [
  [0, 1],  // Istanbul → Paris
  [1, 4],  // Paris → London
  [1, 2],  // Paris → New York
  [2, 10], // New York → Mexico City
  [0, 5],  // Istanbul → Dubai
  [5, 3],  // Dubai → Tokyo
  [3, 9],  // Tokyo → Singapore
  [8, 9],  // Sydney → Singapore
  [11, 5], // Cairo → Dubai
  [6, 7],  // Rome → Barcelona
];

const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

const ArcLine: React.FC<{ start: THREE.Vector3; end: THREE.Vector3 }> = ({ start, end }) => {
  const geometry = useMemo(() => {
    const distance = start.distanceTo(end);
    const mid = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    mid.normalize().multiplyScalar(2.5 + distance * 0.35);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const geo = new THREE.BufferGeometry();
    geo.setFromPoints(curve.getPoints(48));
    return geo;
  }, [start, end]);

  return (
    // @ts-expect-error — three.js <line> not in R3F intrinsic types
    <line geometry={geometry}>
      <lineBasicMaterial color="#f8981d" transparent opacity={0.7} linewidth={1} />
    </line>
  );
};

// Texture'lı dünya küresi — useTexture suspend eder, Suspense ile sarılır
const EarthSphere: React.FC<{ radius: number }> = ({ radius }) => {
  const earthTexture = useTexture(
    'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg'
  );
  return (
    <mesh>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        map={earthTexture}
        transparent
        opacity={0.75}
        emissive="#187fe7"
        emissiveIntensity={0.08}
      />
    </mesh>
  );
};

// Texture yüklenene kadar gösterilecek sade küre
const FallbackSphere: React.FC<{ radius: number }> = ({ radius }) => (
  <mesh>
    <sphereGeometry args={[radius, 32, 32]} />
    <meshBasicMaterial color="#187fe7" transparent opacity={0.3} />
  </mesh>
);

const DotGlobe: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const radius = 2.5;

  const dotsGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const dotCount = 500;
    for (let i = 0; i < dotCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / dotCount);
      const theta = Math.sqrt(dotCount * Math.PI) * phi;
      points.push(new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      ));
    }
    const geo = new THREE.BufferGeometry();
    geo.setFromPoints(points);
    return geo;
  }, []);

  const cityPositions = useMemo(
    () => CITIES.map((c) => latLngToVector3(c.lat, c.lng, radius)),
    []
  );

  const connections = useMemo(
    () => CONNECTION_PAIRS.map(([i, j]) => ({ start: cityPositions[i], end: cityPositions[j] })),
    [cityPositions]
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.00002, 0]}>
      {/* Dünya haritası — yüklenene kadar mavi küre fallback */}
      <Suspense fallback={<FallbackSphere radius={radius} />}>
        <EarthSphere radius={radius} />
      </Suspense>

      {/* Nokta grid overlay */}
      <points geometry={dotsGeometry}>
        <pointsMaterial
          size={0.015}
          color="#cbd5e1"
          sizeAttenuation
          transparent
          opacity={0.2}
        />
      </points>

      {/* Şehir noktaları */}
      {cityPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshBasicMaterial color="#f8981d" />
        </mesh>
      ))}

      {/* Bağlantı yayları */}
      {connections.map((conn, i) => (
        <ArcLine key={i} start={conn.start} end={conn.end} />
      ))}
    </group>
  );
};

const GlobeAnimation: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={0.5} />
      <DotGlobe />
    </Canvas>
  );
};

export default GlobeAnimation;
