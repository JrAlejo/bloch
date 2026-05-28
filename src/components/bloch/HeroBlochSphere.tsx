import { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

/* ============================================================
   SPHERE SHELL — Crystal + Outer Glow Ring
   ============================================================ */
function SphereShell() {
  return (
    <group>
      {/* Outer shell */}
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color="#0a1a3a"
          transparent
          opacity={0.25}
          roughness={0.02}
          metalness={0.9}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.FrontSide}
        />
      </mesh>
      {/* Inner dark shell */}
      <mesh>
        <sphereGeometry args={[0.99, 64, 64]} />
        <meshPhysicalMaterial
          color="#050a14"
          transparent
          opacity={0.4}
          roughness={0.15}
          metalness={0.7}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/* ============================================================
   GRID — Dense, bright blue palette
   ============================================================ */
function SphereGrid() {
  const eqMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#0066ff', transparent: true, opacity: 0.55
  }), []);
  const latMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#1a5cff', transparent: true, opacity: 0.28
  }), []);
  const merMat = useMemo(() => new THREE.LineBasicMaterial({
    color: '#3385ff', transparent: true, opacity: 0.35
  }), []);

  // Build geometries once
  const equatorGeo = useMemo(() => {
    const pts = Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  const meridianGeos = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    for (let lon = 0; lon < 8; lon++) {
      const pts = Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(a) * Math.cos((lon / 8) * Math.PI),
          Math.sin(a),
          Math.cos(a) * Math.sin((lon / 8) * Math.PI)
        );
      });
      geos.push(new THREE.BufferGeometry().setFromPoints(pts));
    }
    return geos;
  }, []);

  const latHeights = useMemo(() => [0.2, 0.4, 0.6, 0.8], []);

  return (
    <group>
      {/* Equator */}
      <primitive object={new THREE.Line(equatorGeo, eqMat)} rotation={[Math.PI / 2, 0, 0]} />

      {/* Latitudes — both hemispheres */}
      {latHeights.map((h, i) => {
        const r = Math.sqrt(1 - h * h);
        const pts = Array.from({ length: 129 }, (_, j) => {
          const a = (j / 128) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r);
        });
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <group key={`lat-${i}`}>
            <primitive object={new THREE.Line(geo, latMat)} />
            <primitive object={new THREE.Line(geo.clone(), latMat)} position={[0, -h * 2, 0]} />
          </group>
        );
      })}

      {/* Meridians */}
      {meridianGeos.map((geo, i) => (
        <primitive key={`mer-${i}`} object={new THREE.Line(geo, merMat)} />
      ))}
    </group>
  );
}

/* ============================================================
   AXES — Blue palette matching page theme
   ============================================================ */
function Axis({ from, to, color, label, labelOffset = 1.4 }: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  label: string;
  labelOffset?: number;
}) {
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from), new THREE.Vector3(...to)
    ]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, linewidth: 2 });
    return new THREE.Line(geo, mat);
  }, [from, to, color]);

  const dir = useMemo(() => new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize(), [from, to]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);

  return (
    <group>
      <primitive object={lineObj} />
      <mesh position={to} quaternion={quat}>
        <coneGeometry args={[0.03, 0.07, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Text
        position={[to[0] * labelOffset, to[1] * labelOffset, to[2] * labelOffset]}
        fontSize={0.15}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

function StateLabels() {
  return (
    <group>
      <Text position={[0, 0, 1.2]} fontSize={0.11} color="#3385ff" anchorX="center" anchorY="middle">
        |0&#x27e9;
      </Text>
      <Text position={[0, 0, -1.2]} fontSize={0.11} color="#3385ff" anchorX="center" anchorY="middle">
        |1&#x27e9;
      </Text>
      <Text position={[1.2, 0, 0]} fontSize={0.11} color="#ff4466" anchorX="center" anchorY="middle">
        |+&#x27e9;
      </Text>
      <Text position={[-1.2, 0, 0]} fontSize={0.11} color="#ff4466" anchorX="center" anchorY="middle">
        |-&#x27e9;
      </Text>
    </group>
  );
}

function Axes() {
  return (
    <group>
      <Axis from={[0, 0, 0]} to={[1.22, 0, 0]} color="#ff4466" label="X" />
      <Axis from={[0, 0, 0]} to={[0, 1.22, 0]} color="#44ff88" label="Y" />
      <Axis from={[0, 0, 0]} to={[0, 0, 1.22]} color="#0066ff" label="Z" />
      <StateLabels />
    </group>
  );
}

/* ============================================================
   STATE VECTOR — Mouse-following, amber
   ============================================================ */
function StateVector({ mouseRef }: { mouseRef: React.MutableRefObject<{x:number;y:number}> }) {
  const groupRef = useRef<THREE.Group>(null);
  const prevPos = useRef(new THREE.Vector3(0.7, 0.5, 0.5).normalize());

  useFrame((_state, delta) => {
    const mx = mouseRef.current.x * 0.8;
    const my = mouseRef.current.y * 0.8;
    const mz = 0.6;
    const len = Math.sqrt(mx*mx + my*my + mz*mz) || 1;

    const target = new THREE.Vector3(mx/len, my/len, mz/len);
    prevPos.current.lerp(target, 1 - Math.exp(-2.5 * delta));
    prevPos.current.normalize();

    const p = prevPos.current;
    const arrowLen = p.length();
    const mid = p.clone().multiplyScalar(0.5);
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p);

    if (groupRef.current) {
      groupRef.current.children[0].position.copy(mid);
      groupRef.current.children[0].quaternion.copy(q);
      groupRef.current.children[0].scale.set(1, arrowLen, 1);
      groupRef.current.children[1].position.copy(p);
      groupRef.current.children[1].quaternion.copy(q);
      groupRef.current.children[2].position.copy(p);
      groupRef.current.children[3].position.copy(p);
    }
  });

  const color = '#e5a044';
  return (
    <group ref={groupRef}>
      <mesh>
        <cylinderGeometry args={[0.018, 0.018, 1, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh>
        <coneGeometry args={[0.045, 0.09, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
      <pointLight color={color} intensity={2.5} distance={3} decay={2} />
    </group>
  );
}

/* ============================================================
   ORBITAL PARTICLES — Brighter blue
   ============================================================ */
function OrbitalParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 150;

  const particles = useMemo(() =>
    Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      height: (Math.random() - 0.5) * 3,
      radius: 1.1 + Math.random() * 0.6,
      speed: 0.1 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      size: 0.004 + Math.random() * 0.007,
    })), []
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const a = p.angle + t * p.speed;
      const r = p.radius + Math.sin(t * 1.5 + p.phase) * 0.05;
      dummy.position.set(Math.cos(a) * r, p.height + Math.sin(t + p.phase) * 0.08, Math.sin(a) * r);
      dummy.scale.setScalar(p.size * (0.8 + Math.sin(t * 2 + p.phase) * 0.2));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#3385ff" transparent opacity={0.55} />
    </instancedMesh>
  );
}

/* ============================================================
   ROTATING RINGS — Blue palette
   ============================================================ */
function RotatingRings() {
  const groupRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => [
    { radius: 1.4, speed: 0.12, color: '#0066ff', opacity: 0.12, tilt: [0.4, 0.2, 0] as [number, number, number] },
    { radius: 1.65, speed: -0.08, color: '#3385ff', opacity: 0.08, tilt: [0.3, 0.6, 0] as [number, number, number] },
    { radius: 1.85, speed: 0.05, color: '#1a5cff', opacity: 0.06, tilt: [0.6, 0.1, 0.3] as [number, number, number] },
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      child.rotation.z = t * rings[i].speed;
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={ring.tilt}>
          <ringGeometry args={[ring.radius - 0.004, ring.radius + 0.004, 128]} />
          <meshBasicMaterial color={ring.color} transparent opacity={ring.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   SCENE
   ============================================================ */
function Scene({ mouseRef }: { mouseRef: React.MutableRefObject<{x:number;y:number}> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.008 + t * 0.01;
    groupRef.current.rotation.x = Math.sin(t * 0.03) * 0.005;
  });

  return (
    <group>
      <ambientLight intensity={0.35} color="#c0c8d8" />
      <directionalLight position={[4, 6, 4]} intensity={1} color="#ffffff" />
      <directionalLight position={[-3, -2, -4]} intensity={0.4} color="#58c4dc" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#e5a044" distance={5} />

      <group ref={groupRef}>
        <SphereShell />
        <SphereGrid />
        <Axes />
        <StateVector mouseRef={mouseRef} />
      </group>

      <OrbitalParticles />
      <RotatingRings />

      <OrbitControls
        enablePan={false}
        minDistance={2}
        maxDistance={4.5}
        autoRotate={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
      />
    </group>
  );
}

/* ============================================================
   LOADER
   ============================================================ */
function Loader() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#0066ff] animate-spin" />
    </div>
  );
}

/* ============================================================
   PUBLIC — Fixed background
   ============================================================ */
export default function HeroBlochSphere() {
  const mouseRef = useRef({ x: 0.3, y: 0.2 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 0, pointerEvents: 'none', background: '#000000' }}
    >
      <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
        <Suspense fallback={<Loader />}>
          <Canvas
            camera={{ position: [2.2, 1.8, 2.2], fov: 38, near: 0.1, far: 50 }}
            gl={{
              antialias: true,
              alpha: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.3,
            }}
            style={{ background: 'transparent' }}
            dpr={Math.min(window.devicePixelRatio, 2)}
          >
            <Scene mouseRef={mouseRef} />
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
}
