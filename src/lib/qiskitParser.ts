import type { GateOperation, TimelineInstant, GateName, QubitState, BlochCoords, Probabilities } from '@/types/quantum';
import { applyGate, getProbabilities, ketToBloch } from '@/lib/quantum';

/**
 * Qiskit Parser — Convierte código Qiskit Python a un timeline de compuertas
 * Detecta qc.barrier() como instantes de tiempo separados
 */

export interface QiskitParseResult {
  timeline: TimelineInstant[];
  numQubits: number;
  errors: string[];
  warnings: string[];
}

// Map Qiskit gate names to our GateName
const QISKIT_TO_GATE: Record<string, GateName> = {
  'h': 'H',
  'x': 'X',
  'y': 'Y',
  'z': 'Z',
  's': 'S',
  'sdg': 'S', // simplified
  't': 'T',
  'tdg': 'T', // simplified
  'rx': 'RX',
  'ry': 'RY',
  'rz': 'RZ',
  'cx': 'CNOT',
  'cnot': 'CNOT',
  'swap': 'SWAP',
  'cz': 'CZ',
};

// Parse single-line gate call: qc.h(0) or qc.cx(0, 1)
function parseGateLine(line: string): GateOperation | null {
  // Match patterns like: qc.h(0), qc.rx(pi/2, 0), qc.cx(0, 1)
  const gateMatch = line.match(/qc\.([a-zA-Z_]+)\s*\(([^)]+)\)/);
  if (!gateMatch) return null;

  const gateName = gateMatch[1];
  const argsStr = gateMatch[2].trim();

  if (!QISKIT_TO_GATE[gateName]) {
    // Unknown gate, skip
    return null;
  }

  const mappedName = QISKIT_TO_GATE[gateName];

  // Parse arguments
  const args = argsStr.split(',').map(a => a.trim());

  // For parameterized gates (rx, ry, rz), first arg is the parameter
  let params: number[] | undefined;
  let qubitIndices: number[] = [];

  if (['RX', 'RY', 'RZ'].includes(mappedName)) {
    // First arg is angle
    const angleStr = args[0];
    params = [parseAngle(angleStr)];
    qubitIndices = args.slice(1).map(parseIntArg).filter(n => n !== null) as number[];
  } else if (mappedName === 'CNOT' || mappedName === 'SWAP' || mappedName === 'CZ') {
    // Two qubit gates
    qubitIndices = args.map(parseIntArg).filter(n => n !== null) as number[];
  } else {
    // Single qubit gates
    qubitIndices = args.map(parseIntArg).filter(n => n !== null) as number[];
  }

  if (qubitIndices.length === 0) {
    qubitIndices = [0]; // default
  }

  return {
    name: mappedName,
    params,
    qubitIndices
  };
}

function parseIntArg(arg: string): number | null {
  const match = arg.match(/^(\d+)$/);
  if (match) return parseInt(match[1], 10);
  return null;
}

function parseAngle(angleStr: string): number {
  // Handle: pi, pi/2, 3*pi/4, 0.5, math.pi, np.pi
  const clean = angleStr.toLowerCase().replace(/math\./g, '').replace(/np\./g, '');

  if (clean === 'pi') return Math.PI;
  if (clean === 'pi/2') return Math.PI / 2;
  if (clean === 'pi/4') return Math.PI / 4;
  if (clean === 'pi/3') return Math.PI / 3;
  if (clean === '2*pi') return 2 * Math.PI;
  if (clean === '3*pi/2') return 3 * Math.PI / 2;
  if (clean === 'pi/8') return Math.PI / 8;

  // Try fraction like 3*pi/4
  const fracMatch = clean.match(/(\d+)\s*\*?\s*pi\s*\/\s*(\d+)/);
  if (fracMatch) {
    return (parseInt(fracMatch[1]) * Math.PI) / parseInt(fracMatch[2]);
  }

  // Try numeric
  const num = parseFloat(clean);
  if (!isNaN(num)) return num;

  return Math.PI / 2; // default
}

export function parseQiskitCode(code: string): QiskitParseResult {
  const lines = code.split('\n');
  const timeline: TimelineInstant[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let currentInstant: TimelineInstant = { id: 0, gates: [] };
  let instantId = 0;
  let numQubits = 1;

  // Try to detect number of qubits from QuantumCircuit constructor
  const qcMatch = code.match(/QuantumCircuit\s*\(\s*(\d+)/);
  if (qcMatch) {
    numQubits = parseInt(qcMatch[1], 10);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    // Detect barrier
    if (line.match(/qc\.barrier\s*\(/)) {
      if (currentInstant.gates.length > 0) {
        timeline.push(currentInstant);
        instantId++;
        currentInstant = { id: instantId, gates: [] };
      }
      continue;
    }

    // Detect measure (skip for visualization)
    if (line.match(/qc\.measure\s*\(/)) {
      warnings.push(`Línea ${i + 1}: Medición detectada pero omitida en visualización`);
      continue;
    }

    // Parse gate
    const gate = parseGateLine(line);
    if (gate) {
      currentInstant.gates.push(gate);
    }
  }

  // Push last instant if it has gates
  if (currentInstant.gates.length > 0) {
    timeline.push(currentInstant);
  }

  // Ensure at least one instant
  if (timeline.length === 0) {
    timeline.push({ id: 0, gates: [] });
  }

  return { timeline, numQubits, errors, warnings };
}

/**
 * Compute the full state evolution from a Qiskit timeline
 */
export function computeQiskitTimeline(timeline: TimelineInstant[]): {
  states: QubitState[];
  coords: BlochCoords[];
  probs: Probabilities[];
}[] {
  const defaultState: QubitState = { alpha: [1, 0] as [number, number], beta: [0, 0] as [number, number] };

  let s1 = { ...defaultState };
  let s2 = { ...defaultState };

  const results = [{
    states: [s1, s2] as QubitState[],
    coords: [ketToBloch(s1.alpha, s1.beta), ketToBloch(s2.alpha, s2.beta)] as BlochCoords[],
    probs: [getProbabilities(s1), getProbabilities(s2)] as Probabilities[]
  }];

  for (const instant of timeline) {
    for (const gate of instant.gates) {
      const target = gate.qubitIndices?.[0] ?? 0;
      // Handle 2-qubit gates by applying to both for visualization
      if (gate.name === 'CNOT' || gate.name === 'SWAP' || gate.name === 'CZ') {
        // For visualization: apply a relevant single-qubit effect
        if (gate.qubitIndices && gate.qubitIndices.length >= 2) {
          // Simplified CNOT effect
          if (gate.name === 'CNOT') {
            s2 = applyGate(s2, 'X');
          } else if (gate.name === 'CZ') {
            s2 = applyGate(s2, 'Z');
          } else if (gate.name === 'SWAP') {
            const temp = { ...s1 };
            s1 = { ...s2 };
            s2 = temp;
          }
        }
      } else {
        if (target === 0) {
          s1 = applyGate(s1, gate.name, gate.params);
        } else {
          s2 = applyGate(s2, gate.name, gate.params);
        }
      }
    }

    results.push({
      states: [{ ...s1 }, { ...s2 }],
      coords: [ketToBloch(s1.alpha, s1.beta), ketToBloch(s2.alpha, s2.beta)],
      probs: [getProbabilities(s1), getProbabilities(s2)]
    });
  }

  return results;
}

/**
 * Build a visual circuit representation from parsed Qiskit code
 */
export interface CircuitWire {
  qubitIndex: number;
  operations: {
    type: 'gate' | 'barrier' | 'control' | 'target';
    name: string;
    position: number;
    color?: string;
  }[];
}

export function buildCircuitDiagram(parseResult: QiskitParseResult): CircuitWire[] {
  const wires: CircuitWire[] = [];

  for (let q = 0; q < Math.max(2, parseResult.numQubits); q++) {
    wires.push({ qubitIndex: q, operations: [] });
  }

  let position = 0;

  for (const instant of parseResult.timeline) {
    for (const gate of instant.gates) {
      if (gate.name === 'CNOT' || gate.name === 'CZ') {
        const control = gate.qubitIndices?.[0] ?? 0;
        const target = gate.qubitIndices?.[1] ?? 1;
        wires[control].operations.push({ type: 'control', name: '●', position });
        wires[target].operations.push({ type: 'target', name: gate.name === 'CNOT' ? '⊕' : 'Z', position });
      } else if (gate.name === 'SWAP') {
        const a = gate.qubitIndices?.[0] ?? 0;
        const b = gate.qubitIndices?.[1] ?? 1;
        wires[a].operations.push({ type: 'gate', name: '×', position });
        wires[b].operations.push({ type: 'gate', name: '×', position });
      } else {
        const target = gate.qubitIndices?.[0] ?? 0;
        wires[target].operations.push({
          type: 'gate',
          name: gate.name,
          position,
          color: getGateColor(gate.name)
        });
      }
      position++;
    }

    // Add barrier mark after each instant
    for (const wire of wires) {
      wire.operations.push({ type: 'barrier', name: '|', position });
    }
    position++;
  }

  return wires;
}

function getGateColor(name: GateName): string {
  const colors: Record<string, string> = {
    'X': '#d45757',
    'Y': '#5dc460',
    'Z': '#6b8dd4',
    'H': '#e5a044',
    'S': '#58c4dc',
    'T': '#c4a45d',
    'RX': '#d45757',
    'RY': '#5dc460',
    'RZ': '#6b8dd4',
  };
  return colors[name] || '#e5a044';
}

/**
 * Default Qiskit example code
 */
export const DEFAULT_QISKIT_CODE = `from qiskit import QuantumCircuit
import numpy as np

# Create a circuit with 2 qubits
qc = QuantumCircuit(2)

# Initial state: |00>

# Apply Hadamard to create superposition
qc.h(0)
qc.barrier()

# Apply Pauli-X to flip qubit 1
qc.x(1)
qc.barrier()

# Apply phase gates
qc.s(0)
qc.barrier()

# Apply CNOT for entanglement
qc.cx(0, 1)
qc.barrier()

# Final Hadamard
qc.h(0)
`;

export const QISKIT_EXAMPLES = {
  'bell': `from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Prepare Bell state |Φ+>
qc.h(0)
qc.cx(0, 1)
qc.barrier()

# Measure in Bell basis
qc.cx(0, 1)
qc.h(0)
`,
  'ghz': `from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Create GHZ-like state
qc.h(0)
qc.cx(0, 1)
qc.barrier()

# Apply phase
qc.z(0)
qc.z(1)
qc.barrier()

# Disentangle
qc.cx(0, 1)
qc.h(0)
`,
  'ramsey': `from qiskit import QuantumCircuit
import numpy as np

qc = QuantumCircuit(1)

# Ramsey interferometry
qc.h(0)
qc.barrier()

# Phase accumulation
qc.rz(np.pi/3, 0)
qc.barrier()

# Second Hadamard
qc.h(0)
`,
  'teleport': `from qiskit import QuantumCircuit

qc = QuantumCircuit(2)

# Prepare |+> on qubit 0
qc.h(0)
qc.barrier()

# Entangle with qubit 1
qc.h(1)
qc.cx(1, 0)
qc.barrier()

# Bell measurement
qc.cx(0, 1)
qc.h(0)
`
};
