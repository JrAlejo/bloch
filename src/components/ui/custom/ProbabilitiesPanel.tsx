import { useQuantumStore } from '@/store/quantumStore';
import { formatProbability } from '@/lib/quantum';

export default function ProbabilitiesPanel({ qubitIndex = 0 }: { qubitIndex?: number }) {
  const probs = useQuantumStore(s => s.probabilities[qubitIndex]);

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="label-tracked mb-4">Probabilidades — Qubit {qubitIndex + 1}</div>

      <div className="space-y-4">
        {/* |0⟩ probability */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="quantum-formula text-xs">|0⟩</span>
            <span className="quantum-value text-sm">{formatProbability(probs.p0)}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue rounded-full transition-all duration-500"
              style={{ width: `${probs.p0 * 100}%` }}
            />
          </div>
        </div>

        {/* |1⟩ probability */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="quantum-formula text-xs">|1⟩</span>
            <span className="quantum-value text-sm">{formatProbability(probs.p1)}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-500"
              style={{ width: `${probs.p1 * 100}%` }}
            />
          </div>
        </div>

        {/* Bloch coordinates */}
        <div className="pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="label-tracked mb-1">x</div>
            <div className="quantum-value text-xs">{probs.p0.toFixed(3)}</div>
          </div>
          <div>
            <div className="label-tracked mb-1">y</div>
            <div className="quantum-value text-xs">{probs.p1.toFixed(3)}</div>
          </div>
          <div>
            <div className="label-tracked mb-1">z</div>
            <div className="quantum-value text-xs">{(probs.p0 - probs.p1).toFixed(3)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
