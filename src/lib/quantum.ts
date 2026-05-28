import { type Complex, type GateName, type QubitState, type BlochCoords, type Probabilities } from '@/types/quantum';

// ===== Complex Number Operations =====
export function addComplex(a: Complex, b: Complex): Complex {
  return [a[0] + b[0], a[1] + b[1]];
}

export function subComplex(a: Complex, b: Complex): Complex {
  return [a[0] - b[0], a[1] - b[1]];
}

export function mulComplex(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

export function scaleComplex(c: Complex, scalar: number): Complex {
  return [c[0] * scalar, c[1] * scalar];
}

export function conjComplex(c: Complex): Complex {
  return [c[0], -c[1]];
}

export function absComplex(c: Complex): number {
  return Math.sqrt(c[0] * c[0] + c[1] * c[1]);
}

export function abs2Complex(c: Complex): number {
  return c[0] * c[0] + c[1] * c[1];
}

export function sqrtComplex(c: Complex): Complex {
  const r = Math.sqrt(absComplex(c));
  const theta = Math.atan2(c[1], c[0]) / 2;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

export function expComplex(theta: number): Complex {
  return [Math.cos(theta), Math.sin(theta)];
}

// ===== Matrix Operations (2x2 complex matrices) =====
export type Matrix2x2 = [[Complex, Complex], [Complex, Complex]];

export function matMul(m: Matrix2x2, v: [Complex, Complex]): [Complex, Complex] {
  return [
    addComplex(mulComplex(m[0][0], v[0]), mulComplex(m[0][1], v[1])),
    addComplex(mulComplex(m[1][0], v[0]), mulComplex(m[1][1], v[1]))
  ];
}

export function matMul2x2(a: Matrix2x2, b: Matrix2x2): Matrix2x2 {
  return [
    [
      addComplex(mulComplex(a[0][0], b[0][0]), mulComplex(a[0][1], b[1][0])),
      addComplex(mulComplex(a[0][0], b[0][1]), mulComplex(a[0][1], b[1][1]))
    ],
    [
      addComplex(mulComplex(a[1][0], b[0][0]), mulComplex(a[1][1], b[1][0])),
      addComplex(mulComplex(a[1][0], b[0][1]), mulComplex(a[1][1], b[1][1]))
    ]
  ];
}

// ===== Quantum Gates =====
export const GATES: Record<GateName, Matrix2x2> = {
  I: [
    [[1, 0], [0, 0]],
    [[0, 0], [1, 0]]
  ],
  X: [
    [[0, 0], [1, 0]],
    [[1, 0], [0, 0]]
  ],
  Y: [
    [[0, 0], [0, -1]],
    [[0, 1], [0, 0]]
  ],
  Z: [
    [[1, 0], [0, 0]],
    [[0, 0], [-1, 0]]
  ],
  H: [
    [[1 / Math.sqrt(2), 0], [1 / Math.sqrt(2), 0]],
    [[1 / Math.sqrt(2), 0], [-1 / Math.sqrt(2), 0]]
  ],
  S: [
    [[1, 0], [0, 0]],
    [[0, 0], [0, 1]]
  ],
  T: [
    [[1, 0], [0, 0]],
    [[0, 0], [1 / Math.sqrt(2), 1 / Math.sqrt(2)]]
  ],
  RX: [
    [[1, 0], [0, 0]], // placeholder - use rxGate(theta)
    [[0, 0], [1, 0]]
  ],
  RY: [
    [[1, 0], [0, 0]], // placeholder - use ryGate(theta)
    [[0, 0], [1, 0]]
  ],
  RZ: [
    [[1, 0], [0, 0]], // placeholder - use rzGate(theta)
    [[0, 0], [1, 0]]
  ],
  CNOT: [
    [[1, 0], [0, 0]],
    [[0, 0], [0, 0]] // 4x4 would be needed, this is a placeholder
  ],
  SWAP: [
    [[1, 0], [0, 0]],
    [[0, 0], [0, 0]] // 4x4 would be needed
  ],
  CZ: [
    [[1, 0], [0, 0]],
    [[0, 0], [0, 0]] // 4x4 would be needed
  ]
};

export function rxGate(theta: number): Matrix2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [[c, 0], [0, -s]],
    [[0, -s], [c, 0]]
  ];
}

export function ryGate(theta: number): Matrix2x2 {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [[c, 0], [-s, 0]],
    [[s, 0], [c, 0]]
  ];
}

export function rzGate(theta: number): Matrix2x2 {
  const e = expComplex(-theta / 2);
  const ec = expComplex(theta / 2);
  return [
    [e, [0, 0]],
    [[0, 0], ec]
  ];
}

export function getGateMatrix(name: GateName, params?: number[]): Matrix2x2 {
  if (name === 'RX' && params?.[0] !== undefined) return rxGate(params[0]);
  if (name === 'RY' && params?.[0] !== undefined) return ryGate(params[0]);
  if (name === 'RZ' && params?.[0] !== undefined) return rzGate(params[0]);
  return GATES[name];
}

// ===== State Operations =====
export function ketToBloch(alpha: Complex, beta: Complex): BlochCoords {
  const norm = Math.sqrt(abs2Complex(alpha) + abs2Complex(beta));
  const a0 = scaleComplex(alpha, 1 / norm);
  const b0 = scaleComplex(beta, 1 / norm);

  // x = 2 * Re(alpha* * beta)
  const x = 2 * (a0[0] * b0[0] + a0[1] * b0[1]);
  // y = 2 * Im(alpha* * beta)
  const y = 2 * (a0[0] * b0[1] - a0[1] * b0[0]);
  // z = |alpha|^2 - |beta|^2
  const z = abs2Complex(a0) - abs2Complex(b0);

  const theta = Math.acos(Math.max(-1, Math.min(1, z)));
  let phi = Math.atan2(y, x);
  if (phi < 0) phi += 2 * Math.PI;

  return { x, y, z, theta, phi };
}

export function blochToKet(theta: number, phi: number): [Complex, Complex] {
  const alpha: Complex = [Math.cos(theta / 2), 0];
  const beta: Complex = [Math.sin(theta / 2) * Math.cos(phi), Math.sin(theta / 2) * Math.sin(phi)];
  return [alpha, beta];
}

export function applyGate(state: QubitState, gateName: GateName, params?: number[]): QubitState {
  const gate = getGateMatrix(gateName, params);
  const v: [Complex, Complex] = [state.alpha, state.beta];
  const result = matMul(gate, v);
  // Normalize
  const norm = Math.sqrt(abs2Complex(result[0]) + abs2Complex(result[1]));
  return {
    alpha: scaleComplex(result[0], 1 / norm),
    beta: scaleComplex(result[1], 1 / norm)
  };
}

export function getProbabilities(state: QubitState): Probabilities {
  return {
    p0: abs2Complex(state.alpha),
    p1: abs2Complex(state.beta)
  };
}

// ===== Interpolation =====
export function slerp(
  alpha1: Complex, beta1: Complex,
  alpha2: Complex, beta2: Complex,
  t: number
): QubitState {
  // Simple linear interpolation + renormalization (good enough for visualization)
  const a: Complex = [
    alpha1[0] * (1 - t) + alpha2[0] * t,
    alpha1[1] * (1 - t) + alpha2[1] * t
  ];
  const b: Complex = [
    beta1[0] * (1 - t) + beta2[0] * t,
    beta1[1] * (1 - t) + beta2[1] * t
  ];
  const norm = Math.sqrt(abs2Complex(a) + abs2Complex(b));
  return {
    alpha: scaleComplex(a, 1 / norm),
    beta: scaleComplex(b, 1 / norm)
  };
}

// ===== State Creation Helper =====
export function createState(alpha0: number, alpha1: number, beta0: number, beta1: number): QubitState {
  return {
    alpha: [alpha0, alpha1] as Complex,
    beta: [beta0, beta1] as Complex
  };
}
export function formatComplex(c: Complex, digits = 3): string {
  const r = c[0].toFixed(digits);
  const i = Math.abs(c[1]).toFixed(digits);
  const sign = c[1] >= 0 ? '+' : '-';
  if (Math.abs(c[1]) < 0.0001) return r;
  if (Math.abs(c[0]) < 0.0001) return `${c[1] >= 0 ? '' : '-'}${i}i`;
  return `${r} ${sign} ${i}i`;
}

export function formatProbability(p: number, digits = 2): string {
  return (p * 100).toFixed(digits) + '%';
}

export function formatAngle(rad: number, digits = 1): string {
  return (rad * 180 / Math.PI).toFixed(digits) + '°';
}
