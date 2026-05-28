import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { BlochCoords } from '@/types/quantum';

/* ============================================================
   SHADER MATERIALS
   ============================================================ */

const holographicVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const holographicFragmentShader = `
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  // Fresnel effect — edge glow
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
  
  // Iridescent color shift based on viewing angle
  float angle = dot(viewDir, vNormal) * 0.5 + 0.5;
  vec3 baseColor = mix(uColor1, uColor2, angle);
  baseColor = mix(baseColor, uColor3, fresnel * 0.6);
  
  // Subtle wave pattern on surface
  float wave = sin(vPosition.y * 12.0 + uTime * 1.5) * 0.5 + 0.5;
  wave *= sin(vPosition.x * 8.0 + uTime * 0.8) * 0.5 + 0.5;
  baseColor += wave * 0.04;
  
  // Grid lines on sphere
  float gridLat = smoothstep(0.02, 0.0, abs(fract(vUv.y * 12.0) - 0.5));
  float gridLon = smoothstep(0.02, 0.0, abs(fract(vUv.x * 24.0) - 0.5));
  float grid = max(gridLat, gridLon) * 0.15;
  baseColor += vec3(grid * 0.5, grid * 0.8, grid);
  
  // Alpha: strong fresnel = visible edges, center is transparent
  float alpha = fresnel * 0.85 + grid * 0.3;
  alpha *= uOpacity;
  
  gl_FragColor = vec4(baseColor, alpha);
}
`;

const pulseVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const pulseFragmentShader = `
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
  float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
  float alpha = fresnel * uIntensity * (0.6 + pulse * 0.4);
  gl_FragColor = vec4(uColor, alpha);
}
`;

/* ============================================================
   CUSTOM SHADER MATERIAL SETUP
   ============================================================ */

function useHolographicMaterial(opacity: number) {
  return useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: holographicVertexShader,
      fragmentShader: holographicFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#0a1a4a') },
        uColor2: { value: new THREE.Color('#1a0a4a') },
        uColor3: { value: new THREE.Color('#0066ff') },
        uOpacity: { value: opacity },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return mat;
  }, [opacity]);
}

function usePulseMaterial(color: string, intensity: number) {
  return useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: pulseVertexShader,
      fragmentShader: pulseFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uIntensity: { value: intensity },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return mat;
  }, [color, intensity]);
}

/* ============================================================
   SPHERE SHELL — HOLOGRAPHIC
   ============================================================ */
function SphereShell() {
  const shellMat = useHolographicMaterial(1);
  const innerMat = useHolographicMaterial(0.6);
  const pulseMat = usePulseMaterial('#0066ff', 0.3);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    shellMat.uniforms.uTime.value = t;
    innerMat.uniforms.uTime.value = t;
    pulseMat.uniforms.uTime.value = t;
  });

  return (
    <group>
      {/* Outer holographic shell */}
      <mesh material={shellMat}>
        <sphereGeometry args={[1, 80, 80]} />
      </mesh>
      
      {/* Inner shell — slightly smaller, different phase */}
      <mesh material={innerMat} scale={0.97}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      
      {/* Pulse shell — breathing effect */}
      <mesh material={pulseMat} scale={1.01}>
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>
    </group>
  );
}

/* ============================================================
   GRID & MERIDIANS
   ============================================================ */
function SphereGrid() {
  const groupRef = useRef<THREE.Group>(null);
  
  const materials = useMemo(() => {
    return {
      equator: new THREE.LineBasicMaterial({ 
        color: '#0066ff', 
        transparent: true, 
        opacity: 0.35,
        linewidth: 1 
      }),
      meridianXZ: new THREE.LineBasicMaterial({ 
        color: '#3385ff', 
        transparent: true, 
        opacity: 0.2 
      }),
      meridianYZ: new THREE.LineBasicMaterial({ 
        color: '#3385ff', 
        transparent: true, 
        opacity: 0.2 
      }),
      lat: new THREE.LineBasicMaterial({ 
        color: '#1a5cff', 
        transparent: true, 
        opacity: 0.12 
      }),
    };
  }, []);

  const geometries = useMemo(() => {
    const circlePoints = (r: number, segments: number) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      return pts;
    };

    const equatorGeo = new THREE.BufferGeometry().setFromPoints(circlePoints(1, 128));
    
    const meridianXZGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      })
    );
    
    const meridianYZGeo = new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(0, Math.cos(a), Math.sin(a));
      })
    );

    // Latitude circles
    const latGeos: THREE.BufferGeometry[] = [];
    [0.35, 0.65, -0.35, -0.65].forEach((h) => {
      const r = Math.sqrt(1 - h * h);
      latGeos.push(new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 129 }, (_, i) => {
          const a = (i / 128) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r);
        })
      ));
    });

    return { equatorGeo, meridianXZGeo, meridianYZGeo, latGeos };
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      materials.equator.opacity = 0.25 + Math.sin(t * 0.8) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={new THREE.Line(geometries.equatorGeo, materials.equator)} rotation={[Math.PI / 2, 0, 0]} />
      <primitive object={new THREE.Line(geometries.meridianXZGeo, materials.meridianXZ)} />
      <primitive object={new THREE.Line(geometries.meridianYZGeo, materials.meridianYZ)} rotation={[0, Math.PI / 2, 0]} />
      {geometries.latGeos.map((geo, idx) => (
        <primitive key={idx} object={new THREE.Line(geo, materials.lat)} />
      ))}
    </group>
  );
}

/* ============================================================
   AXES — GLOWING
   ============================================================ */
function Axis({ from, to, color, label, labelOffset = 1.5 }: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  label: string;
  labelOffset?: number;
}) {
  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from), new THREE.Vector3(...to)
    ]);
  }, [from, to]);

  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ 
    color, 
    transparent: true, 
    opacity: 0.6 
  }), [color]);

  const dir = useMemo(() => new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).normalize(), [from, to]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);

  return (
    <group>
      {/* Main axis line */}
      <primitive object={new THREE.Line(lineGeo, lineMat)} />
      
      {/* Arrowhead */}
      <mesh position={to} quaternion={quat}>
        <coneGeometry args={[0.025, 0.06, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Glow line (thicker, transparent) */}
      <mesh position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} quaternion={quat}>
        <cylinderGeometry args={[0.006, 0.006, Math.sqrt(
          (to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2 + (to[2] - from[2]) ** 2
        ), 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
      
      {/* Label */}
      <Text
        position={[to[0] * labelOffset, to[1] * labelOffset, to[2] * labelOffset]}
        fontSize={0.16}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {label}
      </Text>
    </group>
  );
}

function Axes({ showAxes }: { showAxes: boolean }) {
  if (!showAxes) return null;
  return (
    <group>
      <Axis from={[0, 0, 0]} to={[1.3, 0, 0]} color="#ff4466" label="X" />
      <Axis from={[0, 0, 0]} to={[0, 1.3, 0]} color="#44ff88" label="Y" />
      <Axis from={[0, 0, 0]} to={[0, 0, 1.3]} color="#4488ff" label="Z" />
      
      {/* Axis glow orbs at origin */}
      <mesh>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      <pointLight position={[0, 0, 0]} color="#ffffff" intensity={0.3} distance={2} />
    </group>
  );
}

/* ============================================================
   STATE LABELS
   ============================================================ */
function StateLabels() {
  return (
    <group>
      {[
        { pos: [0, 0, 1.35] as [number, number, number], text: '|0⟩', color: '#4488ff' },
        { pos: [0, 0, -1.35] as [number, number, number], text: '|1⟩', color: '#4488ff' },
        { pos: [1.35, 0, 0] as [number, number, number], text: '|+⟩', color: '#ff4466' },
        { pos: [-1.35, 0, 0] as [number, number, number], text: '|-⟩', color: '#ff4466' },
        { pos: [0, 1.35, 0] as [number, number, number], text: '|+i⟩', color: '#44ff88' },
        { pos: [0, -1.35, 0] as [number, number, number], text: '|-i⟩', color: '#44ff88' },
      ].map(({ pos, text, color }) => (
        <group key={text}>
          <Text
            position={pos}
            fontSize={0.13}
            color={color}
            anchorX="center"
            anchorY="middle"
          >
            {text}
          </Text>
          {/* Small glow dot behind label */}
          <mesh position={[pos[0] * 0.95, pos[1] * 0.95, pos[2] * 0.95]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color={color} transparent opacity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ============================================================
   TRAIL — LUMINOUS
   ============================================================ */
function Trail({ points, color = '#0066ff' }: { points: [number, number, number][]; color?: string }) {
  if (points.length < 2) return null;
  
  const lineObj = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5
    );
    const geo = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(Math.min(points.length * 4, 200))
    );
    const mat = new THREE.LineBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.5,
      linewidth: 2 
    });
    return new THREE.Line(geo, mat);
  }, [points, color]);

  return (
    <group>
      <primitive object={lineObj} />
      {points.map((p, i) => {
        const t = i / points.length;
        return (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.012 * Math.max(0.2, t), 6, 6]} />
            <meshBasicMaterial 
              color={color} 
              transparent 
              opacity={0.35 * t} 
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ============================================================
   STATE VECTOR — ANIMATED WITH GLOW
   ============================================================ */
function StateVector({ coords, color = '#ffaa00' }: { coords: BlochCoords; color?: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const shaftRef = useRef<THREE.Mesh>(null);
  const prevCoords = useRef(coords);
  const interpCoords = useRef({ x: coords.x, y: coords.y, z: coords.z });
  
  const arrowLen = Math.sqrt(coords.x ** 2 + coords.y ** 2 + coords.z ** 2);
  
  const direction = useMemo(() => 
    new THREE.Vector3(coords.x, coords.y, coords.z).normalize(), 
    [coords]
  );
  
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return q;
  }, [direction]);

  // Smooth interpolation
  useFrame((_, delta) => {
    const lerpFactor = 1 - Math.exp(-12 * delta);
    interpCoords.current.x += (coords.x - interpCoords.current.x) * lerpFactor;
    interpCoords.current.y += (coords.y - interpCoords.current.y) * lerpFactor;
    interpCoords.current.z += (coords.z - interpCoords.current.z) * lerpFactor;

    if (shaftRef.current) {
      const mid = new THREE.Vector3(
        interpCoords.current.x / 2,
        interpCoords.current.y / 2,
        interpCoords.current.z / 2
      );
      shaftRef.current.position.copy(mid);
      
      const dir = new THREE.Vector3(
        interpCoords.current.x,
        interpCoords.current.y,
        interpCoords.current.z
      ).normalize();
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      shaftRef.current.quaternion.copy(q);
    }

    if (glowRef.current) {
      glowRef.current.position.set(
        interpCoords.current.x,
        interpCoords.current.y,
        interpCoords.current.z
      );
    }

    prevCoords.current = coords;
  });

  const endPoint: [number, number, number] = [coords.x, coords.y, coords.z];

  return (
    <group ref={groupRef}>
      {/* Shaft */}
      <mesh ref={shaftRef} quaternion={quaternion}>
        <cylinderGeometry args={[0.015, 0.015, arrowLen, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Arrowhead */}
      <mesh position={endPoint} quaternion={quaternion}>
        <coneGeometry args={[0.04, 0.08, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          metalness={0.8}
          roughness={0.15}
        />
      </mesh>

      {/* Tip glow */}
      <mesh ref={glowRef} position={endPoint}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
      
      {/* Outer glow */}
      <mesh position={endPoint}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} />
      </mesh>

      {/* Point light at tip */}
      <pointLight position={endPoint} color={color} intensity={4} distance={4} decay={2} />
    </group>
  );
}

/* ============================================================
   ORBITAL PARTICLES
   ============================================================ */
function OrbitalParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 120;
  
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      height: (Math.random() - 0.5) * 2.8,
      radius: 1.15 + Math.random() * 0.5,
      speed: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      size: 0.004 + Math.random() * 0.006,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    
    particles.forEach((p, i) => {
      const a = p.angle + t * p.speed;
      const r = p.radius + Math.sin(t * 2 + p.phase) * 0.05;
      dummy.position.set(
        Math.cos(a) * r,
        p.height + Math.sin(t * 1.5 + p.phase) * 0.1,
        Math.sin(a) * r
      );
      dummy.scale.setScalar(p.size * (0.8 + Math.sin(t * 3 + p.phase) * 0.2));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#4488ff" transparent opacity={0.5} />
    </instancedMesh>
  );
}

/* ============================================================
   RING SYSTEM
   ============================================================ */
function RingSystem() {
  const groupRef = useRef<THREE.Group>(null);
  
  const rings = useMemo(() => [
    { radius: 1.6, speed: 0.15, color: '#0066ff', opacity: 0.06, tilt: [0.5, 0.3, 0] },
    { radius: 1.8, speed: -0.1, color: '#3385ff', opacity: 0.04, tilt: [0.3, 0.8, 0] },
    { radius: 2.0, speed: 0.08, color: '#1a5cff', opacity: 0.03, tilt: [0.7, 0.2, 0.4] },
  ], []);

  useFrame((_state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, idx) => {
      child.rotation.z += rings[idx].speed * 0.01;
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} rotation={ring.tilt as [number, number, number]}>
          <ringGeometry args={[ring.radius - 0.003, ring.radius + 0.003, 128]} />
          <meshBasicMaterial color={ring.color} transparent opacity={ring.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================
   POST-PROCESSING SETUP
   ============================================================ */
function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom 
        intensity={1.2} 
        luminanceThreshold={0.2} 
        luminanceSmoothing={0.9} 
        mipmapBlur 
      />
      <Noise opacity={0.03} />
      <Vignette eskil={false} offset={0.1} darkness={0.8} />
    </EffectComposer>
  );
}

/* ============================================================
   MAIN SCENE
   ============================================================ */
interface SceneProps {
  coords: BlochCoords;
  trail: [number, number, number][];
  showAxes: boolean;
  showGrid: boolean;
  showTrail: boolean;
  color?: string;
}

function Scene({ coords, trail, showAxes, showGrid, showTrail, color = '#ffaa00' }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Gentle rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.04) * 0.015;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.008;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Lighting */}
      <ambientLight intensity={0.2} color="#aabbee" />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-3, -2, -4]} intensity={0.3} color="#4488ff" />
      <pointLight position={[0, 4, 0]} intensity={0.4} color="#ffaa00" distance={6} />
      <pointLight position={[0, -2, 3]} intensity={0.2} color="#4488ff" distance={4} />

      {/* Core sphere */}
      <SphereShell />
      
      {/* Grid */}
      {showGrid && <SphereGrid />}
      
      {/* Axes */}
      <Axes showAxes={showAxes} />
      <StateLabels />
      
      {/* State vector */}
      <StateVector coords={coords} color={color} />
      {showTrail && <Trail points={trail} color={color} />}
      
      {/* Ambient effects */}
      <OrbitalParticles />
      <RingSystem />

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        minDistance={2.2}
        maxDistance={5}
        autoRotate={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
      />
    </group>
  );
}

/* ============================================================
   LOADING FALLBACK
   ============================================================ */
function CanvasLoader() {
  return (
    <div className="flex items-center justify-center w-full h-full" style={{ minHeight: '300px' }}>
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-2 border-transparent border-t-[#0066ff] animate-spin mx-auto mb-3" />
        <div className="text-[10px] tracking-[0.2em] uppercase text-white/30 font-mono">
          Inicializando esfera cuántica
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PUBLIC COMPONENT
   ============================================================ */
interface BlochSphereProps {
  coords: BlochCoords;
  trail: [number, number, number][];
  width?: string;
  height?: string;
  color?: string;
  showAxes?: boolean;
  showGrid?: boolean;
  showTrail?: boolean;
  label?: string;
}

export default function BlochSphere({
  coords, trail, width = '100%', height = '400px', color = '#ffaa00',
  showAxes = true, showGrid = true, showTrail = true, label
}: BlochSphereProps) {
  return (
    <div 
      className="relative rounded-xl overflow-hidden"
      style={{
        width,
        height,
        minHeight: '320px',
        background: 'radial-gradient(ellipse at 30% 20%, #0a1628 0%, #060a12 50%, #030508 100%)',
        border: '1px solid rgba(0, 102, 255, 0.08)',
        boxShadow: 'inset 0 0 60px rgba(0, 102, 255, 0.03), 0 0 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      <Suspense fallback={<CanvasLoader />}>
        <Canvas
          camera={{ position: [2.4, 1.9, 2.4], fov: 36, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{ background: 'transparent' }}
          dpr={[1, 2]}
        >
          <Scene
            coords={coords}
            trail={trail}
            showAxes={showAxes}
            showGrid={showGrid}
            showTrail={showTrail}
            color={color}
          />
          <PostProcessing />
        </Canvas>
      </Suspense>
      
      {label && (
        <div 
          className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.25em] font-mono text-white/20"
        >
          {label}
        </div>
      )}
    </div>
  );
}
