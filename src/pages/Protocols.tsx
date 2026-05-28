import { useState, useEffect, useCallback } from 'react';
import BlochSphere from '@/components/bloch/BlochSphere';
import FormulaBlock from '@/components/math/FormulaBlock';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Lock, Waves, RotateCw, Send } from 'lucide-react';
import { applyGate, getProbabilities, ketToBloch } from '@/lib/quantum';
import type { QubitState, BlochCoords } from '@/types/quantum';

/* ============================================================
   PROTOCOLO BB84
   ============================================================ */
function BB84Protocol() {
  const [step, setStep] = useState(0);
  const [aliceBasis, setAliceBasis] = useState<'Z' | 'X'>('Z');
  const [bobBasis, setBobBasis] = useState<'Z' | 'X'>('Z');
  const [aliceBit, setAliceBit] = useState<0 | 1>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aliceCoords, setAliceCoords] = useState<BlochCoords>(ketToBloch([1, 0] as [number, number], [0, 0] as [number, number]));
  const [bobCoords, setBobCoords] = useState<BlochCoords>(ketToBloch([1, 0] as [number, number], [0, 0] as [number, number]));
  const [trailA, setTrailA] = useState<[number, number, number][]>([]);
  const [trailB, setTrailB] = useState<[number, number, number][]>([]);

  const steps = [
    { title: 'Alice elige bit y base', desc: 'Alice genera un bit aleatorio (0 o 1) y elige una base (Z rectilinea o X diagonal)' },
    { title: 'Alice prepara el qubit', desc: 'Si base=Z: |0> o |1>. Si base=X: |+> o |->. Envia el qubit a Bob.' },
    { title: 'Bob mide en una base', desc: 'Bob elige aleatoriamente medir en base Z o X. Si coincide con Alice, obtiene el bit correcto.' },
    { title: 'Comparacion de bases', desc: 'Alice y Bob comparan publicamente que bases usaron. Solo conservan bits donde coincidieron.' },
  ];

  const runStep = useCallback((s: number) => {
    setStep(s);
    const bit = Math.random() > 0.5 ? 1 : 0;
    const aBasis = Math.random() > 0.5 ? 'X' : 'Z';
    const bBasis = Math.random() > 0.5 ? 'X' : 'Z';
    setAliceBit(bit as 0 | 1);
    setAliceBasis(aBasis);
    setBobBasis(bBasis);

    let aState: QubitState = { alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] };
    if (aBasis === 'Z') {
      aState = bit === 0 ? { alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] } : { alpha: [0, 0] as [number, number], beta: [1, 0] as [number, number] };
    } else {
      aState = bit === 0
        ? applyGate({ alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] }, 'H')
        : applyGate({ alpha: [0, 0] as [number, number], beta: [1, 0] as [number, number] }, 'H');
    }

    let bState = { ...aState };
    if (bBasis !== aBasis) {
      const randBit = Math.random() > 0.5 ? 1 : 0;
      if (bBasis === 'Z') {
        bState = randBit === 0 ? { alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] } : { alpha: [0, 0] as [number, number], beta: [1, 0] as [number, number] };
      } else {
        bState = randBit === 0
          ? applyGate({ alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] }, 'H')
          : applyGate({ alpha: [0, 0] as [number, number], beta: [1, 0] as [number, number] }, 'H');
      }
    }

    const aC = ketToBloch(aState.alpha, aState.beta);
    const bC = ketToBloch(bState.alpha, bState.beta);
    setAliceCoords(aC);
    setBobCoords(bC);
    setTrailA(prev => [...prev.slice(-30), [aC.x, aC.y, aC.z]]);
    setTrailB(prev => [...prev.slice(-30), [bC.x, bC.y, bC.z]]);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      runStep(step);
      const timer = setTimeout(() => {
        if (step < 3) setStep(s => s + 1);
        else setIsPlaying(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, step, runStep]);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-2xl text-white flex items-center gap-3">
            <Lock className="w-5 h-5 text-blue" /> BB84 — Distribucion de Claves
          </h3>
          <div className="flex gap-2">
            <button onClick={() => { setStep(0); setIsPlaying(true); }} className="btn-blue text-[11px] py-2 px-4">
              <span className="flex items-center gap-1.5"><Play className="w-3 h-3" /> Simular</span>
            </button>
            <button onClick={() => { setIsPlaying(false); setStep(0); setTrailA([]); setTrailB([]); }} className="btn-outline text-[11px] py-2 px-4">
              <span className="flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Reiniciar</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5">
          {steps.map((s, i) => (
            <button key={i} onClick={() => runStep(i)} className={`flex-1 text-center py-3 rounded-xl text-[11px] transition-all ${i === step ? 'bg-blue/[0.08] text-blue border border-blue/20' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'}`}>
              <div className="font-bold mb-0.5">{i + 1}</div>
              <div className="truncate">{s.title}</div>
            </button>
          ))}
        </div>

        <div className="text-sm text-white/50 mb-6 bg-white/[0.02] rounded-xl p-4 border border-white/5">
          {steps[step].desc}
        </div>

        {/* Math description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormulaBlock size="sm" label="Estado preparado por Alice" text="test" />
          <FormulaBlock size="sm" label="Matriz de Hadamard" text="H = (1/sqrt(2)) * [[1, 1], [1, -1]]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-center mb-3">
              <span className="font-serif text-lg text-blue">Alice</span>
              <div className="text-[10px] text-white/30 mt-0.5 tracking-wider">
                Bit: {aliceBit} | Base: <span className={aliceBasis === 'Z' ? 'text-blue' : 'text-white/50'}>{aliceBasis}</span>
              </div>
            </div>
            <BlochSphere coords={aliceCoords} trail={trailA} height="280px" color="#0066FF" showTrail />
          </div>
          <div>
            <div className="text-center mb-3">
              <span className="font-serif text-lg text-white/70">Bob</span>
              <div className="text-[10px] text-white/30 mt-0.5 tracking-wider">
                Base: <span className={bobBasis === 'Z' ? 'text-blue' : 'text-white/50'}>{bobBasis}</span>
                {aliceBasis === bobBasis ? <span className="text-emerald-400 ml-1.5">Coincide</span> : <span className="text-red-400 ml-1.5">Descartar</span>}
              </div>
            </div>
            <BlochSphere coords={bobCoords} trail={trailB} height="280px" color="#3385FF" showTrail />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROTOCOLO RAMSEY
   ============================================================ */
function RamseyProtocol() {
  const [phase, setPhase] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [trail, setTrail] = useState<[number, number, number][]>([]);

  const state = { alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] };
  const afterH = applyGate(state, 'H');
  const afterPhase = applyGate(afterH, 'RZ', [phase]);
  const afterH2 = applyGate(afterPhase, 'H');
  const coords = ketToBloch(afterH2.alpha, afterH2.beta);
  const probs = getProbabilities(afterH2);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        setPhase(p => { if (p >= 4 * Math.PI) { setIsRunning(false); return 4 * Math.PI; } return p + 0.05; });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  useEffect(() => { setTrail(prev => [...prev.slice(-50), [coords.x, coords.y, coords.z]]); }, [coords.x, coords.y, coords.z]);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-2xl text-white flex items-center gap-3">
            <Waves className="w-5 h-5 text-blue" /> Interferometria de Ramsey
          </h3>
          <div className="flex gap-2">
            <button onClick={() => setIsRunning(!isRunning)} className="btn-blue text-[11px] py-2 px-4">
              <span className="flex items-center gap-1.5"><Play className="w-3 h-3" /> {isRunning ? 'Pausar' : 'Iniciar'}</span>
            </button>
            <button onClick={() => { setPhase(0); setIsRunning(false); setTrail([]); }} className="btn-outline text-[11px] py-2 px-4">
              <span className="flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Reiniciar</span>
            </button>
          </div>
        </div>

        <div className="text-sm text-white/50 mb-6 bg-white/[0.02] rounded-xl p-4 border border-white/5">
          Secuencia: <span className="quantum-formula">H —&gt; Rotacion Z(phi) —&gt; H</span>. El qubit acumula fase durante la espera, creando interferencia constructiva/destructiva al aplicar el segundo Hadamard.
        </div>

        {/* Math description */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FormulaBlock size="sm" label="Paso 1: Hadamard" text="test" />
          <FormulaBlock size="sm" label="Paso 2: Fase RZ(phi)" text="test" />
          <FormulaBlock size="sm" label="Paso 3: Hadamard final" text="test" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <BlochSphere coords={coords} trail={trail} height="320px" color="#0066FF" showTrail />
          </div>
          <div className="space-y-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="label-tracked mb-2">Fase acumulada (phi)</div>
              <div className="quantum-value text-2xl">{(phase * 180 / Math.PI).toFixed(1)} deg</div>
              <input type="range" min="0" max={4 * Math.PI} step="0.01" value={phase}
                onChange={e => setPhase(Number(e.target.value))} className="w-full mt-3 h-0.5 bg-white/10 rounded-full appearance-none" style={{ accentColor: '#0066FF' }}
              />
            </div>

            <div className="glass-panel rounded-xl p-4">
              <div className="label-tracked mb-3">Circuito</div>
              <div className="flex items-center gap-2 text-xs mono text-white/40">
                <span className="gate-badge gate-badge-h py-1">H</span>
                <span className="text-white/20">-</span>
                <span className="px-2 py-1 rounded-full border border-amber-500/20 text-amber-400/60 bg-amber-500/[0.03] text-[10px]">RZ(phi)</span>
                <span className="text-white/20">-</span>
                <span className="gate-badge gate-badge-h py-1">H</span>
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4">
              <div className="label-tracked mb-3">Probabilidades finales</div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="quantum-formula">|0{'>'}</span><span className="quantum-value">{(probs.p0 * 100).toFixed(1)}%</span></div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue rounded-full transition-all" style={{ width: `${probs.p0 * 100}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="quantum-formula">|1{'>'}</span><span className="quantum-value">{(probs.p1 * 100).toFixed(1)}%</span></div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-white/40 rounded-full transition-all" style={{ width: `${probs.p1 * 100}%` }} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROTOCOLO HAHN ECHO
   ============================================================ */
function HahnEchoProtocol() {
  const [noisePhase, setNoisePhase] = useState(0);
  const [step, setStep] = useState(0);
  const [trail, setTrail] = useState<[number, number, number][]>([]);

  const initial = applyGate({ alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] }, 'H');

  let currentState = { ...initial };
  if (step >= 1) currentState = applyGate(currentState, 'RZ', [noisePhase]);
  if (step >= 2) currentState = applyGate(currentState, 'X');
  if (step >= 3) currentState = applyGate(currentState, 'RZ', [noisePhase]);
  if (step >= 4) currentState = applyGate(currentState, 'X');

  const coords = ketToBloch(currentState.alpha, currentState.beta);

  useEffect(() => { setTrail(prev => [...prev.slice(-40), [coords.x, coords.y, coords.z]]); }, [coords.x, coords.y, coords.z, step]);

  const steps = [
    { title: 'Preparacion |+>', desc: 'Inicializamos el qubit en |+> aplicando Hadamard a |0>' },
    { title: 'Ruido ambiental', desc: 'El entorno desfasa el qubit: aplicamos RZ(phi)' },
    { title: 'Flip X (pi-pulso)', desc: 'Volteamos el vector con Pauli-X: ahora el ruido actua en sentido inverso' },
    { title: 'Mismo ruido', desc: 'El mismo desfasamiento deshace el efecto anterior — el eco vuelve!' },
    { title: 'Verificacion', desc: 'El vector deberia estar de vuelta cerca de |+>' },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-2xl text-white flex items-center gap-3">
            <RotateCw className="w-5 h-5 text-blue" /> Eco de Espin de Hahn
          </h3>
          <button onClick={() => { setStep(0); setTrail([]); }} className="btn-outline text-[11px] py-2 px-4">
            <span className="flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Reiniciar</span>
          </button>
        </div>

        <div className="text-sm text-white/50 mb-6 bg-white/[0.02] rounded-xl p-4 border border-white/5">
          El ruido ambiental desfasa el vector en el ecuador. Tras un pulso pi (X), el mismo ruido actua en sentido inverso y <span className="text-blue">"desenrolla" (unwind)</span> el desfasamiento.
        </div>

        {/* Math description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormulaBlock size="sm" label="Secuencia Hahn Echo" text="test" />
          <FormulaBlock size="sm" label="Propiedad clave" text="X * RZ(phi) * X = RZ(-phi)  (inversion de la fase)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <BlochSphere coords={coords} trail={trail} height="320px" color="#0066FF" showTrail />
          </div>
          <div className="space-y-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="label-tracked mb-2">Pasos del Protocolo</div>
              <div className="space-y-1.5">
                {steps.map((s, i) => (
                  <button key={i} onClick={() => setStep(i)} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${i === step ? 'bg-blue/[0.08] text-blue border border-blue/20' : 'text-white/30 hover:bg-white/[0.02]'}`}>
                    <div className="font-bold">{i + 1}. {s.title}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-4">
              <div className="label-tracked mb-1">Fase de ruido (phi)</div>
              <div className="quantum-value text-lg">{(noisePhase * 180 / Math.PI).toFixed(0)} deg</div>
              <input type="range" min="0" max={Math.PI} step="0.01" value={noisePhase}
                onChange={e => setNoisePhase(Number(e.target.value))} className="w-full mt-2 h-0.5 bg-white/10 rounded-full appearance-none" style={{ accentColor: '#0066FF' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROTOCOLO TELETRANSPORTACION
   ============================================================ */
function TeleportProtocol() {
  const [step, setStep] = useState(0);
  const [trailA, setTrailA] = useState<[number, number, number][]>([]);
  const [trailB, setTrailB] = useState<[number, number, number][]>([]);

  const alicePsi = applyGate({ alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] }, 'H');
  const alicePsi2 = applyGate(alicePsi, 'S');

  const aliceCoords: BlochCoords = step === 0 ? ketToBloch(alicePsi2.alpha, alicePsi2.beta)
    : step === 1 ? { x: 0, y: 0, z: 0, theta: Math.PI / 2, phi: 0 }
    : step === 2 ? { x: 0, y: 0, z: 0, theta: Math.PI / 2, phi: 0 }
    : ketToBloch(alicePsi2.alpha, alicePsi2.beta);

  const bobCoords: BlochCoords = step === 0 ? { x: 0, y: 0, z: 1, theta: 0, phi: 0 }
    : step === 1 ? { x: 0, y: 0, z: 0, theta: Math.PI / 2, phi: 0 }
    : step === 2 ? { x: 0, y: 0, z: 0, theta: Math.PI / 2, phi: 0 }
    : ketToBloch(alicePsi2.alpha, alicePsi2.beta);

  const steps = [
    { title: 'Preparacion', desc: 'Alice tiene |psi>. Bob tiene |0>. Preparamos un par entrelazado.' },
    { title: 'Entrelazamiento', desc: 'Los qubits de Alice y Bob se entrelazan — ambos colapsan visualmente al centro.' },
    { title: 'Medicion de Alice', desc: 'Alice mide su qubit en la base de Bell y envia 2 bits clasicos a Bob.' },
    { title: 'Correccion de Bob', desc: 'Bob aplica la correccion apropiada y reconstruye |psi> exacto!' },
  ];

  useEffect(() => {
    setTrailA(prev => [...prev.slice(-20), [aliceCoords.x, aliceCoords.y, aliceCoords.z]]);
    setTrailB(prev => [...prev.slice(-20), [bobCoords.x, bobCoords.y, bobCoords.z]]);
  }, [aliceCoords.x, aliceCoords.y, aliceCoords.z, bobCoords.x, bobCoords.y, bobCoords.z]);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-2xl text-white flex items-center gap-3">
            <Send className="w-5 h-5 text-blue" /> Teleportacion Cuantica
          </h3>
          <button onClick={() => { setStep(0); setTrailA([]); setTrailB([]); }} className="btn-outline text-[11px] py-2 px-4">
            <span className="flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Reiniciar</span>
          </button>
        </div>

        <div className="text-sm text-white/50 mb-6 bg-white/[0.02] rounded-xl p-4 border border-white/5">
          Alice transfiere un estado cuantico desconocido |psi{'>'} a Bob usando un par EPR y 2 bits clasicos.
          <span className="text-blue-light block mt-1">Nota: No se transmite materia, solo informacion cuantica.</span>
        </div>

        {/* Math description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormulaBlock size="sm" label="Estado total inicial" text="test" />
          <FormulaBlock size="sm" label="Par EPR (Bell)" text="test" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-center mb-3">
                  <span className="font-serif text-lg text-blue">Alice</span>
                  <div className="text-[10px] text-white/30 tracking-wider">|psi{'>'} desconocido</div>
                </div>
                <BlochSphere coords={aliceCoords} trail={trailA} height="260px" color="#0066FF" showTrail={step !== 1 && step !== 2} />
              </div>
              <div>
                <div className="text-center mb-3">
                  <span className="font-serif text-lg text-white/70">Bob</span>
                  <div className="text-[10px] text-white/30 tracking-wider">Receptor</div>
                </div>
                <BlochSphere coords={bobCoords} trail={trailB} height="260px" color="#3385FF" showTrail={step !== 1 && step !== 2} />
              </div>
            </div>

            {/* Entanglement beam */}
            {(step === 1 || step === 2) && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-24 h-px bg-gradient-to-r from-blue via-white to-blue-light animate-pulse-subtle" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-xl p-4">
              <div className="label-tracked mb-3">Protocolo</div>
              <div className="space-y-1.5">
                {steps.map((s, i) => (
                  <button key={i} onClick={() => setStep(i)} className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${i === step ? 'bg-blue/[0.08] text-blue border border-blue/20' : 'text-white/30 hover:bg-white/[0.02]'}`}>
                    <div className="font-bold">{i + 1}. {s.title}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {step === 3 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel rounded-xl p-4 border-emerald-500/20">
                <div className="text-emerald-400 text-xs font-bold text-center">Estado reconstruido exitosamente!</div>
                <div className="text-[10px] text-white/30 text-center mt-1">|psi{'>'}_Bob = |psi{'>'}_Alice exacto</div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN PROTOCOLS PAGE
   ============================================================ */
const protocols = [
  { id: 'bb84', name: 'BB84', icon: Lock, component: BB84Protocol },
  { id: 'ramsey', name: 'Ramsey', icon: Waves, component: RamseyProtocol },
  { id: 'hahn', name: 'Hahn Echo', icon: RotateCw, component: HahnEchoProtocol },
  { id: 'teleport', name: 'Teleportacion', icon: Send, component: TeleportProtocol },
];

export default function Protocols() {
  const [activeProtocol, setActiveProtocol] = useState('bb84');
  const ActiveComponent = protocols.find(p => p.id === activeProtocol)?.component || BB84Protocol;

  return (
    <div className="min-h-screen bg-black px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <span className="label-tracked block mb-3">Simulaciones Guiadas</span>
        <h1 className="font-serif text-4xl md:text-5xl text-white mb-3">
          <span className="italic text-blue">Protocolos</span> Didacticos
        </h1>
        <p className="text-sm text-white/40 max-w-xl leading-relaxed">
          Simulaciones guiadas de protocolos cuanticos fundamentales. Explora paso a paso
          la fisica detras de cada algoritmo.
        </p>
      </motion.div>

      {/* Protocol selector */}
      <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-quantum pb-2">
        {protocols.map(p => {
          const Icon = p.icon;
          const isActive = activeProtocol === p.id;
          return (
            <button key={p.id} onClick={() => setActiveProtocol(p.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-blue/[0.08] text-blue border border-blue/20' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02] border border-transparent'}`}>
              <Icon className="w-4 h-4" />
              {p.name}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeProtocol} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
          <ActiveComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}