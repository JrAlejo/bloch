import { create } from 'zustand';
import type { QubitState, BlochCoords, GateOperation, TimelineInstant, Probabilities } from '@/types/quantum';
import { applyGate, getProbabilities, ketToBloch, blochToKet, slerp } from '@/lib/quantum';

interface BlochSphereConfig {
  showAxes: boolean;
  showGrid: boolean;
  showTrail: boolean;
  trailLength: number;
  autoRotate: boolean;
}

interface QuantumStore {
  // Qubit states (up to 2 for now)
  qubits: QubitState[];
  blochCoords: BlochCoords[];
  probabilities: Probabilities[];

  // Timeline
  timeline: TimelineInstant[];
  currentTimeIndex: number;
  isPlaying: boolean;
  animationFrame: number;

  // Configuration
  config: BlochSphereConfig;

  // Actions
  setQubitState: (index: number, theta: number, phi: number) => void;
  applyGateToQubit: (qubitIndex: number, gate: GateOperation) => void;
  addTimelineInstant: () => void;
  removeTimelineInstant: (index: number) => void;
  addGateToInstant: (instantIndex: number, gate: GateOperation) => void;
  removeGateFromInstant: (instantIndex: number, gateIndex: number) => void;
  setCurrentTimeIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setAnimationFrame: (frame: number) => void;
  resetTimeline: () => void;
  updateConfig: (partial: Partial<BlochSphereConfig>) => void;
  getInterpolatedState: (qubitIndex: number, t: number) => { state: QubitState; coords: BlochCoords; probs: Probabilities };
}

const defaultState: QubitState = {
  alpha: [1, 0],
  beta: [0, 0]
};

const defaultBloch = ketToBloch([1, 0], [0, 0]);
const defaultProbs = getProbabilities(defaultState);

export const useQuantumStore = create<QuantumStore>((set, get) => ({
  qubits: [defaultState, defaultState],
  blochCoords: [defaultBloch, defaultBloch],
  probabilities: [defaultProbs, defaultProbs],
  timeline: [
    { id: 0, gates: [] },
    { id: 1, gates: [] },
    { id: 2, gates: [] },
    { id: 3, gates: [] }
  ],
  currentTimeIndex: 0,
  isPlaying: false,
  animationFrame: 0,
  config: {
    showAxes: true,
    showGrid: true,
    showTrail: true,
    trailLength: 50,
    autoRotate: false
  },

  setQubitState: (index, theta, phi) => {
    const [alpha, beta] = blochToKet(theta, phi);
    const state = { alpha, beta };
    const coords = ketToBloch(alpha, beta);
    const probs = getProbabilities(state);

    set(stateStore => {
      const qubits = [...stateStore.qubits];
      const blochCoords = [...stateStore.blochCoords];
      const probabilities = [...stateStore.probabilities];
      qubits[index] = state;
      blochCoords[index] = coords;
      probabilities[index] = probs;
      return { qubits, blochCoords, probabilities };
    });
  },

  applyGateToQubit: (qubitIndex, gateOp) => {
    const currentState = get().qubits[qubitIndex];
    const newState = applyGate(currentState, gateOp.name, gateOp.params);
    const coords = ketToBloch(newState.alpha, newState.beta);
    const probs = getProbabilities(newState);

    set(stateStore => {
      const qubits = [...stateStore.qubits];
      const blochCoords = [...stateStore.blochCoords];
      const probabilities = [...stateStore.probabilities];
      qubits[qubitIndex] = newState;
      blochCoords[qubitIndex] = coords;
      probabilities[qubitIndex] = probs;
      return { qubits, blochCoords, probabilities };
    });
  },

  addTimelineInstant: () => {
    set(stateStore => ({
      timeline: [...stateStore.timeline, { id: stateStore.timeline.length, gates: [] }]
    }));
  },

  removeTimelineInstant: (index) => {
    set(stateStore => ({
      timeline: stateStore.timeline.filter((_, i) => i !== index)
    }));
  },

  addGateToInstant: (instantIndex, gate) => {
    set(stateStore => {
      const timeline = [...stateStore.timeline];
      timeline[instantIndex] = {
        ...timeline[instantIndex],
        gates: [...timeline[instantIndex].gates, gate]
      };
      return { timeline };
    });
  },

  removeGateFromInstant: (instantIndex, gateIndex) => {
    set(stateStore => {
      const timeline = [...stateStore.timeline];
      timeline[instantIndex] = {
        ...timeline[instantIndex],
        gates: timeline[instantIndex].gates.filter((_, i) => i !== gateIndex)
      };
      return { timeline };
    });
  },

  setCurrentTimeIndex: (index) => set({ currentTimeIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setAnimationFrame: (frame) => set({ animationFrame: frame }),

  resetTimeline: () => {
    const defaultS: QubitState = { alpha: [1, 0], beta: [0, 0] };
    const defaultB = ketToBloch([1, 0], [0, 0]);
    const defaultP = getProbabilities(defaultS);
    set({
      qubits: [defaultS, defaultS],
      blochCoords: [defaultB, defaultB],
      probabilities: [defaultP, defaultP],
      currentTimeIndex: 0,
      isPlaying: false,
      animationFrame: 0
    });
  },

  updateConfig: (partial) => {
    set(stateStore => ({
      config: { ...stateStore.config, ...partial }
    }));
  },

  getInterpolatedState: (_qubitIndex, t) => {
    // t is 0..1 within a transition between timeline instants
    // This requires computing all states up to currentTimeIndex, then interpolating to next
    const stateStore = get();
    const timeline = stateStore.timeline;
    const totalSteps = timeline.length;

    // Compute all accumulated states
    let currentState: QubitState = { alpha: [1, 0], beta: [0, 0] };
    const states: QubitState[] = [currentState];

    for (let i = 0; i < totalSteps; i++) {
      for (const gate of timeline[i].gates) {
        currentState = applyGate(currentState, gate.name, gate.params);
      }
      states.push({ ...currentState });
    }

    // Determine which segment we're in
    const globalT = t * totalSteps;
    const stepIndex = Math.min(Math.floor(globalT), totalSteps - 1);
    const localT = globalT - stepIndex;

    const fromState = states[stepIndex];
    const toState = states[stepIndex + 1];

    const interp = slerp(fromState.alpha, fromState.beta, toState.alpha, toState.beta, localT);
    const coords = ketToBloch(interp.alpha, interp.beta);
    const probs = getProbabilities(interp);

    return { state: interp, coords, probs };
  }
}));
