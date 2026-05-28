import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import BlochSphere from '@/components/bloch/BlochSphere';
import FormulaBlock from '@/components/math/FormulaBlock';
import { useQuantumStore } from '@/store/quantumStore';
import type { GateName, QubitState, BlochCoords, Probabilities } from '@/types/quantum';
import { applyGate, getProbabilities, ketToBloch, slerp, formatProbability } from '@/lib/quantum';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Plus, Trash2, RotateCcw } from 'lucide-react';

const ALL_GATES: { name: GateName; label: string; badge: string; desc: string; formula: string }[] = [
  { name: 'X', label: 'X', badge: 'gate-badge-x', desc: 'Pauli-X', formula: 'X|psi> = X(alpha|0>+beta|1>) = alpha|1> + beta|0>' },
  { name: 'Y', label: 'Y', badge: 'gate-badge-y', desc: 'Pauli-Y', formula: 'Y|psi> = i*alpha|1> - i*beta|0>' },
  { name: 'Z', label: 'Z', badge: 'gate-badge-z', desc: 'Pauli-Z', formula: 'Z|psi> = alpha|0> - beta|1>' },
  { name: 'H', label: 'H', badge: 'gate-badge-h', desc: 'Hadamard', formula: 'H|psi> = (alpha+beta)/sqrt(2)|0> + (alpha-beta)/sqrt(2)|1>' },
  { name: 'S', label: 'S', badge: 'gate-badge-s', desc: 'Phase', formula: 'S|psi> = alpha|0> + i*beta|1>' },
  { name: 'T', label: 'T', badge: 'gate-badge-t', desc: 'pi/8', formula: 'T|psi> = alpha|0> + e^(i*pi/4)*beta|1>' },
  { name: 'RX', label: 'RX', badge: 'gate-badge-x', desc: 'Rot-X', formula: 'RX(theta)|psi> = cos(theta/2)|psi> - i*sin(theta/2)*X|psi>' },
  { name: 'RY', label: 'RY', badge: 'gate-badge-y', desc: 'Rot-Y', formula: 'RY(theta)|psi> = cos(theta/2)|psi> - i*sin(theta/2)*Y|psi>' },
  { name: 'RZ', label: 'RZ', badge: 'gate-badge-z', desc: 'Rot-Z', formula: 'RZ(theta)|psi> = e^(-i*theta/2)*alpha|0> + e^(i*theta/2)*beta|1>' },
];

export default function TimelineLab() {
  const timeline = useQuantumStore(s => s.timeline);
  const addGateToInstant = useQuantumStore(s => s.addGateToInstant);
  const removeGateFromInstant = useQuantumStore(s => s.removeGateFromInstant);
  const addTimelineInstant = useQuantumStore(s => s.addTimelineInstant);
  const removeTimelineInstant = useQuantumStore(s => s.removeTimelineInstant);
  const resetTimeline = useQuantumStore(s => s.resetTimeline);
  const config = useQuantumStore(s => s.config);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [selectedGate, setSelectedGate] = useState<GateName>('X');
  const [selectedQubit, setSelectedQubit] = useState<0 | 1>(0);
  const [trail1, setTrail1] = useState<[number, number, number][]>([]);
  const [trail2, setTrail2] = useState<[number, number, number][]>([]);

  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const computeAllStates = useCallback((): { states: QubitState[]; coords: BlochCoords[]; probs: Probabilities[] }[] => {
    let s1: QubitState = { alpha: [1, 0], beta: [0, 0] };
    let s2: QubitState = { alpha: [1, 0], beta: [0, 0] };

    const results: { states: QubitState[]; coords: BlochCoords[]; probs: Probabilities[] }[] = [
      { states: [{ ...s1 }, { ...s2 }], coords: [ketToBloch(s1.alpha, s1.beta), ketToBloch(s2.alpha, s2.beta)], probs: [getProbabilities(s1), getProbabilities(s2)] }
    ];

    for (const instant of timeline) {
      for (const gate of instant.gates) {
        const target = gate.qubitIndices?.[0] ?? 0;
        if (target === 0) s1 = applyGate(s1, gate.name, gate.params);
        else s2 = applyGate(s2, gate.name, gate.params);
      }
      results.push({
        states: [{ ...s1 }, { ...s2 }],
        coords: [ketToBloch(s1.alpha, s1.beta), ketToBloch(s2.alpha, s2.beta)],
        probs: [getProbabilities(s1), getProbabilities(s2)]
      });
    }
    return results;
  }, [timeline]);

  const allStates = useMemo(() => computeAllStates(), [computeAllStates]);

  const getCurrentDisplayState = useCallback((): { coords: BlochCoords[]; probs: Probabilities[] } => {
    const globalT = currentStep + subStep;
    const stepIdx = Math.min(Math.floor(globalT), allStates.length - 2);
    const localT = globalT - stepIdx;

    const from = allStates[stepIdx];
    const to = allStates[stepIdx + 1];

    const coords: BlochCoords[] = [
      ketToBloch(slerp(from.states[0].alpha, from.states[0].beta, to.states[0].alpha, to.states[0].beta, localT).alpha, slerp(from.states[0].alpha, from.states[0].beta, to.states[0].alpha, to.states[0].beta, localT).beta),
      ketToBloch(slerp(from.states[1].alpha, from.states[1].beta, to.states[1].alpha, to.states[1].beta, localT).alpha, slerp(from.states[1].alpha, from.states[1].beta, to.states[1].alpha, to.states[1].beta, localT).beta)
    ];
    const probs: Probabilities[] = [
      getProbabilities(slerp(from.states[0].alpha, from.states[0].beta, to.states[0].alpha, to.states[0].beta, localT)),
      getProbabilities(slerp(from.states[1].alpha, from.states[1].beta, to.states[1].alpha, to.states[1].beta, localT))
    ];
    return { coords, probs };
  }, [allStates, currentStep, subStep]);

  const displayState = getCurrentDisplayState();

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setSubStep(prev => {
        const next = prev + dt * playSpeed;
        if (next >= 1) {
          setCurrentStep(s => {
            if (s >= timeline.length - 1) {
              setIsPlaying(false);
              return s;
            }
            return s + 1;
          });
          return 0;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, playSpeed, timeline.length]);

  useEffect(() => {
    if (!isPlaying) return;
    const ds = displayState;
    setTrail1(prev => {
      const p = [...prev, [ds.coords[0].x, ds.coords[0].y, ds.coords[0].z] as [number, number, number]];
      if (p.length > config.trailLength) p.shift();
      return p;
    });
    setTrail2(prev => {
      const p = [...prev, [ds.coords[1].x, ds.coords[1].y, ds.coords[1].z] as [number, number, number]];
      if (p.length > config.trailLength) p.shift();
      return p;
    });
  }, [displayState, isPlaying, config.trailLength]);

  const handlePlay = () => {
    if (currentStep >= timeline.length - 1 && subStep >= 1) {
      setCurrentStep(0);
      setSubStep(0);
      setTrail1([]);
      setTrail2([]);
    }
    setIsPlaying(!isPlaying);
    lastTimeRef.current = 0;
  };

  const handleStepChange = (val: number) => {
    setCurrentStep(val);
    setSubStep(0);
    setIsPlaying(false);
  };

  const handleAddGate = () => {
    if (selectedGate === 'RX' || selectedGate === 'RY' || selectedGate === 'RZ') {
      addGateToInstant(currentStep, { name: selectedGate, params: [Math.PI / 2], qubitIndices: [selectedQubit] });
    } else {
      addGateToInstant(currentStep, { name: selectedGate, qubitIndices: [selectedQubit] });
    }
  };

  const handleReset = () => {
    resetTimeline();
    setCurrentStep(0);
    setSubStep(0);
    setTrail1([]);
    setTrail2([]);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-black px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <span className="label-tracked block mb-3">Secuencias Temporales</span>
        <h1 className="font-serif text-4xl md:text-5xl text-white mb-3">
          <span className="italic text-blue">Timeline</span> & Circuitos
        </h1>
        <p className="text-sm text-white/40 max-w-xl leading-relaxed">
          Construye secuencias de compuertas cuanticas y visualiza la evolucion del estado
          con animaciones interpoladas suaves estilo Manim.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-5">
              <span className="label-tracked text-blue block mb-4">Qubit 1 — Animacion</span>
              <BlochSphere coords={displayState.coords[0]} trail={trail1} height="300px" color="#0066FF" showAxes={config.showAxes} showGrid={config.showGrid} showTrail={config.showTrail} />
              <div className="mt-3 flex justify-between text-[11px]">
                <span className="text-white/30">Prob |0{'>'}: <span className="quantum-value">{formatProbability(displayState.probs[0].p0)}</span></span>
                <span className="text-white/30">Prob |1{'>'}: <span className="quantum-value">{formatProbability(displayState.probs[0].p1)}</span></span>
              </div>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <span className="label-tracked text-white/50 block mb-4">Qubit 2 — Animacion</span>
              <BlochSphere coords={displayState.coords[1]} trail={trail2} height="300px" color="#3385FF" showAxes={config.showAxes} showGrid={config.showGrid} showTrail={config.showTrail} />
              <div className="mt-3 flex justify-between text-[11px]">
                <span className="text-white/30">Prob |0{'>'}: <span className="quantum-value">{formatProbability(displayState.probs[1].p0)}</span></span>
                <span className="text-white/30">Prob |1{'>'}: <span className="quantum-value">{formatProbability(displayState.probs[1].p1)}</span></span>
              </div>
            </div>
          </div>

          {/* Playback controls */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <button onClick={handlePlay} className="w-10 h-10 rounded-full bg-blue flex items-center justify-center hover:bg-blue-light transition-colors">
                {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
              </button>
              <button onClick={() => handleStepChange(0)} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => handleStepChange(Math.min(currentStep + 1, timeline.length - 1))} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
              <button onClick={handleReset} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex-1">
                <input type="range" min="0" max={timeline.length - 1} step="0.01" value={currentStep + subStep}
                  onChange={e => { const v = Number(e.target.value); setCurrentStep(Math.floor(v)); setSubStep(v - Math.floor(v)); setIsPlaying(false); }}
                  className="w-full h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#0066FF' }}
                />
                <div className="flex justify-between mt-2">
                  {timeline.map((_, i) => (
                    <span key={i} className={`text-[9px] mono ${i <= currentStep ? 'text-blue' : 'text-white/15'}`}>T{i}</span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Vel</span>
                <select value={playSpeed} onChange={e => setPlaySpeed(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg text-[10px] text-white/60 px-2 py-1">
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Builder */}
        <div className="space-y-5">
          {/* Formula of selected gate */}
          <div className="glass-panel rounded-2xl p-5">
            <span className="label-tracked block mb-3">Accion Matematica</span>
            <FormulaBlock size="sm" text={ALL_GATES.find(g => g.name === selectedGate)?.formula || ''} />
            <p className="text-[10px] text-white/30 mt-2">
              Las compuertas unitarias preservan la norma: U^dagger * U = I.
              La concatenacion de compuertas corresponde a multiplicacion matricial de derecha a izquierda.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <span className="label-tracked block mb-4">Constructor de Circuito</span>

            <div className="space-y-3 mb-5">
              <div className="flex gap-2">
                <select value={selectedQubit} onChange={e => setSelectedQubit(Number(e.target.value) as 0 | 1)}
                  className="bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 px-2 py-2">
                  <option value={0}>Qubit 1</option>
                  <option value={1}>Qubit 2</option>
                </select>
                <select value={selectedGate} onChange={e => setSelectedGate(e.target.value as GateName)}
                  className="bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 px-2 py-2 flex-1">
                  {ALL_GATES.map(g => <option key={g.name} value={g.name}>{g.label} — {g.desc}</option>)}
                </select>
                <button onClick={handleAddGate} className="w-10 h-10 rounded-full bg-blue flex items-center justify-center hover:bg-blue-light transition-colors">
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="label-tracked text-white/30 mb-2">Instants de Tiempo</div>
              {timeline.map((instant, idx) => (
                <div key={instant.id} className={`rounded-xl p-3 border transition-all ${idx === currentStep ? 'bg-blue/[0.06] border-blue/20' : 'bg-white/[0.01] border-white/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold mono ${idx === currentStep ? 'text-blue' : 'text-white/30'}`}>T{idx}</span>
                    {timeline.length > 1 && (
                      <button onClick={() => removeTimelineInstant(idx)} className="text-white/15 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {instant.gates.length === 0 && <span className="text-[10px] text-white/20 italic">Sin compuertas</span>}
                    {instant.gates.map((gate, gidx) => (
                      <span key={gidx} className={`gate-badge ${gate.name === 'X' ? 'gate-badge-x' : gate.name === 'Y' ? 'gate-badge-y' : gate.name === 'Z' ? 'gate-badge-z' : gate.name === 'H' ? 'gate-badge-h' : gate.name === 'S' ? 'gate-badge-s' : gate.name === 'T' ? 'gate-badge-t' : gate.name.startsWith('R') ? 'gate-badge-z' : 'gate-badge-h'} cursor-pointer hover:opacity-80`} onClick={() => removeGateFromInstant(idx, gidx)}>
                        {gate.name}
                        <span className="text-[8px] ml-0.5 opacity-60">{gate.qubitIndices?.[0] === 1 ? '2' : '1'}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addTimelineInstant} className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/10 text-white/30 hover:text-blue hover:border-blue/20 hover:bg-blue/[0.03] transition-all text-[11px] uppercase tracking-widest">
              <Plus className="w-3 h-3 inline mr-1" /> Anadir Instante
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
