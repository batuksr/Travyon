import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import TravyonLogo from './TravyonLogo';

/* ══════════════════════════════════════════════
   Travyon navbar logosu — düz "travyon" yazısı (TravyonLogo,
   sitenin her yerinde kullanılan aynı wordmark) üzerinde yörüngede
   dönen 3D kağıt uçak. Yazı artık 3D/glif değil, TravyonLogo ile
   birebir aynı — sadece uçak animasyonu Three.js ile çiziliyor.
   Sadece ana sayfa navbar'ında kullanılır.
═══════════════════════════════════════════════ */

const matOrange     = new THREE.MeshStandardMaterial({ color: '#e8863a', roughness: 0.5,  metalness: 0.05, side: THREE.DoubleSide });
const matOrangeDeep = new THREE.MeshStandardMaterial({ color: '#c25f1c', roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });

/* ── Kağıt uçak — üçgen köşeler ── */
const NOSE = [1.90, 0.05, 0], RIDGE = [-1.90, 0.48, 0], LWT = [-1.70, -0.18, -1.70],
  RWT = [-1.70, -0.18, 1.70], KEEL = [-1.55, -0.98, 0], KNOSE = [1.55, -0.02, 0];

const triGeometry = (a: number[], b: number[], c: number[]): THREE.BufferGeometry => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
  g.computeVertexNormals();
  return g;
};
const PLANE_GEOMETRIES = [
  { geometry: triGeometry(NOSE, RIDGE, LWT), material: matOrange },
  { geometry: triGeometry(NOSE, RWT, RIDGE), material: matOrange },
  { geometry: triGeometry(KNOSE, RIDGE, KEEL), material: matOrangeDeep },
  { geometry: triGeometry(KNOSE, KEEL, RIDGE), material: matOrangeDeep },
];

/* Yazı artık sabit HTML olduğu için yörünge yarıçapları da sabit —
   önceki 3D yazının genişliğine göre ayarlanmış değerlerle aynı ölçekte. */
const RX = 3.5, RY = 1.15, RZ = 3.4;

/* ── Uçağı yörüngede dolaştıran animasyon (orijinal loop() fonksiyonunun portu) ── */
const OrbitingPlane: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const angle = useRef(0);
  const forward = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    angle.current += 0.012;
    const a = angle.current;
    group.position.set(RX * Math.cos(a), RY * Math.sin(a * 2) * 0.5, RZ * Math.sin(a));
    dir.set(-RX * Math.sin(a), RY * Math.cos(a * 2), RZ * Math.cos(a)).normalize();
    quat.setFromUnitVectors(forward, dir);
    group.quaternion.copy(quat);
    group.rotateX(0.6);
  });

  return (
    <group ref={groupRef} scale={0.45}>
      {PLANE_GEOMETRIES.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={p.material} />
      ))}
    </group>
  );
};

/* ── Kamerayı sabit yörünge alanına göre konumlandırır ── */
const CameraRig: React.FC = () => {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const spanX = (RX + 1.6) * 2;
    const spanY = (RY + 1.6) * 2;
    const aspect = size.width / size.height;
    const fov = (cam.fov * Math.PI) / 180;
    const fitH = (spanY / 2) / Math.tan(fov / 2);
    const fitW = (spanX / 2) / Math.tan(fov / 2) / aspect;
    const dist = Math.max(fitH, fitW) * 1.05 + RZ;
    cam.position.set(0, dist * 0.14, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
};

const TravyonLogoOrbit: React.FC = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <TravyonLogo size={80} light className="relative z-10" />
    <Canvas
      camera={{ fov: 30, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: 'transparent', position: 'absolute', inset: 0 }}
    >
      <hemisphereLight args={[0xffffff, 0xcbc8c4, 1.15]} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} />
      <directionalLight position={[-6, 2, -4]} intensity={0.5} />
      <OrbitingPlane />
      <CameraRig />
    </Canvas>
  </div>
);

export default TravyonLogoOrbit;
