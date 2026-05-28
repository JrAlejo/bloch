"""
Quantum Engine — Core computation module using QuTiP.
Handles all gate operations, state evolution, and protocol simulations.
"""

import numpy as np
from qutip import Qobj, Bloch, sigmax, sigmay, sigmaz, basis, tensor
from qutip.qip.operations import hadamard_transform, snot, phasegate, cnot, swap, cz_gate
from typing import List, Dict, Tuple, Optional
import asyncio

# ===== Single Qubit Gates =====
GATES_1Q = {
    'I': Qobj([[1, 0], [0, 1]]),
    'X': sigmax(),
    'Y': sigmay(),
    'Z': sigmaz(),
    'H': hadamard_transform(1),
    'S': phasegate(np.pi / 2),
    'T': phasegate(np.pi / 4),
}

def rx_gate(theta: float) -> Qobj:
    """Rotation around X axis."""
    return Qobj([
        [np.cos(theta / 2), -1j * np.sin(theta / 2)],
        [-1j * np.sin(theta / 2), np.cos(theta / 2)]
    ])

def ry_gate(theta: float) -> Qobj:
    """Rotation around Y axis."""
    return Qobj([
        [np.cos(theta / 2), -np.sin(theta / 2)],
        [np.sin(theta / 2), np.cos(theta / 2)]
    ])

def rz_gate(theta: float) -> Qobj:
    """Rotation around Z axis."""
    return Qobj([
        [np.exp(-1j * theta / 2), 0],
        [0, np.exp(1j * theta / 2)]
    ])

def get_gate_matrix(name: str, params: Optional[List[float]] = None) -> Qobj:
    """Get gate operator by name with optional parameters."""
    if name == 'RX' and params:
        return rx_gate(params[0])
    elif name == 'RY' and params:
        return ry_gate(params[0])
    elif name == 'RZ' and params:
        return rz_gate(params[0])
    elif name in GATES_1Q:
        return GATES_1Q[name]
    else:
        raise ValueError(f"Unknown gate: {name}")

# ===== Two Qubit Gates =====
GATES_2Q = {
    'CNOT': cnot(),
    'SWAP': swap(),
    'CZ': cz_gate(),
}

# ===== State Utilities =====
def ket_to_bloch(state: Qobj) -> Dict[str, float]:
    """Convert a qubit state to Bloch sphere coordinates."""
    # Pauli expectation values
    x = (state.dag() * sigmax() * state).full()[0, 0].real
    y = (state.dag() * sigmay() * state).full()[0, 0].real
    z = (state.dag() * sigmaz() * state).full()[0, 0].real
    
    theta = np.arccos(np.clip(z, -1, 1))
    phi = np.arctan2(y, x)
    if phi < 0:
        phi += 2 * np.pi
    
    return {
        'x': float(x),
        'y': float(y),
        'z': float(z),
        'theta': float(theta),
        'phi': float(phi)
    }

def get_probabilities(state: Qobj) -> Dict[str, float]:
    """Get |0⟩ and |1⟩ probabilities."""
    p0 = abs(state.full()[0, 0]) ** 2
    p1 = abs(state.full()[1, 0]) ** 2
    return {'p0': float(p0), 'p1': float(p1)}

def angles_to_state(theta_deg: float, phi_deg: float) -> Qobj:
    """Create state from Bloch angles (degrees)."""
    theta = np.deg2rad(theta_deg)
    phi = np.deg2rad(phi_deg)
    return Qobj([
        [np.cos(theta / 2)],
        [np.sin(theta / 2) * np.exp(1j * phi)]
    ])

# ===== Animation / Interpolation =====
def interpolate_states(
    state_from: Qobj,
    state_to: Qobj,
    steps: int = 30
) -> List[Qobj]:
    """Generate smooth interpolated states between two qubit states."""
    states = []
    for t in range(steps + 1):
        alpha = (1 - t / steps) * state_from + (t / steps) * state_to
        # Renormalize
        norm = alpha.norm()
        if norm > 0:
            alpha = alpha / norm
        states.append(alpha)
    return states

# ===== Protocol Implementations =====
class QuantumProtocol:
    """Base class for quantum protocols."""
    
    def __init__(self):
        self.states_history: List[Qobj] = []
        self.bloch_history: List[Dict] = []

class BB84Simulator(QuantumProtocol):
    """BB84 Quantum Key Distribution simulation."""
    
    def run(self, num_bits: int = 8) -> List[Dict]:
        """Simulate BB84 key exchange."""
        results = []
        
        for _ in range(num_bits):
            # Alice chooses random bit and basis
            bit = np.random.randint(0, 2)
            basis_a = 'Z' if np.random.random() > 0.5 else 'X'
            
            # Alice prepares state
            if basis_a == 'Z':
                state = basis(2, bit)
            else:
                state = hadamard_transform(1) * basis(2, bit)
            
            # Bob chooses random basis
            basis_b = 'Z' if np.random.random() > 0.5 else 'X'
            
            # Bob measures
            if basis_b == 'X':
                state = hadamard_transform(1) * state
            
            # Check if bases match
            match = basis_a == basis_b
            
            results.append({
                'alice_bit': int(bit),
                'alice_basis': basis_a,
                'bob_basis': basis_b,
                'bases_match': match,
                'bloch': ket_to_bloch(state),
                'probabilities': get_probabilities(state)
            })
        
        return results

class RamseySimulator(QuantumProtocol):
    """Ramsey interferometry: H -> phase -> H."""
    
    def run(self, max_phase: float = 4 * np.pi, steps: int = 60) -> List[Dict]:
        """Simulate Ramsey interferometry over a phase sweep."""
        results = []
        initial = basis(2, 0)  # |0>
        
        for i in range(steps + 1):
            phase = max_phase * i / steps
            
            # H -> RZ(phase) -> H
            state = hadamard_transform(1) * initial
            state = rz_gate(phase) * state
            state = hadamard_transform(1) * state
            
            results.append({
                'phase': float(phase),
                'phase_deg': float(np.rad2deg(phase)),
                'bloch': ket_to_bloch(state),
                'probabilities': get_probabilities(state)
            })
        
        return results

class HahnEchoSimulator(QuantumProtocol):
    """Hahn spin echo: noise -> X -> noise (unwind)."""
    
    def run(self, noise_angle: float = np.pi / 3) -> List[Dict]:
        """Simulate Hahn echo sequence."""
        results = []
        
        # Step 0: |0> -> H -> |+>
        state = basis(2, 0)
        state = hadamard_transform(1) * state
        results.append({'step': 0, 'label': 'Preparación |+⟩', 'bloch': ket_to_bloch(state), 'probabilities': get_probabilities(state)})
        
        # Step 1: Apply noise (dephasing)
        state_noisy = rz_gate(noise_angle) * state
        results.append({'step': 1, 'label': 'Ruido RZ(φ)', 'bloch': ket_to_bloch(state_noisy), 'probabilities': get_probabilities(state_noisy)})
        
        # Step 2: Flip with X
        state_flipped = sigmax() * state_noisy
        results.append({'step': 2, 'label': 'Flip π-pulso X', 'bloch': ket_to_bloch(state_flipped), 'probabilities': get_probabilities(state_flipped)})
        
        # Step 3: Same noise unwinds!
        state_unwinded = rz_gate(noise_angle) * state_flipped
        results.append({'step': 3, 'label': 'Mismo ruido (unwind)', 'bloch': ket_to_bloch(state_unwinded), 'probabilities': get_probabilities(state_unwinded)})
        
        # Step 4: Final check
        state_final = sigmax() * state_unwinded  # Optional second flip to verify
        results.append({'step': 4, 'label': 'Estado final', 'bloch': ket_to_bloch(state_final), 'probabilities': get_probabilities(state_final)})
        
        return results

class TeleportSimulator(QuantumProtocol):
    """Quantum teleportation protocol simulation."""
    
    def run(self, theta: float = np.pi / 3, phi: float = np.pi / 4) -> List[Dict]:
        """Simulate quantum teleportation of an arbitrary state."""
        results = []
        
        # State to teleport: |ψ> = cos(θ/2)|0> + sin(θ/2)e^(iφ)|1>
        psi = angles_to_state(np.rad2deg(theta), np.rad2deg(phi))
        
        # Step 0: Initial states
        alice = psi
        bob = basis(2, 0)
        results.append({
            'step': 0,
            'label': 'Preparación',
            'alice_bloch': ket_to_bloch(alice),
            'bob_bloch': ket_to_bloch(bob),
            'entangled': False
        })
        
        # Step 1: Create Bell pair (simplified representation)
        bell = hadamard_transform(1) * basis(2, 0)
        bell = cnot() * tensor(bell, basis(2, 0))
        
        results.append({
            'step': 1,
            'label': 'Entrelazamiento EPR',
            'alice_bloch': {'x': 0, 'y': 0, 'z': 0, 'theta': np.pi/2, 'phi': 0},
            'bob_bloch': {'x': 0, 'y': 0, 'z': 0, 'theta': np.pi/2, 'phi': 0},
            'entangled': True
        })
        
        # Step 2: Alice measures in Bell basis
        results.append({
            'step': 2,
            'label': 'Medición + Clásico',
            'alice_bloch': {'x': 0, 'y': 0, 'z': 0, 'theta': np.pi/2, 'phi': 0},
            'bob_bloch': {'x': 0, 'y': 0, 'z': 0, 'theta': np.pi/2, 'phi': 0},
            'entangled': True,
            'classical_bits': '00'
        })
        
        # Step 3: Bob reconstructs (simplified: assumes correction applied)
        results.append({
            'step': 3,
            'label': 'Reconstrucción |ψ⟩',
            'alice_bloch': ket_to_bloch(basis(2, 0)),  # Alice's qubit destroyed
            'bob_bloch': ket_to_bloch(psi),  # Bob has |ψ>
            'entangled': False
        })
        
        return results

# ===== Main Quantum Engine =====
class QuantumEngine:
    """Main engine handling all quantum computations."""
    
    def __init__(self):
        self.states: List[Qobj] = [basis(2, 0), basis(2, 0)]  # Two qubits default |0>
        self.trails: List[List[Dict]] = [[], []]
        self.protocols = {
            'bb84': BB84Simulator(),
            'ramsey': RamseySimulator(),
            'hahn_echo': HahnEchoSimulator(),
            'teleport': TeleportSimulator(),
        }
    
    def reset(self):
        """Reset all qubits to |0>."""
        self.states = [basis(2, 0), basis(2, 0)]
        self.trails = [[], []]
        return self.get_state()
    
    def set_state(self, qubit_index: int, theta: float, phi: float) -> Dict:
        """Set qubit state from Bloch angles (degrees)."""
        self.states[qubit_index] = angles_to_state(theta, phi)
        return self.get_state()
    
    def apply_gate(self, qubit_index: int, gate_name: str, params: Optional[List[float]] = None) -> Dict:
        """Apply a single-qubit gate."""
        gate = get_gate_matrix(gate_name, params)
        self.states[qubit_index] = gate * self.states[qubit_index]
        self.states[qubit_index] = self.states[qubit_index].unit()
        
        # Record in trail
        bloch = ket_to_bloch(self.states[qubit_index])
        self.trails[qubit_index].append(bloch)
        if len(self.trails[qubit_index]) > 100:
            self.trails[qubit_index].pop(0)
        
        return self.get_state()
    
    def apply_two_qubit_gate(self, gate_name: str, control: int, target: int) -> Dict:
        """Apply a two-qubit gate (simplified for separate Bloch spheres visualization)."""
        if gate_name == 'CNOT':
            # Apply CNOT effect to target based on control state
            probs = get_probabilities(self.states[control])
            if probs['p1'] > 0.5:
                self.states[target] = sigmax() * self.states[target]
        elif gate_name == 'CZ':
            probs = get_probabilities(self.states[control])
            if probs['p1'] > 0.5:
                self.states[target] = sigmaz() * self.states[target]
        elif gate_name == 'SWAP':
            self.states[control], self.states[target] = self.states[target], self.states[control]
        
        self.states[control] = self.states[control].unit()
        self.states[target] = self.states[target].unit()
        return self.get_state()
    
    def get_state(self) -> Dict:
        """Get current state of all qubits."""
        return {
            'qubits': [
                {
                    'bloch': ket_to_bloch(self.states[i]),
                    'probabilities': get_probabilities(self.states[i]),
                    'amplitudes': {
                        'alpha': [float(self.states[i].full()[0, 0].real), float(self.states[i].full()[0, 0].imag)],
                        'beta': [float(self.states[i].full()[1, 0].real), float(self.states[i].full()[1, 0].imag)]
                    }
                }
                for i in range(len(self.states))
            ],
            'trails': self.trails
        }
    
    def run_protocol(self, protocol_name: str, **kwargs) -> List[Dict]:
        """Run a named protocol simulation."""
        if protocol_name in self.protocols:
            return self.protocols[protocol_name].run(**kwargs)
        raise ValueError(f"Unknown protocol: {protocol_name}")
    
    def compute_timeline(self, timeline: List[Dict]) -> List[Dict]:
        """Compute state evolution through a timeline of gate operations."""
        # Reset to |0>
        states = [basis(2, 0), basis(2, 0)]
        results = [{
            'qubits': [
                {'bloch': ket_to_bloch(states[i]), 'probabilities': get_probabilities(states[i])}
                for i in range(2)
            ]
        }]
        
        for instant in timeline:
            for gate_op in instant.get('gates', []):
                qubit_idx = gate_op.get('qubit_index', 0)
                gate_name = gate_op['name']
                params = gate_op.get('params')
                
                gate = get_gate_matrix(gate_name, params)
                states[qubit_idx] = gate * states[qubit_idx]
                states[qubit_idx] = states[qubit_idx].unit()
            
            results.append({
                'qubits': [
                    {'bloch': ket_to_bloch(states[i]), 'probabilities': get_probabilities(states[i])}
                    for i in range(2)
                ]
            })
        
        return results

# Global engine instance
engine = QuantumEngine()
