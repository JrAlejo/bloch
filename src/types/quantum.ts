export type Complex = [number, number];

export interface QubitState {
  alpha: Complex; // |0⟩ amplitude
  beta: Complex;  // |1⟩ amplitude
}

export interface BlochCoords {
  x: number;
  y: number;
  z: number;
  theta: number; // 0 to π
  phi: number;   // 0 to 2π
}

export type GateName = 'I' | 'X' | 'Y' | 'Z' | 'H' | 'S' | 'T' | 'RX' | 'RY' | 'RZ' | 'CNOT' | 'SWAP' | 'CZ';

export interface GateOperation {
  name: GateName;
  label?: string;
  params?: number[]; // for RX, RY, RZ
  qubitIndices?: number[]; // for multi-qubit gates
}

export interface TimelineInstant {
  id: number;
  gates: GateOperation[];
}

export interface QuantumProtocol {
  id: string;
  name: string;
  description: string;
  steps: ProtocolStep[];
}

export interface ProtocolStep {
  id: number;
  title: string;
  description: string;
  action: 'gate' | 'measure' | 'entangle' | 'wait' | 'communicate';
  gates?: GateOperation[];
  duration?: number; // ms for animation
  targetQubit?: number;
}

export interface Probabilities {
  p0: number;
  p1: number;
}

export interface WSMessage {
  type: 'state_update' | 'probabilities' | 'animation_frame' | 'protocol_step' | 'error';
  payload: unknown;
}
