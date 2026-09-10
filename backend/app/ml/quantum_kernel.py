import numpy as np
from qiskit import QuantumCircuit, transpile, Aer

def _build_encoding_circuit(feature_vector, n_qubits):
    vec = np.array(feature_vector)
    if vec.size < n_qubits:
        reps = int(np.ceil(n_qubits / vec.size))
        vec = np.tile(vec, reps)[:n_qubits]
    else:
        vec = vec[:n_qubits]

    qc = QuantumCircuit(n_qubits)
    angles = vec * np.pi
    for q in range(n_qubits):
        qc.ry(float(angles[q]), q)
    for q in range(n_qubits - 1):
        qc.cx(q, q + 1)
    if n_qubits > 1:
        qc.cx(n_qubits - 1, 0)
    return qc

def compute_statevectors(X, n_qubits=4):
    backend = Aer.get_backend("aer_simulator_statevector")
    statevecs = []
    for row in X:
        qc = _build_encoding_circuit(row, n_qubits)
        t_qc = transpile(qc, backend)
        result = backend.run(t_qc).result()
        sv = result.get_statevector(t_qc)
        statevecs.append(np.asarray(sv))
    return np.array(statevecs)

def fidelity_kernel_from_statevectors(statevecs):
    sv = statevecs
    inner = np.conjugate(sv) @ sv.T
    fidelity = np.abs(inner) ** 2
    return fidelity

def compute_quantum_kernel(X_train, X_test=None, n_qubits=4):
    X_train = np.array(X_train)
    statevecs_train = compute_statevectors(X_train, n_qubits=n_qubits)
    K_train = fidelity_kernel_from_statevectors(statevecs_train)
    K_test_train = None
    if X_test is not None:
        X_test = np.array(X_test)
        statevecs_test = compute_statevectors(X_test, n_qubits=n_qubits)
        inner_test_train = np.conjugate(statevecs_test) @ statevecs_train.T
        K_test_train = np.abs(inner_test_train) ** 2
    return K_train, K_test_train
