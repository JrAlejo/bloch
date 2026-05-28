import type { CircuitWire } from '@/lib/qiskitParser';

interface QiskitCircuitViewProps {
  wires: CircuitWire[];
  maxPosition: number;
}

export default function QiskitCircuitView({ wires, maxPosition }: QiskitCircuitViewProps) {
  if (!wires.length) return null;

  const cellWidth = 44;
  const rowHeight = 48;
  const totalWidth = Math.max(300, (maxPosition + 2) * cellWidth + 80);

  return (
    <div className="manim-panel rounded-lg p-4 overflow-x-auto">
      <div className="manim-subheading mb-3">Circuito Qiskit</div>
      <div className="overflow-x-auto">
        <svg width={totalWidth} height={wires.length * rowHeight + 20} className="block">
          {/* Background grid */}
          <defs>
            <pattern id="grid" width={cellWidth} height={rowHeight} patternUnits="userSpaceOnUse">
              <line x1="0" y1={rowHeight} x2={cellWidth} y2={rowHeight} stroke="rgba(229,160,68,0.04)" strokeWidth={1} />
            </pattern>
          </defs>
          <rect width={totalWidth} height={wires.length * rowHeight + 20} fill="url(#grid)" />

          {wires.map((wire, wireIdx) => {
            const y = wireIdx * rowHeight + rowHeight / 2 + 10;

            return (
              <g key={wireIdx}>
                {/* Qubit label */}
                <text x={10} y={y + 4} fill="#8a8a9e" fontSize={11} fontFamily="'JetBrains Mono', monospace">
                  q{wire.qubitIndex}
                </text>

                {/* Horizontal wire */}
                <line x1={40} y1={y} x2={totalWidth - 20} y2={y} stroke="#3a3a5c" strokeWidth={1.5} />

                {/* Operations */}
                {wire.operations.map((op, opIdx) => {
                  const cx = 60 + op.position * cellWidth;

                  if (op.type === 'gate') {
                    const isMultiChar = op.name.length > 1;
                    const w = isMultiChar ? 36 : 28;
                    const h = 28;

                    return (
                      <g key={opIdx}>
                        <rect
                          x={cx - w / 2} y={y - h / 2}
                          width={w} height={h}
                          rx={3}
                          fill="rgba(20,20,40,0.8)"
                          stroke={op.color || '#e5a044'}
                          strokeWidth={1.5}
                        />
                        <text
                          x={cx} y={y + 4}
                          fill={op.color || '#e5a044'}
                          fontSize={isMultiChar ? 10 : 12}
                          fontFamily="'JetBrains Mono', monospace"
                          fontWeight={600}
                          textAnchor="middle"
                        >
                          {op.name}
                        </text>
                      </g>
                    );
                  }

                  if (op.type === 'control') {
                    return (
                      <g key={opIdx}>
                        <circle cx={cx} cy={y} r={6} fill="#8a8a9e" />
                        {/* Vertical connector line */}
                        <line x1={cx} y1={y} x2={cx} y2={y + rowHeight} stroke="#8a8a9e" strokeWidth={1.5} strokeDasharray="none" />
                      </g>
                    );
                  }

                  if (op.type === 'target') {
                    return (
                      <g key={opIdx}>
                        <circle cx={cx} cy={y} r={10} fill="none" stroke="#e5a044" strokeWidth={1.5} />
                        <line x1={cx - 7} y1={y} x2={cx + 7} y2={y} stroke="#e5a044" strokeWidth={1.5} />
                        <line x1={cx} y1={y - 7} x2={cx} y2={y + 7} stroke="#e5a044" strokeWidth={1.5} />
                      </g>
                    );
                  }

                  if (op.type === 'barrier') {
                    return (
                      <g key={opIdx}>
                        <line x1={cx} y1={y - 14} x2={cx} y2={y + 14} stroke="#e5a044" strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />
                      </g>
                    );
                  }

                  return null;
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
