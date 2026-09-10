import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
)
from ml.data_gen import generate_synthetic_data
from ml.classical import train_logistic_regression, train_gaussian_nb, predict_proba
from ml.quantum_kernel import compute_quantum_kernel
from utils import plot_rocs

def evaluate_binary(y_true, y_pred, y_probs=None):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    auc = None
    if y_probs is not None:
        try:
            auc = roc_auc_score(y_true, y_probs)
        except Exception:
            auc = None
    return {"accuracy": acc, "precision": prec, "recall": rec, "f1": f1, "auc": auc}

def run_experiment(n_samples=500, test_size=0.33, random_state=123, n_qubits=4, run_classical=True, run_quantum=True):
    df, labels = generate_synthetic_data(n_samples=n_samples, random_state=random_state)
    X = df.values
    y = labels
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    classical_metrics = None
    quantum_metrics = None
    roc_data = []

    if run_classical:
        log_model = train_logistic_regression(X_train, y_train, random_state=random_state)
        probs_log = predict_proba(log_model, X_test)
        preds_log = (probs_log >= 0.5).astype(int)
        classical_metrics = evaluate_binary(y_test, preds_log, probs_log)
        fpr, tpr, _ = roc_curve(y_test, probs_log)
        roc_data.append(("Logistic", fpr, tpr, classical_metrics.get("auc")))

        nb_model = train_gaussian_nb(X_train, y_train)
        probs_nb = predict_proba(nb_model, X_test)
        preds_nb = (probs_nb >= 0.5).astype(int)
        nb_metrics = evaluate_binary(y_test, preds_nb, probs_nb)
        roc_data.append(("GaussianNB", *roc_curve(y_test, probs_nb), nb_metrics.get("auc")))

    if run_quantum:
        mins = X_train.min(axis=0)
        maxs = X_train.max(axis=0)
        X_train_norm = (X_train - mins) / (maxs - mins + 1e-8)
        X_test_norm = (X_test - mins) / (maxs - mins + 1e-8)

        K_train, K_test_train = compute_quantum_kernel(X_train_norm, X_test_norm, n_qubits=n_qubits)
        svm = SVC(kernel="precomputed", probability=False)
        svm.fit(K_train, y_train)
        preds_svm = svm.predict(K_test_train)
        try:
            scores = svm.decision_function(K_test_train)
            probs_svm = 1 / (1 + np.exp(-scores))
        except Exception:
            probs_svm = None
        quantum_metrics = evaluate_binary(y_test, preds_svm, probs_svm)
        if probs_svm is not None:
            fpr, tpr, _ = roc_curve(y_test, probs_svm)
            roc_data.append(("QuantumSVM", fpr, tpr, quantum_metrics.get("auc")))
        else:
            roc_data.append(("QuantumSVM", None, None, quantum_metrics.get("auc")))

    roc_png = None
    if roc_data:
        roc_png = plot_rocs(roc_data)

    info = f"Samples={n_samples}, n_qubits={n_qubits}. Classical run={run_classical}, Quantum run={run_quantum}"
    return {
        "classical_metrics": classical_metrics,
        "quantum_metrics": quantum_metrics,
        "roc_png": roc_png,
        "info": info,
    }
