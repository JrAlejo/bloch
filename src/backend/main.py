"""
FastAPI Backend for Quantum Bloch Sphere Visualization Platform.
Provides WebSocket real-time communication for quantum computations via QuTiP.
"""

import json
import asyncio
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from quantum_engine import QuantumEngine, get_gate_matrix, ket_to_bloch, get_probabilities, interpolate_states, angles_to_state
from qutip import basis

app = FastAPI(title="QIS UV Quantum Backend", version="3.0")

# CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global quantum engine
engine = QuantumEngine()

# ===== REST API Models =====
class GateRequest(BaseModel):
    qubit_index: int = 0
    gate: str
    params: Optional[List[float]] = None

class StateRequest(BaseModel):
    qubit_index: int = 0
    theta: float  # degrees
    phi: float    # degrees

class TimelineRequest(BaseModel):
    timeline: List[dict]

class ProtocolRequest(BaseModel):
    protocol: str
    params: Optional[dict] = {}

# ===== REST Endpoints =====
@app.get("/")
def root():
    return {"message": "QIS UV Quantum Backend", "status": "active", "version": "3.0"}

@app.get("/api/state")
def get_state():
    """Get current quantum state."""
    return engine.get_state()

@app.post("/api/reset")
def reset():
    """Reset all qubits to |0>."""
    return engine.reset()

@app.post("/api/gate")
def apply_gate(req: GateRequest):
    """Apply a single-qubit gate."""
    return engine.apply_gate(req.qubit_index, req.gate, req.params)

@app.post("/api/state/set")
def set_state(req: StateRequest):
    """Set qubit state from angles."""
    return engine.set_state(req.qubit_index, req.theta, req.phi)

@app.post("/api/timeline/compute")
def compute_timeline(req: TimelineRequest):
    """Compute full timeline evolution."""
    return engine.compute_timeline(req.timeline)

@app.post("/api/protocol/run")
def run_protocol(req: ProtocolRequest):
    """Run a quantum protocol simulation."""
    try:
        results = engine.run_protocol(req.protocol, **req.params)
        return {"protocol": req.protocol, "results": results}
    except Exception as e:
        return {"error": str(e)}

# ===== WebSocket Endpoint =====
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, websocket: WebSocket, message: dict):
        await websocket.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")
                payload = msg.get("payload", {})

                if msg_type == "get_state":
                    result = engine.get_state()
                    await manager.send_message(websocket, {
                        "type": "state_update",
                        "payload": result
                    })

                elif msg_type == "set_state":
                    idx = payload.get("qubit_index", 0)
                    theta = payload.get("theta", 0)
                    phi = payload.get("phi", 0)
                    result = engine.set_state(idx, theta, phi)
                    await manager.send_message(websocket, {
                        "type": "state_update",
                        "payload": result
                    })

                elif msg_type == "apply_gate":
                    idx = payload.get("qubit_index", 0)
                    gate = payload.get("gate", "I")
                    params = payload.get("params")
                    result = engine.apply_gate(idx, gate, params)
                    await manager.send_message(websocket, {
                        "type": "state_update",
                        "payload": result
                    })

                elif msg_type == "apply_multi_gate":
                    # Apply same gate to all qubits
                    gate = payload.get("gate", "I")
                    params = payload.get("params")
                    for i in range(len(engine.states)):
                        engine.apply_gate(i, gate, params)
                    await manager.send_message(websocket, {
                        "type": "state_update",
                        "payload": engine.get_state()
                    })

                elif msg_type == "animate_gate":
                    idx = payload.get("qubit_index", 0)
                    gate = payload.get("gate", "I")
                    params = payload.get("params")
                    steps = payload.get("steps", 20)
                    
                    # Compute target state
                    initial = engine.states[idx]
                    gate_mat = get_gate_matrix(gate, params)
                    target = gate_mat * initial
                    target = target.unit()
                    
                    # Send interpolated frames
                    interp_states = interpolate_states(initial, target, steps)
                    for state in interp_states:
                        await manager.send_message(websocket, {
                            "type": "animation_frame",
                            "payload": {
                                "qubit_index": idx,
                                "bloch": ket_to_bloch(state),
                                "probabilities": get_probabilities(state),
                                "amplitudes": {
                                    "alpha": [float(state.full()[0, 0].real), float(state.full()[0, 0].imag)],
                                    "beta": [float(state.full()[1, 0].real), float(state.full()[1, 0].imag)]
                                }
                            }
                        })
                        await asyncio.sleep(0.03)  # 30ms per frame
                    
                    # Update engine state
                    engine.states[idx] = target
                    await manager.send_message(websocket, {
                        "type": "state_update",
                        "payload": engine.get_state()
                    })

                elif msg_type == "reset":
                    result = engine.reset()
                    await manager.send_message(websocket, {
                        "type": "state_update",
                        "payload": result
                    })

                elif msg_type == "compute_timeline":
                    timeline = payload.get("timeline", [])
                    results = engine.compute_timeline(timeline)
                    await manager.send_message(websocket, {
                        "type": "timeline_results",
                        "payload": results
                    })

                elif msg_type == "run_protocol":
                    protocol = payload.get("protocol", "bb84")
                    params = payload.get("params", {})
                    try:
                        results = engine.run_protocol(protocol, **params)
                        await manager.send_message(websocket, {
                            "type": "protocol_results",
                            "payload": {
                                "protocol": protocol,
                                "results": results
                            }
                        })
                    except Exception as e:
                        await manager.send_message(websocket, {
                            "type": "error",
                            "payload": {"message": str(e)}
                        })

                elif msg_type == "get_gates":
                    await manager.send_message(websocket, {
                        "type": "gates_list",
                        "payload": {
                            "single_qubit": ["I", "X", "Y", "Z", "H", "S", "T", "RX", "RY", "RZ"],
                            "two_qubit": ["CNOT", "SWAP", "CZ"]
                        }
                    })

                else:
                    await manager.send_message(websocket, {
                        "type": "error",
                        "payload": {"message": f"Unknown message type: {msg_type}"}
                    })

            except json.JSONDecodeError:
                await manager.send_message(websocket, {
                    "type": "error",
                    "payload": {"message": "Invalid JSON"}
                })
            except Exception as e:
                await manager.send_message(websocket, {
                    "type": "error",
                    "payload": {"message": str(e)}
                })

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

# ===== Main entry point =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
