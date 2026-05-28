import { useState, useEffect, useRef } from 'react';
import BlochSphere from '@/components/bloch/BlochSphere';
import GatePanel from '@/components/ui/custom/GatePanel';
import ProbabilitiesPanel from '@/components/ui/custom/ProbabilitiesPanel';
import FormulaBlock from '@/components/math/FormulaBlock';
import MatrixDisplay from '@/components/math/MatrixDisplay';
import { useQuantumStore } from '@/store/quantumStore';
import { motion } from 'framer-motion';

const gateInfo: Record<string, { name: string; desc: string; effect0: string; effect1: string; matrix: string[][] }> = {
  X: { name: 'Pauli-X', desc: 'Inversion (NOT cuantico)', effect0: '|1>', effect1: '|0>', matrix: [['0', '1'], ['1', '0']] },
  Y: { name: 'Pauli-Y', desc: 'Rotacion de pi alrededor de Y', effect0: 'i|1>', effect1: '-i|0>', matrix: [['0', '-i'], ['i', '0']] },
  Z: { name: 'Pauli-Z', desc: 'Cambia la fase de |1> por -1', effect0: '|0>', effect1: '-|1>', matrix: [['1', '0'], ['0', '-1']] },
  H: { name: 'Hadamard', desc: 'Crea superposicion equitativa', effect0: '|+> = (|0>+|1>)/sqrt(2)', effect1: '|-> = (|0>-|1>)/sqrt(2)', matrix: [['1/sqrt(2)', '1/sqrt(2)'], ['1/sqrt(2)', '-1/sqrt(2)']] },
  S: { name: 'Phase S', desc: 'Fase de pi/2 (i) a |1>', effect0: '|0>', effect1: 'i|1>', matrix: [['1', '0'], ['0', 'i']] },
  T: { name: 'T (pi/8)', desc: 'Fase de pi/4 a |1>', effect0: '|0>', effect1: 'e^(i*pi/4)|1>', matrix: [['1', '0'], ['0', 'e^(i*pi/4)']] },
};

export default function GateLab() {
  const blochCoords = useQuantumStore(s => s.blochCoords);
  const qubits = useQuantumStore(s => s.qubits);
  const config = useQuantumStore(s => s.config);

  const [trails, setTrails] = useState<[number, number, number][][]>([[], []]);
  const trailsRef = useRef<[number, number, number][][]>([[], []]);
  const [activeGateInfo, setActiveGateInfo] = useState<string>('H');

  useEffect(() => {
    const newTrails = blochCoords.map((coords) => {
      const point: [number, number, number] = [coords.x, coords.y, coords.z];
      const current = trailsRef.current[0] || [];
      const updated = [...current, point];
      if (updated.length > config.trailLength) updated.shift();
      return updated;
    });
    trailsRef.current = newTrails;
    setTrails(newTrails);
  }, [blochCoords, config.trailLength]);

  const info = gateInfo[activeGateInfo];

  return (
    <div className="min-h-screen bg-black px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <span className="label-tracked block mb-3">Laboratorio Interactivo</span>
        <h1 className="font-serif text-4xl md:text-5xl text-white mb-3">
          Laboratorio de <span className="italic text-blue">Compuertas</span>
        </h1>
        <p className="text-sm text-white/40 max-w-xl leading-relaxed">
          Manipula estados cuanticos individuales. Configura el estado inicial con theta y phi,
          aplica compuertas y observa la evolucion en tiempo real.
        </p>
      </motion.div>

      {/* Gate Info Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-panel rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="label-tracked text-blue">Descripcion Matematica de Compuertas</div>
          <div className="flex gap-2">
            {Object.keys(gateInfo).map(g => (
              <button
                key={g}
                onClick={() => setActiveGateInfo(g)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold transition-all ${
                  activeGateInfo === g
                    ? 'bg-blue text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 className="font-serif text-xl text-white mb-1">{info.name}</h3>
            <p className="text-xs text-white/40 mb-4">{info.desc}</p>
            <MatrixDisplay matrix={info.matrix} delay={0} bracketColor="#0066FF" />
          </div>
          <div className="space-y-3">
            <FormulaBlock size="sm" delay={0.1} label="Efecto sobre |0>" text={`${activeGateInfo}|0> = ${info.effect0}`} />
            <FormulaBlock size="sm" delay={0.2} label="Efecto sobre |1>" text={`${activeGateInfo}|1> = ${info.effect1}`} />
            <FormulaBlock size="sm" delay={0.3} label="Propiedad Unitaria" text={`${activeGateInfo}^dagger * ${activeGateInfo} = I`} />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bloch Spheres */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Qubit 1 */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="label-tracked text-blue">Esfera de Bloch — Qubit 1</span>
                <span className="text-[10px] text-white/20 mono">{'|psi> = alpha|0> + beta|1>'}</span>
              </div>
              <BlochSphere
                coords={blochCoords[0]}
                trail={trails[0]}
                height="350px"
                color="#0066FF"
                showAxes={config.showAxes}
                showGrid={config.showGrid}
                showTrail={config.showTrail}
              />
            </div>

            {/* Qubit 2 */}
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="label-tracked text-white/50">Esfera de Bloch — Qubit 2</span>
                <span className="text-[10px] text-white/20 mono">{'|psi> = alpha|0> + beta|1>'}</span>
              </div>
              <BlochSphere
                coords={blochCoords[1]}
                trail={trails[1]}
                height="350px"
                color="#3385FF"
                showAxes={config.showAxes}
                showGrid={config.showGrid}
                showTrail={config.showTrail}
              />
            </div>
          </div>

          {/* State equations */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="label-tracked text-white/30 mb-3">Representacion Estado</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              <div className="space-y-1">
                <div className="label-tracked text-blue/60">Qubit 1 — Vector Estado</div>
                <div className="text-white/50 text-[11px] leading-relaxed">
                  {'|psi__2081> = ' + qubits[0].alpha[0].toFixed(3) + (qubits[0].alpha[1] >= 0 ? '+' : '') + qubits[0].alpha[1].toFixed(3) + 'i |0> + ' + qubits[0].beta[0].toFixed(3) + (qubits[0].beta[1] >= 0 ? '+' : '') + qubits[0].beta[1].toFixed(3) + 'i |1>'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="label-tracked text-white/30">Qubit 2 — Vector Estado</div>
                <div className="text-white/50 text-[11px] leading-relaxed">
                  {'|psi__2082> = ' + qubits[1].alpha[0].toFixed(3) + (qubits[1].alpha[1] >= 0 ? '+' : '') + qubits[1].alpha[1].toFixed(3) + 'i |0> + ' + qubits[1].beta[0].toFixed(3) + (qubits[1].beta[1] >= 0 ? '+' : '') + qubits[1].beta[1].toFixed(3) + 'i |1>'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="space-y-5">
          <GatePanel qubitIndex={0} />
          <ProbabilitiesPanel qubitIndex={0} />
          <GatePanel qubitIndex={1} />
          <ProbabilitiesPanel qubitIndex={1} />

          {/* Display config */}
          <div className="glass-panel rounded-2xl p-5">
            <div className="label-tracked text-white/30 mb-3">Configuracion Visual</div>
            <div className="space-y-3">
              {[
                { label: 'Mostrar ejes X, Y, Z', key: 'showAxes' },
                { label: 'Mostrar grid esferico', key: 'showGrid' },
                { label: 'Mostrar estela de estado', key: 'showTrail' },
              ].map(({ label, key }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={config[key as keyof typeof config] as boolean}
                    onChange={e => useQuantumStore.getState().updateConfig({ [key]: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-blue focus:ring-blue/30"
                  />
                  <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
