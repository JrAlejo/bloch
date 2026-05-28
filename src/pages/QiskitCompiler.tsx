import { useState, useEffect, useRef, useCallback } from 'react';
import BlochSphere from '@/components/bloch/BlochSphere';
import QiskitCircuitView from '@/components/ui/custom/QiskitCircuitView';
import {
  parseQiskitCode,
  computeQiskitTimeline,
  buildCircuitDiagram,
  DEFAULT_QISKIT_CODE,
  QISKIT_EXAMPLES,
  type QiskitParseResult,
} from '@/lib/qiskitParser';
import { slerp, getProbabilities, ketToBloch, formatProbability } from '@/lib/quantum';
import type { QubitState, BlochCoords, Probabilities } from '@/types/quantum';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Zap, ChevronRight, Code, FileCode, AlertCircle, CheckCircle } from 'lucide-react';

/* ---------- Simple Python Syntax Highlighter ---------- */
function highlightPython(code: string): string {
  const keywords = ['from', 'import', 'as', 'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'in', 'pass', 'try', 'except'];
  const types = ['QuantumCircuit', 'int', 'float', 'str', 'list', 'dict'];

  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'), '<span style="color:#c586c0">$1</span>')
    .replace(new RegExp(`\\b(${types.join('|')})\\b`, 'g'), '<span style="color:#4ec9b0">$1</span>')
    .replace(/\b(qc)\b/g, '<span style="color:#9cdcfe">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#b5cea8">$1</span>')
    .replace(/(#.*$)/gm, '<span style="color:#6a9955">$1</span>')
    .replace(/(".*?"|'.*?')/g, '<span style="color:#ce9178">$1</span>')
    .replace(/\b(np|math)\.\b/g, '<span style="color:#4ec9b0">$1</span>.')
    .replace(/\b(pi)\b/g, '<span style="color:#b5cea8">$1</span>');
}

/* ---------- Editor Component ---------- */
function CodeEditor({ code, setCode }: { code: string; setCode: (c: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = () => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden border"
      style={{ background: '#0d0d1a', borderColor: 'rgba(229,160,68,0.1)', minHeight: '280px' }}>
      {/* Highlighted background */}
      <pre
        ref={preRef}
        className="absolute inset-0 m-0 p-4 overflow-auto pointer-events-none font-mono text-xs leading-6"
        style={{ color: '#d4d4d4', tabSize: 4 }}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightPython(code) + '<br>' }}
      />
      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        onScroll={handleScroll}
        className="relative w-full h-full min-h-[280px] p-4 bg-transparent font-mono text-xs leading-6 resize-none outline-none"
        style={{ color: 'transparent', caretColor: '#e5a044', tabSize: 4 }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
      />
    </div>
  );
}

/* ============================================================
   QISKIT COMPILER PAGE
   ============================================================ */
export default function QiskitCompiler() {
  const [code, setCode] = useState(DEFAULT_QISKIT_CODE);
  const [parseResult, setParseResult] = useState<QiskitParseResult | null>(null);
  const [allStates, setAllStates] = useState<{ states: QubitState[]; coords: BlochCoords[]; probs: Probabilities[] }[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [trail1, setTrail1] = useState<[number, number, number][]>([]);
  const [trail2, setTrail2] = useState<[number, number, number][]>([]);
  const [activeExample, setActiveExample] = useState<string>('');

  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  // Compile Qiskit code
  const compile = useCallback(() => {
    const result = parseQiskitCode(code);
    setParseResult(result);
    const states = computeQiskitTimeline(result.timeline);
    setAllStates(states);
    setCurrentStep(0);
    setSubStep(0);
    setTrail1([]);
    setTrail2([]);
    setIsPlaying(false);
  }, [code]);

  // Auto-compile on mount
  useEffect(() => {
    compile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get interpolated display state
  const getDisplayState = useCallback((): { coords: BlochCoords[]; probs: Probabilities[] } => {
    if (allStates.length < 2) {
      return {
        coords: [
          { x: 0, y: 0, z: 1, theta: 0, phi: 0 },
          { x: 0, y: 0, z: 1, theta: 0, phi: 0 }
        ],
        probs: [{ p0: 1, p1: 0 }, { p0: 1, p1: 0 }]
      };
    }

    const globalT = currentStep + subStep;
    const stepIdx = Math.min(Math.floor(globalT), allStates.length - 2);
    const localT = globalT - stepIdx;

    const from = allStates[stepIdx];
    const to = allStates[stepIdx + 1];

    const s1 = slerp(from.states[0].alpha, from.states[0].beta, to.states[0].alpha, to.states[0].beta, localT);
    const s2 = slerp(from.states[1].alpha, from.states[1].beta, to.states[1].alpha, to.states[1].beta, localT);

    return {
      coords: [ketToBloch(s1.alpha, s1.beta), ketToBloch(s2.alpha, s2.beta)],
      probs: [getProbabilities(s1), getProbabilities(s2)]
    };
  }, [allStates, currentStep, subStep]);

  const displayState = getDisplayState();

  // Animation loop
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
            if (s >= allStates.length - 2) {
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
  }, [isPlaying, playSpeed, allStates.length]);

  // Update trails
  useEffect(() => {
    if (!isPlaying) return;
    const ds = displayState;
    setTrail1(prev => {
      const p = [...prev, [ds.coords[0].x, ds.coords[0].y, ds.coords[0].z] as [number, number, number]];
      return p.length > 50 ? p.slice(-50) : p;
    });
    setTrail2(prev => {
      const p = [...prev, [ds.coords[1].x, ds.coords[1].y, ds.coords[1].z] as [number, number, number]];
      return p.length > 50 ? p.slice(-50) : p;
    });
  }, [displayState.coords[0].x, displayState.coords[1].x, isPlaying]);

  const handlePlay = () => {
    if (currentStep >= allStates.length - 2 && subStep >= 1) {
      setCurrentStep(0);
      setSubStep(0);
      setTrail1([]);
      setTrail2([]);
    }
    setIsPlaying(!isPlaying);
    lastTimeRef.current = 0;
  };

  const loadExample = (key: string) => {
    setCode(QISKIT_EXAMPLES[key as keyof typeof QISKIT_EXAMPLES] || DEFAULT_QISKIT_CODE);
    setActiveExample(key);
    // Auto compile after state update
    setTimeout(() => {
      const result = parseQiskitCode(QISKIT_EXAMPLES[key as keyof typeof QISKIT_EXAMPLES] || DEFAULT_QISKIT_CODE);
      setParseResult(result);
      const states = computeQiskitTimeline(result.timeline);
      setAllStates(states);
      setCurrentStep(0);
      setSubStep(0);
      setTrail1([]);
      setTrail2([]);
      setIsPlaying(false);
    }, 0);
  };

  const circuitWires = parseResult ? buildCircuitDiagram(parseResult) : [];
  const maxPos = circuitWires.length > 0
    ? Math.max(...circuitWires.flatMap(w => w.operations.map(o => o.position)), 0)
    : 0;

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#e8e8ec' }}>
          <Zap className="w-6 h-6 inline mr-2" style={{ color: '#e5a044' }} />
          Compilador <span style={{ color: '#e5a044' }}>Qiskit</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8a8a9e' }}>
          Escribe código Qiskit Python, compílalo y observa la evolución cuántica en tiempo real
          sobre las esferas de Bloch. Los <span className="manim-formula">qc.barrier()</span> definen los instantes de tiempo.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Editor + Circuit — 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          {/* Examples */}
          <div className="flex gap-2 flex-wrap">
            {Object.keys(QISKIT_EXAMPLES).map(key => (
              <button
                key={key}
                onClick={() => loadExample(key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${activeExample === key ? 'manim-button-active' : 'manim-button'}`}
              >
                <FileCode className="w-3 h-3 inline mr-1" />
                {key === 'bell' ? 'Bell' : key === 'ghz' ? 'GHZ' : key === 'ramsey' ? 'Ramsey' : 'Teleport'}
              </button>
            ))}
          </div>

          {/* Code Editor */}
          <div className="manim-panel rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4" style={{ color: '#e5a044' }} />
                <span className="manim-subheading">Editor Qiskit</span>
              </div>
              <button onClick={compile} className="manim-button px-3 py-1.5 rounded text-xs flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" /> Compilar & Ejecutar
              </button>
            </div>
            <CodeEditor code={code} setCode={setCode} />
          </div>

          {/* Circuit Diagram */}
          {circuitWires.length > 0 && (
            <QiskitCircuitView wires={circuitWires} maxPosition={maxPos} />
          )}

          {/* Parse Info */}
          {parseResult && (
            <div className="manim-panel rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                {parseResult.errors.length > 0 ? (
                  <AlertCircle className="w-4 h-4" style={{ color: '#d45757' }} />
                ) : (
                  <CheckCircle className="w-4 h-4" style={{ color: '#5dc460' }} />
                )}
                <span className="text-xs font-medium" style={{ color: parseResult.errors.length > 0 ? '#d45757' : '#5dc460' }}>
                  {parseResult.errors.length > 0 ? 'Errores detectados' : 'Compilación exitosa'}
                </span>
              </div>
              <div className="text-[11px] space-y-0.5" style={{ color: '#6b7280' }}>
                <div>Qubits: <span className="manim-value">{parseResult.numQubits}</span> | Instantes: <span className="manim-value">{parseResult.timeline.length}</span> | Total compuertas: <span className="manim-value">{parseResult.timeline.reduce((a, i) => a + i.gates.length, 0)}</span></div>
                {parseResult.warnings.map((w, i) => (
                  <div key={i} style={{ color: '#c4a45d' }}>⚠ {w}</div>
                ))}
                {parseResult.errors.map((e, i) => (
                  <div key={i} style={{ color: '#d45757' }}>✗ {e}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Spheres + Playback — 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          {/* Spheres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="manim-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="manim-subheading">Qubit 0 — Bloch</h3>
                <span className="manim-value text-[10px]">
                  |0⟩={formatProbability(displayState.probs[0].p0)} |1⟩={formatProbability(displayState.probs[0].p1)}
                </span>
              </div>
              <BlochSphere
                coords={displayState.coords[0]}
                trail={trail1}
                height="340px"
                color="#e5a044"
                showAxes
                showGrid
                showTrail
              />
            </div>
            <div className="manim-panel rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="manim-subheading">Qubit 1 — Bloch</h3>
                <span className="manim-value text-[10px]">
                  |0⟩={formatProbability(displayState.probs[1].p0)} |1⟩={formatProbability(displayState.probs[1].p1)}
                </span>
              </div>
              <BlochSphere
                coords={displayState.coords[1]}
                trail={trail2}
                height="340px"
                color="#58c4dc"
                showAxes
                showGrid
                showTrail
              />
            </div>
          </div>

          {/* Playback Controls */}
          <div className="manim-panel rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={handlePlay} className="manim-button p-2 rounded-lg">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => { setCurrentStep(0); setSubStep(0); setTrail1([]); setTrail2([]); setIsPlaying(false); }}
                className="p-2 rounded-lg transition-colors"
                style={{ border: '1px solid rgba(107,114,128,0.2)', color: '#6b7280' }}>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 px-2">
                <input
                  type="range"
                  min="0"
                  max={Math.max(allStates.length - 2, 0)}
                  step="0.005"
                  value={currentStep + subStep}
                  onChange={e => {
                    const v = Number(e.target.value);
                    setCurrentStep(Math.floor(v));
                    setSubStep(v - Math.floor(v));
                    setIsPlaying(false);
                  }}
                  className="manim-slider"
                />
                <div className="flex justify-between mt-1">
                  {allStates.map((_, i) => (
                    <span key={i} className="text-[10px] mono" style={{ color: i <= currentStep ? '#e5a044' : '#3a3a5c' }}>
                      {i === 0 ? '|0⟩' : i === allStates.length - 1 ? '|ψ⟩' : `T${i - 1}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>Vel</span>
                <select
                  value={playSpeed}
                  onChange={e => setPlaySpeed(Number(e.target.value))}
                  className="text-xs rounded px-2 py-1"
                  style={{ background: '#141428', border: '1px solid rgba(229,160,68,0.15)', color: '#8a8a9e' }}
                >
                  <option value={0.5}>0.5×</option>
                  <option value={1}>1×</option>
                  <option value={2}>2×</option>
                  <option value={4}>4×</option>
                </select>
              </div>
            </div>

            {/* Gate sequence display */}
            {parseResult && parseResult.timeline.length > 0 && (
              <div className="pt-3" style={{ borderTop: '1px solid rgba(229,160,68,0.08)' }}>
                <div className="manim-subheading mb-2">Secuencia de Compuertas por Instante</div>
                <div className="space-y-1.5">
                  {parseResult.timeline.map((instant, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="manim-value text-[10px] w-8">T{idx}</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {instant.gates.length === 0 ? (
                          <span style={{ color: '#3a3a5c' }} className="text-[10px] italic">barrier</span>
                        ) : (
                          instant.gates.map((g, gidx) => (
                            <span key={gidx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold"
                              style={{
                                border: `1px solid ${getGateColor(g.name)}40`,
                                color: getGateColor(g.name),
                                background: `${getGateColor(g.name)}10`
                              }}>
                              {g.name}{g.qubitIndices?.[0] === 1 ? '₂' : '₁'}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGateColor(name: string): string {
  const colors: Record<string, string> = {
    'X': '#d45757', 'Y': '#5dc460', 'Z': '#6b8dd4', 'H': '#e5a044',
    'S': '#58c4dc', 'T': '#c4a45d', 'RX': '#d45757', 'RY': '#5dc460', 'RZ': '#6b8dd4',
    'CNOT': '#e5a044', 'SWAP': '#c4a45d', 'CZ': '#58c4dc',
  };
  return colors[name] || '#e5a044';
}
