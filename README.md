TrialBridge MVP — Quantum-simulator + Probabilistic baseline Web App

What this is
- A minimal functional MVP showing:
  - Study creation & candidate pipeline
  - Authentication & RBAC (admin/coordinator/reviewer)
  - Synthetic patient data generation
  - Classical baseline (Logistic Regression, GaussianNB)
  - Quantum-simulator fidelity-kernel + SVM (Qiskit Aer statevector)
  - Audit logging and basic frontend

Requirements
- Docker & Docker Compose (recommended)
- Or: Python 3.10+, Node 18+ if running locally without Docker

Quick start with Docker Compose (recommended)
1. docker compose up --build
2. Open frontend: http://localhost:3000
3. Login (seeded admin):
   email: admin@trialbridge.local
   password: adminpass

Run without Docker (dev)
- Backend:
  1. cd backend
  2. python -m venv venv
  3. source venv/bin/activate
  4. pip install -r requirements.txt
  5. export DATABASE_URL=sqlite:///./dev.db  (or a Postgres URL)
  6. uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
- Frontend:
  1. cd frontend
  2. npm install
  3. npm run dev
  4. Open http://localhost:3000

Notes
- Quantum kernel uses Qiskit Aer statevector simulator; keep n_qubits small (2–5) for interactive runs.
- The app seed creates an admin user automatically using env ADMIN_USER/ADMIN_PASS.

Security & Data
- This is a hackathon prototype. Do not use with real patient data without proper legal/ethical review.
