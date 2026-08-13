import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import * as opentype from 'opentype.js';

/* ══════════════════════════════════════════════
   Travyon 3D uçan logo — kullanıcının verdiği
   travyon-logo-orbit.html prototipinin React Three
   Fiber portu (idiomatic, GlobeAnimation.tsx ile aynı
   desen: <Canvas> + useFrame, manuel WebGL/RAF yok).
   "travyon" yazısı Varela Round font glif hatlarından
   (opentype.js) inşa ediliyor — standalone prototiple
   birebir aynı yazı tipi/extrude/renk ayarları.
   Sadece ana sayfa navbar'ında kullanılır.
═══════════════════════════════════════════════ */

const FONT_TTF_URL = 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/varelaround/VarelaRound-Regular.ttf';
const FONT_WOFF_URL = 'https://cdn.jsdelivr.net/npm/@fontsource/varela-round@5.3.0/files/varela-round-latin-400-normal.woff';

const WORD = 'travyon';
const INK_LETTERS = 4;
const FONT_SIZE = 1.7;
/* Yazının görsel büyütme çarpanı — kamera/yörünge matematiğinden (rx/ry/rz)
   bilerek ayrı tutuluyor: onlar hâlâ orijinal (1x) genişliğe göre hesaplanıyor,
   yani otomatik-sığdıran kamera bu büyümeyi telafi edip geri küçültmüyor —
   yazı gerçekten daha büyük görünüyor. */
const TEXT_SCALE = 1.30;

const EXTRUDE_SETTINGS = {
  depth: 0.40, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 16,
};

/* ── Malzemeler — modül kapsamında bir kez (standalone prototiple aynı renkler) ── */
const matOrange     = new THREE.MeshStandardMaterial({ color: '#e8863a', roughness: 0.5,  metalness: 0.05, side: THREE.DoubleSide });
const matOrangeDeep = new THREE.MeshStandardMaterial({ color: '#c25f1c', roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide });
/* "trav" mürekkep rengi sabit beyaz — koyu hero fotoğrafının üzerinde her zaman okunaklı olsun diye (site-özel karar, prototipteki tema-duyarlı renkten farklı) */
const matInk        = new THREE.MeshStandardMaterial({ color: '#f8f5f5', roughness: 0.45, metalness: 0.1 });

/* ── Glif → THREE.Shape[] dönüşümü ──
   Her M...Z alt-konturu ayrı işlenir; bounding-box içerme testiyle
   büyük konturların içine düşen küçük konturlar delik (hole) sayılır
   — 'a'/'o' gibi harflerin gözü için gerekli. */
interface BBox { minX: number; maxX: number; minY: number; maxY: number; }

const emptyBBox = (): BBox => ({ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
const growBBox = (b: BBox, x: number, y: number) => {
  if (x < b.minX) b.minX = x;
  if (x > b.maxX) b.maxX = x;
  if (y < b.minY) b.minY = y;
  if (y > b.maxY) b.maxY = y;
};
const bboxArea = (b: BBox) => Math.max(0, b.maxX - b.minX) * Math.max(0, b.maxY - b.minY);
const bboxContains = (outer: BBox, inner: BBox) =>
  inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY;

interface Contour { commands: opentype.PathCommand[]; bbox: BBox; }

const glyphToShapes = (commands: opentype.PathCommand[]): THREE.Shape[] => {
  const contours: Contour[] = [];
  let current: Contour | null = null;
  for (const c of commands) {
    if (c.type === 'M') {
      current = { commands: [c], bbox: emptyBBox() };
      growBBox(current.bbox, c.x, -c.y);
      contours.push(current);
    } else if (current) {
      current.commands.push(c);
      if (c.type !== 'Z') growBBox(current.bbox, c.x, -c.y);
    }
  }

  contours.sort((a, b) => bboxArea(b.bbox) - bboxArea(a.bbox));

  const shapes: Array<THREE.Shape & { __bbox?: BBox }> = [];
  for (const contour of contours) {
    const outer = shapes.find((s) => s.__bbox && bboxContains(s.__bbox, contour.bbox));
    const target: THREE.Shape | THREE.Path = outer ? new THREE.Path() : new THREE.Shape();
    for (const c of contour.commands) {
      switch (c.type) {
        case 'M': target.moveTo(c.x, -c.y); break;
        case 'L': target.lineTo(c.x, -c.y); break;
        case 'C': target.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y); break;
        case 'Q': target.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y); break;
        case 'Z': target.closePath(); break;
      }
    }
    if (outer) {
      outer.holes.push(target as THREE.Path);
    } else {
      const shape = target as THREE.Shape & { __bbox?: BBox };
      shape.__bbox = contour.bbox;
      shapes.push(shape);
    }
  }
  return shapes;
};

/* ── "travyon" yazısı — yüklenen fonttan harf harf extrude edilip ortalanır ── */
interface WordmarkPart { geometry: THREE.ExtrudeGeometry; ink: boolean; }
interface Wordmark { parts: WordmarkPart[]; wordWidth: number; }

const buildWordmark = (font: opentype.Font): Wordmark => {
  const glyphPaths = font.getPaths(WORD, 0, 0, FONT_SIZE);
  const parts: WordmarkPart[] = [];
  glyphPaths.forEach((path, i) => {
    const shapes = glyphToShapes(path.commands);
    if (!shapes.length) return;
    const geometry = new THREE.ExtrudeGeometry(shapes, EXTRUDE_SETTINGS);
    parts.push({ geometry, ink: i < INK_LETTERS });
  });

  const box = new THREE.Box3();
  parts.forEach((p) => {
    p.geometry.computeBoundingBox();
    if (p.geometry.boundingBox) box.union(p.geometry.boundingBox);
  });
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  parts.forEach((p) => p.geometry.translate(-center.x, -center.y, -center.z));

  return { parts, wordWidth: size.x };
};

/* Fontu bir kez yükler (TTF önce, olmazsa WOFF), sonuç modül kapsamında paylaşılır.
   Not: opentype.js v2'de load()/loadSync() deprecated stub'a dönüştü (senkron
   undefined döner) — bu yüzden fetch + opentype.parse(arrayBuffer) kullanılıyor. */
const fetchFont = async (url: string): Promise<opentype.Font> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return opentype.parse(buffer);
};

let fontPromise: Promise<opentype.Font> | null = null;
const loadWordmarkFont = (): Promise<opentype.Font> => {
  if (!fontPromise) {
    fontPromise = fetchFont(FONT_TTF_URL).catch(() => fetchFont(FONT_WOFF_URL));
  }
  return fontPromise;
};

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

/* ── Uçağı yörüngede dolaştıran animasyon (orijinal loop() fonksiyonunun portu) ── */
const OrbitingPlane: React.FC<{ rx: number; ry: number; rz: number }> = ({ rx, ry, rz }) => {
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
    group.position.set(rx * Math.cos(a), ry * Math.sin(a * 2) * 0.5, rz * Math.sin(a));
    dir.set(-rx * Math.sin(a), ry * Math.cos(a * 2), rz * Math.cos(a)).normalize();
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

/* ── Kamerayı içeriğe göre konumlandırır (orijinal frame() fonksiyonunun portu) ── */
const CameraRig: React.FC<{ rx: number; ry: number; rz: number }> = ({ rx, ry, rz }) => {
  const { camera, size } = useThree();
  /* useLayoutEffect: kamerayı ilk boyanmadan ÖNCE konumlandırır — useEffect
     kullanılsaydı Three.js'in varsayılan kamera konumuyla (çok yakın) bir
     kare çizilip sonra düzeltilirdi, bu da "büyük/patlayan" başlangıç
     yanıp sönmesine (flash) yol açıyordu. */
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const spanX = (rx + 1.6) * 2;
    const spanY = (ry + 1.6) * 2;
    const aspect = size.width / size.height;
    const fov = (cam.fov * Math.PI) / 180;
    const fitH = (spanY / 2) / Math.tan(fov / 2);
    const fitW = (spanX / 2) / Math.tan(fov / 2) / aspect;
    const dist = Math.max(fitH, fitW) * 1.05 + rz;
    cam.position.set(0, dist * 0.14, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size, rx, ry, rz]);
  return null;
};

const TravyonLogoOrbit: React.FC = () => {
  const [wordmark, setWordmark] = useState<Wordmark | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWordmarkFont()
      .then((font) => {
        if (!cancelled) setWordmark(buildWordmark(font));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!wordmark) return null;

  const rx = wordmark.wordWidth / 2 + 1.9;
  const ry = 1.15;
  const rz = 3.4;

  return (
    <Canvas
      camera={{ fov: 30, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <hemisphereLight args={[0xffffff, 0xcbc8c4, 1.15]} />
      <directionalLight position={[4, 6, 8]} intensity={1.6} />
      <directionalLight position={[-6, 2, -4]} intensity={0.5} />
      <group scale={TEXT_SCALE}>
        {wordmark.parts.map((p, i) => (
          <mesh key={i} geometry={p.geometry} material={p.ink ? matInk : matOrange} />
        ))}
      </group>
      <OrbitingPlane rx={rx} ry={ry} rz={rz} />
      <CameraRig rx={rx} ry={ry} rz={rz} />
    </Canvas>
  );
};

export default TravyonLogoOrbit;
