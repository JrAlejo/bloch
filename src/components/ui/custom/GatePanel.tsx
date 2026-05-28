import { useState, useCallback } from 'react';
import { useQuantumStore } from '@/store/quantumStore';
import type { GateName } from '@/types/quantum';
import { RotateCcw } from 'lucide-react';

const SINGLE_QUBIT_GATES: { name: GateName; label: string; desc: string; badge: string }[] = [
  { name: 'X', label: 'X', desc: 'Pauli-X (NOT)', badge: 'gate-badge-x' },
  { name: 'Y', label: 'Y', desc: 'Pauli-Y', badge: 'gate-badge-y' },
  { name: 'Z', label: 'Z', desc: 'Pauli-Z', badge: 'gate-badge-z' },
  { name: 'H', label: 'H', desc: 'Hadamard', badge: 'gate-badge-h' },
  { name: 'S', label: 'S', desc: 'Phase', badge: 'gate-badge-s' },
  { name: 'T', label: 'T', desc: 'pi/8', badge: 'gate-badge-t' },
];

interface GatePanelProps {
  qubitIndex?: number;
}

export default function GatePanel({ qubitIndex = 0 }: GatePanelProps) {
  const applyGateToQubit = useQuantumStore(s => s.applyGateToQubit);
  const setQubitState = useQuantumStore(s => s.setQubitState);
  const blochCoords = useQuantumStore(s => s.blochCoords[qubitIndex]);
  const resetTimeline = useQuantumStore(s => s.resetTimeline);

  const [theta, setTheta] = useState(blochCoords.theta * 180 / Math.PI);
  const [phi, setPhi] = useState(blochCoords.phi * 180 / Math.PI);

  const handleThetaChange = useCallback((val: number) => {
    setTheta(val);
    setQubitState(qubitIndex, val * Math.PI / 180, phi * Math.PI / 180);
  }, [phi, qubitIndex, setQubitState]);

  const handlePhiChange = useCallback((val: number) => {
    setPhi(val);
    setQubitState(qubitIndex, theta * Math.PI / 180, val * Math.PI / 180);
  }, [theta, qubitIndex, setQubitState]);

  const handleGate = useCallback((gateName: GateName) => {
    applyGateToQubit(qubitIndex, { name: gateName });
    const newCoords = useQuantumStore.getState().blochCoords[qubitIndex];
    setTheta(Math.round(newCoords.theta * 180 / Math.PI));
    setPhi(Math.round(newCoords.phi * 180 / Math.PI));
  }, [applyGateToQubit, qubitIndex]);

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <span className="label-tracked">Control Qubit {qubitIndex + 1}</span>
        <button
          onClick={resetTimeline}
          className="p-1.5 rounded-full hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* State initialization */}
      <div className="space-y-4">
        <div className="label-tracked text-white/30">Estado Inicial (theta, phi)</div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Theta</span>
              <span className="quantum-value text-xs">{theta} deg</span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              value={theta}
              onChange={e => handleThetaChange(Number(e.target.value))}
              className="w-full h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue"
              style={{ accentColor: '#0066FF' }}
            />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Phi</span>
              <span className="quantum-value text-xs">{phi} deg</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={phi}
              onChange={e => handlePhiChange(Number(e.target.value))}
              className="w-full h-0.5 bg-white/10 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: '#0066FF' }}
            />
          </div>
        </div>
      </div>

      {/* Quick gates */}
      <div className="space-y-3">
        <div className="label-tracked text-white/30">Compuertas 1-Qubit</div>
        <div className="grid grid-cols-3 gap-2">
          {SINGLE_QUBIT_GATES.map(gate => (
            <button
              key={gate.name}
              onClick={() => handleGate(gate.name)}
              className={`gate-badge ${gate.badge} py-2 cursor-pointer active:scale-95`}
              title={gate.desc}
            >
              {gate.label}
            </button>
          ))}
        </div>
      </div>

      {/* State display */}
      <div className="pt-3 border-t border-white/5">
        <div className="label-tracked text-white/30 mb-2">Coordenadas Bloch</div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="bg-white/[0.02] rounded-lg px-2 py-2">
            <div className="label-tracked mb-0.5">x</div>
            <div className="quantum-value text-[10px]">{blochCoords.x.toFixed(3)}</div>
          </div>
          <div className="bg-white/[0.02] rounded-lg px-2 py-2">
            <div className="label-tracked mb-0.5">y</div>
            <div className="quantum-value text-[10px]">{blochCoords.y.toFixed(3)}</div>
          </div>
          <div className="bg-white/[0.02] rounded-lg px-2 py-2">
            <div className="label-tracked mb-0.5">z</div>
            <div className="quantum-value text-[10px]">{blochCoords.z.toFixed(3)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
